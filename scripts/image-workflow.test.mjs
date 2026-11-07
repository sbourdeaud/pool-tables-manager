import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'image-workflow-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  return directory
}

// Exercise the actual pre-checkout validation block without requiring a YAML
// dependency or executing any checkout, registry operation, or GitHub expression.
const workflow = readFileSync(new URL('../.github/workflows/publish-image.yml', import.meta.url), 'utf8')
const validation = workflow.match(/      - name: Validate image tag[\s\S]*?        run: \|\n([\s\S]*?)(?=\n      - )/)[1]
  .split('\n').map(line => line.slice(10)).join('\n')

for (const tag of ['latest', 'bad/tag', '-invalid', 'v1.0\nlatest', 'x'.repeat(129)]) {
  test(`reject unsafe or reserved image tag: ${JSON.stringify(tag)}`, t => {
    const directory = fixture(t)
    const result = spawnSync('bash', ['-c', validation], {
      encoding: 'utf8',
      env: { ...process.env, TAG: tag, GITHUB_OUTPUT: join(directory, 'outputs'), GITHUB_REPOSITORY: 'Owner/Repo' },
    })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /valid Docker tag other than reserved latest/)
  })
}

test('image tag validation emits the requested tag and lowercase registry name', t => {
  const directory = fixture(t)
  const outputs = join(directory, 'outputs')
  const result = spawnSync('bash', ['-c', validation], {
    encoding: 'utf8',
    env: { ...process.env, TAG: 'v1.2.3', GITHUB_OUTPUT: outputs, GITHUB_REPOSITORY: 'Owner/Repo' },
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(readFileSync(outputs, 'utf8'), 'tag=v1.2.3\nimage=ghcr.io/owner/repo\n')
})

for (const failMigration of [false, true]) {
  test(`smoke retries connection resets and cleans owned volumes on ${failMigration ? 'failure' : 'success'}`, t => {
    const directory = fixture(t)
    const log = join(directory, 'docker.log')
    const counter = join(directory, 'probes')
    const executable = (name, body) => writeFileSync(join(directory, name), `#!${process.execPath}\n${body}`, { mode: 0o755 })
    executable('docker', `
      const fs = require('node:fs');
      const args = process.argv.slice(2);
      fs.appendFileSync(process.env.MOCK_DOCKER_LOG, JSON.stringify(args) + '\\n');
      if (args[0] === 'inspect') console.log('12345');
      if (args[0] === 'exec' && args.includes('status') && process.env.MOCK_FAIL_MIGRATION === 'true') process.exit(1);
    `)
    executable('curl', `
      const fs = require('node:fs');
      const url = process.argv.at(-1);
      if (url.endsWith('/health')) {
        const count = fs.existsSync(process.env.MOCK_PROBES) ? Number(fs.readFileSync(process.env.MOCK_PROBES, 'utf8')) : 0;
        fs.writeFileSync(process.env.MOCK_PROBES, String(count + 1));
        if (count === 0) process.exit(56); // A reset, not a connection refusal.
        console.log('{"status":"ok"}');
      } else console.log('<!doctype html>');
    `)
    executable('jq', `
      const fs = require('node:fs');
      process.exit(JSON.parse(fs.readFileSync(0, 'utf8')).status === 'ok' ? 0 : 1);
    `)
    executable('sleep', '')
    const result = spawnSync('bash', [fileURLToPath(new URL('./smoke-image.sh', import.meta.url)), 'local:test', 'a'.repeat(40)], {
      encoding: 'utf8', timeout: 10000,
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, MOCK_DOCKER_LOG: log,
        MOCK_PROBES: counter, MOCK_FAIL_MIGRATION: String(failMigration) },
    })
    assert.equal(result.status, failMigration ? 1 : 0, result.stderr)
    assert.equal(readFileSync(counter, 'utf8'), '2')
    const calls = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line))
    assert.ok(calls.some(args => args[0] === 'rm' && args.includes('--volumes')))
    assert.ok(calls.some(args => args[0] === 'network' && args[1] === 'rm'))
    assert.equal(calls.some(args => args[0] === 'logs'), failMigration)
    assert.ok(calls.some(args => args[0] === 'exec' && args.includes('status')))
    assert.equal(calls.some(args => args[0] === 'exec' && args.includes(`EXPECTED_COMMIT=${'a'.repeat(40)}`)), !failMigration)
  })
}
