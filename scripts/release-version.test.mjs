import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planRelease } from './release-version.mjs';

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'release-version-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Release tests');
  git('config', 'user.email', 'release@example.test');
  const commit = message => { git('commit', '--allow-empty', '-m', message); return git('rev-parse', 'HEAD'); };
  commit('initial');
  return { git, commit, plan: () => planRelease(cwd, git('rev-parse', 'HEAD')), cwd };
}

for (const [message, expected, bump] of [
  ['fix: repair', 'v1.2.4', 'patch'],
  ['feat(ui): add table', 'v1.3.0', 'minor'],
  ['feature: add table', 'v1.3.0', 'minor'],
  ['refactor!: replace API', 'v2.0.0', 'major'],
  ['feat(api)!: replace API', 'v2.0.0', 'major'],
  ['fix: compatibility\n\nBREAKING CHANGE: old API removed', 'v2.0.0', 'major'],
  ['fix: compatibility\n\nBREAKING-CHANGE: old API removed', 'v2.0.0', 'major'],
]) {
  test(`version bump: ${message.split('\n')[0]}`, t => {
    const f = fixture(t);
    f.git('tag', '-a', 'v1.2.3', '-m', 'release');
    f.commit(message);
    assert.deepEqual(f.plan(), { tag: expected, previous: 'v1.2.3', bump, resume: false, commit: f.git('rev-parse', 'HEAD') });
  });
}

test('no tags includes all history and starts at zero', t => {
  const f = fixture(t);
  assert.equal(f.plan().tag, 'v0.0.1');
  f.commit('feat: first feature');
  assert.equal(f.plan().tag, 'v0.1.0');
  f.commit('fix!: first breaking change');
  assert.equal(f.plan().tag, 'v1.0.0');
});

test('ignores malformed and prerelease tags, including on HEAD', t => {
  const f = fixture(t);
  for (const tag of ['v9', 'v9.9', 'v9.9.9-beta.1', 'v9.9.9+build', 'v01.2.3', '9.9.9']) f.git('tag', tag);
  assert.equal(f.plan().tag, 'v0.0.1');
  assert.equal(f.plan().resume, false);
});

test('chooses greatest stable semver ancestor, not lexicographic order', t => {
  const f = fixture(t);
  f.git('tag', 'v1.9.9');
  f.commit('fix: next');
  f.git('tag', 'v1.10.0');
  f.commit('fix: next');
  assert.equal(f.plan().tag, 'v1.10.1');
});

test('unrelated tags do not choose the base version', t => {
  const f = fixture(t);
  f.git('tag', 'v1.0.0');
  f.git('checkout', '-b', 'other');
  f.commit('feat!: unrelated');
  f.git('tag', 'v99.0.0');
  f.git('checkout', 'main');
  f.commit('fix: current');
  assert.equal(f.plan().tag, 'v1.0.1');
});

test('fails on a proposed tag already used on another branch', t => {
  const f = fixture(t);
  f.git('tag', 'v1.0.0');
  f.git('checkout', '-b', 'other');
  f.commit('fix: unrelated');
  f.git('tag', 'v1.0.1');
  f.git('checkout', 'main');
  f.commit('fix: current');
  assert.throws(f.plan, /Tag conflict: v1.0.1/);
});

test('reruns resume the exact stable tag rather than skip publication', t => {
  const f = fixture(t);
  f.git('tag', 'v1.2.2');
  f.commit('fix: current');
  f.git('tag', '-a', 'v1.2.3', '-m', 'release');
  const result = f.plan();
  assert.equal(result.tag, 'v1.2.3');
  assert.equal(result.previous, 'v1.2.2');
  assert.equal(result.resume, true);
  assert.equal(result.bump, 'resume');
});

test('detects an out-of-order run when a descendant already has a version', t => {
  const f = fixture(t);
  const old = f.git('rev-parse', 'HEAD');
  f.commit('feat: later');
  f.git('tag', 'v0.1.0');
  f.git('checkout', '--detach', old);
  assert.throws(f.plan, /Out-of-order release/);
});

test('rejects multiple stable tags on a single commit', t => {
  const f = fixture(t);
  f.git('tag', 'v1.0.0');
  f.git('tag', 'v2.0.0');
  assert.throws(f.plan, /Multiple stable version tags/);
});

test('rejects a checkout different from the tested SHA and invalid input', t => {
  const f = fixture(t);
  const old = f.git('rev-parse', 'HEAD');
  f.commit('fix: later');
  assert.throws(() => planRelease(f.cwd, old), /Checkout does not match/);
  assert.throws(() => planRelease(f.cwd, 'main'), /full commit SHA/);
});

test('does not mask invalid git references or git failures', t => {
  const f = fixture(t);
  assert.throws(() => planRelease(f.cwd, 'f'.repeat(40)));
  f.git('tag', 'v1.0.0', f.git('hash-object', '-w', '--stdin'));
  assert.throws(f.plan); // A stable tag pointing to a blob must fail, not disappear.
});
