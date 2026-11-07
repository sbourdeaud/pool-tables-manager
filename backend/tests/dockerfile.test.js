const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dockerfile = fs.readFileSync(path.join(__dirname, '../Dockerfile'), 'utf8');
const installCommand = dockerfile.match(/^RUN (npm ci[\s\S]*?)(?=\n\n)/m)[1];
const shellTest = process.platform === 'win32' ? test.skip : test;

describe('Docker dependency installation', () => {
  let binDir;

  beforeAll(() => {
    binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dockerfile-test-'));
    fs.writeFileSync(path.join(binDir, 'npm'), '#!/bin/sh\nprintf "npm %s\\n" "$*"\nif [ "$1" = ci ] && [ "$FAIL_INSTALL" = 1 ]; then exit 42; fi\n', { mode: 0o755 });
    fs.writeFileSync(path.join(binDir, 'find'), '#!/bin/sh\nprintf "find %s\\n" "$*"\n', { mode: 0o755 });
  });

  afterAll(() => fs.rmSync(binDir, { recursive: true, force: true }));

  function runInstall(failInstall) {
    return spawnSync('sh', ['-c', installCommand], {
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH}`, FAIL_INSTALL: failInstall ? '1' : '0' },
      encoding: 'utf8',
    });
  }

  shellTest('propagates an npm ci failure without running cleanup', () => {
    const result = runInstall(true);
    expect(result.status).toBe(42);
    expect(result.stdout).not.toContain('npm cache');
    expect(result.stdout).not.toContain('find ');
  });

  shellTest('cleans the cache and source maps after a successful install', () => {
    const result = runInstall(false);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('npm cache clean --force');
    expect(result.stdout).toContain('find node_modules');
  });

  test('generates the client using the installed Prisma binary', () => {
    expect(dockerfile).toMatch(/^RUN DATABASE_URL=.* \.\/node_modules\/\.bin\/prisma generate$/m);
  });
});
