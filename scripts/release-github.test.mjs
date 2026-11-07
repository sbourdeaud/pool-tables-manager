import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { updateRelease } from './release-github.mjs';

const options = { tag: 'v1.2.3', previous: 'v1.2.2', repository: 'owner/repo',
  image: 'ghcr.io/owner/repo', digest: `sha256:${'a'.repeat(64)}` };
function mock(releases) {
  const calls = [];
  let notes;
  return {
    calls,
    get notes() { return notes; },
    run(args) {
      calls.push(args);
      if (args[0] === 'api') return JSON.stringify([releases]);
      if (args.includes('--notes-file')) notes = readFileSync(args[args.indexOf('--notes-file') + 1], 'utf8');
      return '';
    },
  };
}

test('prepare creates only a draft with generated notes and a verified tag', () => {
  const gh = mock([]);
  updateRelease({ ...options, phase: 'prepare' }, gh.run);
  assert.deepEqual(gh.calls[1], ['release', 'create', 'v1.2.3', '--repo', 'owner/repo', '--verify-tag',
    '--draft', '--title', 'v1.2.3', '--generate-notes', '--notes-start-tag', 'v1.2.2']);
});

test('first release omits nonexistent previous tag', () => {
  const gh = mock([]);
  updateRelease({ ...options, previous: '', phase: 'prepare' }, gh.run);
  assert.equal(gh.calls[1].includes('--notes-start-tag'), false);
});

for (const draft of [true, false]) {
  test(`prepare rerun preserves existing ${draft ? 'draft' : 'published'} release`, () => {
    const gh = mock([{ tag_name: options.tag, draft, body: 'generated notes' }]);
    updateRelease({ ...options, phase: 'prepare' }, gh.run);
    assert.equal(gh.calls.length, 1);
  });
}

test('finalize publishes with image and immutable digest notes', () => {
  const gh = mock([{ tag_name: options.tag, draft: true, body: 'generated notes' }]);
  updateRelease({ ...options, phase: 'finalize' }, gh.run);
  assert.ok(gh.calls[1].includes('--draft=false'));
  assert.ok(gh.calls[1].includes('--latest=true'));
  assert.match(gh.notes, /^generated notes/);
  assert.ok(gh.notes.includes(`docker pull ${options.image}:${options.tag}`));
  assert.ok(gh.notes.includes(`${options.image}@${options.digest}`));
});

test('finalize rerun never modifies an already published release', () => {
  const gh = mock([{ tag_name: options.tag, draft: false }]);
  updateRelease({ ...options, phase: 'finalize' }, gh.run);
  assert.equal(gh.calls.length, 1);
});

test('finalize cannot move latest backwards on an older rerun', () => {
  const gh = mock([{ tag_name: options.tag, draft: true },
    { tag_name: 'v1.10.0', draft: false, prerelease: false }]);
  updateRelease({ ...options, phase: 'finalize' }, gh.run);
  assert.ok(gh.calls[1].includes('--latest=false'));
});

test('draft and prerelease versions do not prevent latest stable publication', () => {
  const gh = mock([{ tag_name: options.tag, draft: true },
    { tag_name: 'v9.0.0', draft: true }, { tag_name: 'v10.0.0-beta.1', draft: false, prerelease: true }]);
  updateRelease({ ...options, phase: 'finalize' }, gh.run);
  assert.ok(gh.calls[1].includes('--latest=true'));
});

test('finalize fails closed on missing draft or invalid publisher outputs', () => {
  const missing = mock([]);
  assert.throws(() => updateRelease({ ...options, phase: 'finalize' }, missing.run), /Draft release is missing/);
  const gh = mock([{ tag_name: options.tag, draft: true }]);
  assert.throws(() => updateRelease({ ...options, phase: 'finalize', digest: '' }, gh.run), /invalid image or digest/);
  assert.equal(gh.calls.length, 1);
});

test('API failures propagate rather than creating a release', () => {
  let calls = 0;
  assert.throws(() => updateRelease({ ...options, phase: 'prepare' }, () => {
    calls++;
    throw new Error('API unavailable');
  }), /API unavailable/);
  assert.equal(calls, 1);
});
