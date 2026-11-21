#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compareVersions } from './release-version.mjs';

const stable = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function updateRelease({ phase, tag, previous, repository, image, digest }, run = args =>
  execFileSync('gh', args, { encoding: 'utf8' })) {
  if (!['prepare', 'finalize'].includes(phase) || !stable.test(tag)) throw new Error('Invalid release operation');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Invalid repository');
  // Listing (including drafts) distinguishes a missing release from an API/auth failure.
  // Do not swallow `gh release view` errors and mistake them for a missing release.
  const releases = JSON.parse(run(['api', '--paginate', '--slurp', `repos/${repository}/releases`])).flat();
  const existing = releases.find(release => release.tag_name === tag);
  if (phase === 'prepare') {
    if (existing) return;
    const args = ['release', 'create', tag, '--repo', repository, '--verify-tag', '--draft', '--title', tag, '--generate-notes'];
    if (previous) args.push('--notes-start-tag', previous);
    run(args);
    return;
  }
  if (!existing) throw new Error('Draft release is missing; rerun prepare first');
  if (!existing.draft) return; // Already finalized: reruns must not rewrite published notes.
  if (!/^ghcr\.io\/[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(image) || !/^sha256:[a-f0-9]{64}$/.test(digest)) {
    throw new Error('Publisher returned an invalid image or digest');
  }
  const newer = releases.some(release => !release.draft && !release.prerelease &&
    stable.test(release.tag_name) && compareVersions(release.tag_name, tag) > 0);
  const notes = `${existing.body || ''}\n\n---\n\n**Container image** (linux/amd64, linux/arm64):\n\n` +
    `\`\`\`bash\ndocker pull ${image}:${tag}\ndocker pull ${image}:latest\n\`\`\`\n\n` +
    `Published digest: \`${image}@${digest}\`\n\n` +
    'Upgrade with `git pull && docker compose up -d --build`; database migrations apply automatically.\n';
  const directory = mkdtempSync(join(tmpdir(), 'release-notes-'));
  try {
    const file = join(directory, 'notes.md');
    writeFileSync(file, notes);
    run(['release', 'edit', tag, '--repo', repository, '--notes-file', file,
      '--draft=false', `--latest=${!newer}`]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    updateRelease({ phase: process.argv[2], tag: process.env.TAG, previous: process.env.PREVIOUS,
      repository: process.env.GITHUB_REPOSITORY, image: process.env.IMAGE, digest: process.env.DIGEST });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
