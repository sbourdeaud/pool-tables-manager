#!/usr/bin/env bash
# Run only against an ephemeral database/network, never the local Compose project.
set -euo pipefail
image=${1:?Usage: smoke-image.sh IMAGE EXPECTED_COMMIT}
commit=${2:?Expected build commit is required}
suffix="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-${RANDOM}"
network="image-smoke-$suffix"
db="image-smoke-db-$suffix"
app="image-smoke-app-$suffix"
cleanup() {
  result=$?
  if (( result != 0 )); then
    docker logs "$db" 2>&1 || true
    docker logs "$app" 2>&1 || true
  fi
  docker rm --force --volumes "$app" "$db" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  exit "$result"
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run -d --name "$db" --network "$network" \
  -e POSTGRES_USER=smoke -e POSTGRES_PASSWORD=smoke -e POSTGRES_DB=smoke \
  postgres:18 >/dev/null
ready=false
for ((attempt=0; attempt<60; attempt++)); do
  if docker exec "$db" pg_isready -U smoke -d smoke >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 2
done
[[ "$ready" == true ]]

docker run -d --name "$app" --network "$network" -p 127.0.0.1::3000 \
  -e "DATABASE_URL=postgres://smoke:smoke@$db:5432/smoke" \
  -e "SESSION_SECRET=$(openssl rand -hex 32)" \
  -e TRUST_PROXY=false "$image" >/dev/null
port=$(docker inspect "$app" --format '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}')
base="http://127.0.0.1:$port"
# A published port can reset connections before Node starts listening. Retry all
# unsuccessful probes (including resets and invalid/partial responses), not just
# connection refusals. Per-request and overall deadlines keep failures bounded.
ready=false
deadline=$((SECONDS + 180))
while (( SECONDS < deadline )); do
  if response=$(curl --fail --silent --max-time 5 "$base/health") &&
     jq -e '.status == "ok"' <<< "$response" >/dev/null; then
    ready=true
    break
  fi
  sleep 2
done
[[ "$ready" == true ]]
for route in / /table1 /status; do
  curl --fail --silent --show-error "$base$route" | grep -qi '<!doctype html>'
done
# Startup must have applied every migration, not merely opened the HTTP port.
docker exec "$app" ./node_modules/.bin/prisma migrate status
# The three entries and their referenced scripts must be present; the JS must carry
# the resolved source revision rather than metadata from the workflow's default branch.
docker exec -e "EXPECTED_COMMIT=$commit" "$app" node -e '
  const fs = require("node:fs");
  const assert = require("node:assert/strict");
  for (const entry of ["index.html", "table.html", "status.html"]) {
    const html = fs.readFileSync(`public/${entry}`, "utf8");
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)];
    assert(scripts.length > 0, `${entry} has no scripts`);
    for (const [, src] of scripts) assert(fs.statSync(`public/${src.replace(/^\//, "")}`).size > 0);
  }
  const bundles = fs.readdirSync("public/assets").filter(name => name.endsWith(".js"));
  assert(bundles.some(name => fs.readFileSync(`public/assets/${name}`, "utf8").includes(process.env.EXPECTED_COMMIT)), "Missing frontend build revision");
'
