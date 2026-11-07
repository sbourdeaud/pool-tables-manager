import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldUpdateLatest } from './image-policy.mjs'

test('latest requires a stable version and explicit intent', () => {
  assert.equal(shouldUpdateLatest('v1.2.3', false), false)
  for (const tag of ['v2.0.0-rc.1', 'v2.0.0+build', 'custom', 'v01.2.3']) {
    assert.equal(shouldUpdateLatest(tag, true), false)
  }
  assert.equal(shouldUpdateLatest('v1.2.3', true), true)
})

test('latest never regresses but the same version can be retried', () => {
  assert.equal(shouldUpdateLatest('v1.2.3', true, 'v1.2.4'), false)
  assert.equal(shouldUpdateLatest('v1.2.3', true, 'v2.0.0'), false)
  assert.equal(shouldUpdateLatest('v1.2.3', true, 'v1.2.3'), true)
  assert.equal(shouldUpdateLatest('v1.10.0', true, 'v1.9.9'), true)
  assert.equal(shouldUpdateLatest('v2.0.0', true, 'v1.99.99'), true)
  assert.throws(() => shouldUpdateLatest('v1.2.3', true, 'unrecognized'), /Cannot compare/)
})
