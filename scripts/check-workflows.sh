#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

# Pin the archive digest from the upstream release's checksums file, rather than
# trusting a freshly downloaded checksum alongside an unverified executable.
version=1.7.12
archive="actionlint_${version}_linux_amd64.tar.gz"
expected_sha256=8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8
temp_dir="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/actionlint.XXXXXX")"
trap 'rm -rf "$temp_dir"' EXIT

curl --fail --silent --show-error --location --retry 3 \
  "https://github.com/rhysd/actionlint/releases/download/v${version}/${archive}" \
  --output "$temp_dir/$archive"
printf '%s  %s\n' "$expected_sha256" "$temp_dir/$archive" | sha256sum --check --strict
tar -xzf "$temp_dir/$archive" -C "$temp_dir" actionlint

shopt -s nullglob
workflows=(.github/workflows/*.yml .github/workflows/*.yaml)
status=0
"$temp_dir/actionlint" -format '{{json .}}' "${workflows[@]}" > "$temp_dir/results.json" || status=$?
if (( status > 1 )); then
  cat "$temp_dir/results.json"
  exit "$status"
fi

# GitHub supports concurrency.queue (single|max), but actionlint 1.7.12 does not.
# Accept ONLY that known diagnostic after checking the scalar and its sibling
# cancellation setting; keep every other actionlint error blocking.
# https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency
node --input-type=module - "$temp_dir/results.json" <<'NODE'
import { readFileSync } from 'node:fs';
const errors = JSON.parse(readFileSync(process.argv[2], 'utf8')) ?? [];
const queueDiagnostic = 'unexpected key "queue" for "concurrency" section. expected one of "cancel-in-progress", "group"';
const remaining = errors.filter(error => {
  if (error.kind !== 'syntax-check' || error.message !== queueDiagnostic) return true;
  const lines = readFileSync(error.filepath, 'utf8').split(/\r?\n/);
  const index = error.line - 1;
  const match = lines[index].match(/^( +)queue: *(single|max) *(?:#.*)?$/);
  if (!match) return true;
  const indent = match[1].length;
  let start = index - 1;
  while (start >= 0 && (!lines[start].trim() || /^ *#/.test(lines[start]) || lines[start].search(/\S/) >= indent)) start--;
  if (start < 0 || !/^ *concurrency: *$/.test(lines[start])) return true;
  let end = index + 1;
  while (end < lines.length && (!lines[end].trim() || /^ *#/.test(lines[end]) || lines[end].search(/\S/) >= indent)) end++;
  const siblings = lines.slice(start + 1, end).filter(line => line.search(/\S/) === indent);
  if (siblings.filter(line => /^ *queue:/.test(line)).length !== 1) return true;
  // queue:max and cancel-in-progress:true are mutually exclusive. Be conservative
  // about expressions until actionlint gains native support for this property.
  if (match[2] === 'max' && siblings.some(line => /^ *cancel-in-progress:/.test(line) && !/^ *cancel-in-progress: *false *(?:#.*)?$/.test(line))) return true;
  console.log(`${error.filepath}:${error.line}: validated concurrency.queue: ${match[2]} (actionlint compatibility)`);
  return false;
});
for (const error of remaining) {
  console.error(`${error.filepath}:${error.line}:${error.column}: ${error.message} [${error.kind}]\n${error.snippet}`);
}
if (remaining.length) process.exitCode = 1;
NODE
