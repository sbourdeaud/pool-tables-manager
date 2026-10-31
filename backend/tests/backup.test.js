const { EventEmitter } = require('events');
const { Writable, PassThrough } = require('stream');
const { createBackupService, REQUIRED_TABLES } = require('../src/backup');

function fakeChild({ stdoutData = '', stderrData = '', code = 0, error = null } = {}) {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new EventEmitter();
  setImmediate(() => {
    if (error) return child.emit('error', error);
    if (stdoutData) child.stdout.write(Buffer.from(stdoutData));
    child.stdout.end();
    if (stderrData) child.stderr.emit('data', Buffer.from(stderrData));
    child.emit('close', code);
  });
  return child;
}

function fakeResponse() {
  const chunks = [];
  const res = new Writable({
    write(chunk, _enc, cb) { chunks.push(Buffer.from(chunk)); cb(); }
  });
  res.headers = {};
  res.statusCode = 200;
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; res.end(); return res; };
  res.bodyChunks = chunks;
  return res;
}

const LISTING = REQUIRED_TABLES.map((t, i) => `${100 + i}; 1259 16${i} TABLE public ${t} postgres`).join('\n');

describe('Database backup service', () => {
  test('streams a compressed dump with a download filename', async () => {
    let dumpArgs;
    const spawnFn = (cmd, args) => {
      if (cmd === 'pg_dump') { dumpArgs = args; return fakeChild({ stdoutData: 'DUMP-BYTES' }); }
      return fakeChild({});
    };
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });
    const res = fakeResponse();
    await service.exportTo(res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="pool-tables-backup-.*\.dump"/);
    expect(Buffer.concat(res.bodyChunks).toString()).toBe('DUMP-BYTES');
    expect(dumpArgs).toEqual(expect.arrayContaining(['--format=custom', '--compress=9', '--no-owner', '--no-privileges']));
    expect(service.isBusy()).toBe(false);
  });

  test('fails export cleanly when pg_dump exits non-zero', async () => {
    const spawnFn = () => fakeChild({ stderrData: 'boom', code: 1 });
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });
    const res = fakeResponse();
    await service.exportTo(res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('backup_failed');
    expect(service.isBusy()).toBe(false);
  });

  test('restores a valid app archive, runs migrations and disconnects Prisma', async () => {
    const calls = [];
    const spawnFn = (cmd, args) => {
      calls.push([cmd, ...args]);
      if (cmd === 'pg_restore' && args[0] === '--list') return fakeChild({ stdoutData: LISTING });
      if (cmd === 'pg_restore') return fakeChild({ stdoutData: 'restored' });
      if (cmd === 'npx') return fakeChild({ stdoutData: 'No pending migrations to apply.' });
      return fakeChild({});
    };
    const prisma = { $disconnect: jest.fn(async () => {}) };
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x', prisma });

    const result = await service.importFrom(Buffer.from('DUMP-BYTES'));
    expect(result.ok).toBe(true);
    expect(result.sizeBytes).toBe(10);
    expect(result.migrations.output).toContain('No pending migrations');
    expect(prisma.$disconnect).toHaveBeenCalled();
    expect(calls.some(c => c[0] === 'pg_restore' && c.includes('--single-transaction'))).toBe(true);
    expect(service.isBusy()).toBe(false);
  });

  test('rejects unreadable archives', async () => {
    const spawnFn = (cmd, args) => {
      if (cmd === 'pg_restore' && args[0] === '--list') return fakeChild({ stderrData: 'bad', code: 1 });
      return fakeChild({});
    };
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });
    const result = await service.importFrom(Buffer.from('nope'));
    expect(result.invalid).toBe('invalid_archive');
  });

  test('rejects archives that are not app backups', async () => {
    const spawnFn = (cmd, args) => {
      if (cmd === 'pg_restore' && args[0] === '--list') return fakeChild({ stdoutData: 'TABLE public "SomethingElse"' });
      return fakeChild({});
    };
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });
    const result = await service.importFrom(Buffer.from('nope'));
    expect(result.invalid).toBe('not_app_backup');
    expect(result.missing).toEqual(expect.arrayContaining(['Session', 'Payment']));
  });

  test('reports restore failures', async () => {
    const spawnFn = (cmd, args) => {
      if (cmd === 'pg_restore' && args[0] === '--list') return fakeChild({ stdoutData: LISTING });
      if (cmd === 'pg_restore') return fakeChild({ stderrData: 'restore exploded', code: 1 });
      return fakeChild({});
    };
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });
    const result = await service.importFrom(Buffer.from('DUMP'));
    expect(result.failed).toBe('restore_failed');
    expect(result.message).toContain('restore exploded');
  });

  test('rejects empty uploads', async () => {
    const service = createBackupService({ spawnFn: () => fakeChild({}), databaseUrl: 'postgres://x' });
    expect((await service.importFrom(Buffer.alloc(0))).invalid).toBe('empty_upload');
  });
});
