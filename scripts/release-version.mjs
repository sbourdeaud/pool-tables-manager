#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const stable = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const parts = tag => stable.exec(tag).slice(1).map(BigInt);
export function compareVersions(a, b) {
  const left = parts(a);
  const right = parts(b);
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  return 0;
}

export function planRelease(cwd, requestedCommit) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  const ancestor = (a, b) => {
    const result = spawnSync('git', ['merge-base', '--is-ancestor', a, b], { cwd, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status === 0) return true;
    if (result.status === 1) return false;
    throw new Error(`git merge-base failed: ${result.stderr}`);
  };
  if (!/^[a-f0-9]{40}$/.test(requestedCommit)) throw new Error('Expected a full commit SHA');
  const commit = git('rev-parse', '--verify', `${requestedCommit}^{commit}`);
  if (git('rev-parse', 'HEAD') !== commit) throw new Error('Checkout does not match expected commit');
  const tags = git('tag', '--list').split('\n').filter(tag => stable.test(tag))
    .map(tag => ({ tag, commit: git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`) }));
  const exact = tags.filter(tag => tag.commit === commit);
  if (exact.length > 1) throw new Error('Multiple stable version tags point to this commit; resolve ambiguity first');
  const ancestors = tags.filter(tag => tag.commit !== commit && ancestor(tag.commit, commit))
    .sort((a, b) => compareVersions(b.tag, a.tag));
  const previous = ancestors[0]?.tag || '';
  if (exact.length === 1) return { tag: exact[0].tag, commit, previous, bump: 'resume', resume: true };

  // Queue arrival order need not equal commit order. Never create a backwards release.
  const newer = tags.find(tag => ancestor(commit, tag.commit));
  if (newer) throw new Error(`Out-of-order release: ${newer.tag} already tags a descendant; inspect before retrying`);
  const range = previous ? `${previous}..${commit}` : commit;
  const subjects = git('log', range, '--format=%s');
  const bodies = git('log', range, '--format=%B');
  let bump = 'patch';
  if (/\bBREAKING[ -]CHANGE\b/.test(bodies) || /^[a-zA-Z]+(?:\([^)]+\))?!:/m.test(subjects)) bump = 'major';
  else if (/^(?:feat|feature)(?:\([^)]+\))?:/im.test(subjects)) bump = 'minor';
  let [major, minor, patch] = parts(previous || 'v0.0.0');
  if (bump === 'major') { major++; minor = 0n; patch = 0n; }
  else if (bump === 'minor') { minor++; patch = 0n; }
  else patch++;
  const tag = `v${major}.${minor}.${patch}`;
  if (tags.some(existing => existing.tag === tag)) throw new Error(`Tag conflict: ${tag} exists outside this commit's ancestry`);
  return { tag, commit, previous, bump, resume: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const plan = planRelease(process.cwd(), process.argv[2]);
    console.log(JSON.stringify(plan, null, 2));
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(plan).map(([key, value]) => `${key}=${value}\n`).join(''));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
