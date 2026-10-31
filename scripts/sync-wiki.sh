#!/usr/bin/env bash
# Push docs/wiki/*.md and the User Guide to the GitHub wiki.
#
# One-time prerequisite (GitHub limitation): the wiki repository only exists once
# the wiki has been enabled AND its first page has been created in the web UI
# (Repository → Wiki → "Create the first page").
#
# Usage: scripts/sync-wiki.sh
set -euo pipefail

REPO=${WIKI_REPO:-https://github.com/sbourdeaud/pool-tables-manager.wiki.git}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

git clone "$REPO" "$WORK/wiki"
cp "$ROOT"/docs/wiki/*.md "$WORK/wiki/"
cp "$ROOT"/USER_GUIDE.md "$WORK/wiki/User-Guide.md"

cd "$WORK/wiki"
git add .
if git diff --cached --quiet; then
  echo "Wiki already up to date."
  exit 0
fi
git -c user.name="${GIT_AUTHOR_NAME:-docs-bot}" \
    -c user.email="${GIT_AUTHOR_EMAIL:-docs-bot@users.noreply.github.com}" \
    commit -m "Sync documentation from repository"
git push
echo "Wiki updated."
