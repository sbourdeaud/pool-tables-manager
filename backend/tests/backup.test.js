const { EventEmitter } = require('events');
const { Writable, PassThrough } = require('stream');
const { spawn, execFileSync } = require('child_process');
const { randomUUID } = require('crypto');
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

  test('clears images absent from an old archive only after a successful restore', async () => {
    const spawnFn = jest.fn((cmd, args) => {
      if (args[0] === '--list') return fakeChild({ stdoutData: LISTING });
      return fakeChild({});
    });
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://restore-target' });

    expect((await service.importFrom(Buffer.from('DUMP'))).ok).toBe(true);
    expect(spawnFn.mock.calls.map(([cmd]) => cmd)).toEqual(['pg_restore', 'pg_restore', 'psql', 'npx']);
    expect(spawnFn.mock.calls[2][1]).toEqual(expect.arrayContaining([
      '--dbname', 'postgres://restore-target', '--no-psqlrc', 'ON_ERROR_STOP=1',
      expect.stringContaining('TRUNCATE TABLE public."TableBackgroundImage"')
    ]));
    expect(spawnFn.mock.calls[3][2].env.DATABASE_URL).toBe('postgres://restore-target');
  });

  test('preserves images included in a feature-era archive', async () => {
    const spawnFn = jest.fn((cmd, args) => {
      if (args[0] === '--list') return fakeChild({ stdoutData: `${LISTING}\n200; 1259 200 TABLE public TableBackgroundImage postgres` });
      return fakeChild({});
    });
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });

    expect((await service.importFrom(Buffer.from('DUMP'))).ok).toBe(true);
    expect(spawnFn.mock.calls.map(([cmd]) => cmd)).toEqual(['pg_restore', 'pg_restore', 'npx']);
  });

  test('preserves image data when the archive contains a data-only image entry', async () => {
    const spawnFn = jest.fn((cmd, args) => {
      if (args[0] === '--list') return fakeChild({ stdoutData: `${LISTING}\n200; 0 200 TABLE DATA public TableBackgroundImage postgres` });
      return fakeChild({});
    });
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });

    expect((await service.importFrom(Buffer.from('DUMP'))).ok).toBe(true);
    expect(spawnFn.mock.calls.some(([cmd]) => cmd === 'psql')).toBe(false);
  });

  test('reports cleanup failures without migrating and releases the Prisma pool', async () => {
    const spawnFn = jest.fn((cmd, args) => {
      if (args[0] === '--list') return fakeChild({ stdoutData: LISTING });
      if (cmd === 'psql') return fakeChild({ code: 1, stderrData: 'cleanup denied' });
      return fakeChild({});
    });
    const prisma = { $disconnect: jest.fn(async () => {}) };
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x', prisma });

    const result = await service.importFrom(Buffer.from('DUMP'));
    expect(result).toEqual(expect.objectContaining({ failed: 'restore_failed', message: 'cleanup denied', disconnected: true }));
    expect(result.ok).toBeUndefined();
    expect(spawnFn.mock.calls.some(([cmd]) => cmd === 'npx')).toBe(false);
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(service.isBusy()).toBe(false);
  });

  test('reports migration failures instead of success and releases the Prisma pool', async () => {
    const spawnFn = jest.fn((cmd, args) => {
      if (args[0] === '--list') return fakeChild({ stdoutData: LISTING });
      if (cmd === 'npx') return fakeChild({ code: 1, stderrData: 'table already exists' });
      return fakeChild({});
    });
    const prisma = { $disconnect: jest.fn(async () => {}) };
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x', prisma });

    const result = await service.importFrom(Buffer.from('DUMP'));
    expect(result).toEqual(expect.objectContaining({ failed: 'migration_failed', disconnected: true }));
    expect(result.migrations).toEqual({ code: 1, output: 'table already exists' });
    expect(result.ok).toBeUndefined();
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
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
    const spawnFn = jest.fn((cmd, args) => {
      if (cmd === 'pg_restore' && args[0] === '--list') return fakeChild({ stdoutData: LISTING });
      if (cmd === 'pg_restore') return fakeChild({ stderrData: 'restore exploded', code: 1 });
      return fakeChild({});
    });
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });
    const result = await service.importFrom(Buffer.from('DUMP'));
    expect(result.failed).toBe('restore_failed');
    expect(result.message).toContain('restore exploded');
    expect(spawnFn.mock.calls.map(([cmd]) => cmd)).toEqual(['pg_restore', 'pg_restore']);
    expect(service.isBusy()).toBe(false);
  });

  test('rejects empty uploads', async () => {
    const service = createBackupService({ spawnFn: () => fakeChild({}), databaseUrl: 'postgres://x' });
    expect((await service.importFrom(Buffer.alloc(0))).invalid).toBe('empty_upload');
  });

  test.each(['DUMP', ['..', 'secret'], { length: 4 }, null])('rejects non-Buffer archive input: %p', async (input) => {
    const spawnFn = jest.fn(() => fakeChild({}));
    const service = createBackupService({ spawnFn, databaseUrl: 'postgres://x' });

    const result = await service.importFrom(input);

    expect(result.invalid).toBe('empty_upload');
    expect(spawnFn).not.toHaveBeenCalled();
    expect(service.isBusy()).toBe(false);
  });
});

const describePostgres = process.env.BACKUP_TEST_POSTGRES_URL ? describe : describe.skip;

describePostgres('Database backup service with isolated PostgreSQL', () => {
  const migration = '00000000000020_add_table_type_background';
  const imageId = '00000000-0000-4000-8000-000000000001';
  const tableId = '00000000-0000-4000-8000-000000000002';
  let databaseUrl;
  let databaseName;

  function sql(statement, url = databaseUrl) {
    return execFileSync('psql', ['--dbname', url, '--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--tuples-only', '--no-align', '--command', statement], { encoding: 'utf8' }).trim();
  }

  function deploy() {
    return execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8'
    });
  }

  function dump() {
    return execFileSync('pg_dump', ['--dbname', databaseUrl, '--format=custom', '--no-owner', '--no-privileges'], { maxBuffer: 16 * 1024 * 1024 });
  }

  function preFeature({ keepImages = false } = {}) {
    sql(`ALTER TABLE "TableType" DROP COLUMN "background", DROP COLUMN "background_opacity";
      DELETE FROM "_prisma_migrations" WHERE migration_name = '${migration}';
      ${keepImages ? '' : 'DROP TABLE "TableBackgroundImage";'}`);
  }

  function addImage(bytes = '010203') {
    sql(`INSERT INTO "TableBackgroundImage" (id, content_type, bytes) VALUES ('${imageId}', 'image/png', decode('${bytes}', 'hex'))`);
  }

  function service() {
    return createBackupService({ spawnFn: spawn, databaseUrl });
  }

  beforeEach(() => {
    databaseName = `backup_restore_test_${randomUUID().replace(/-/g, '')}`;
    sql(`CREATE DATABASE "${databaseName}"`, process.env.BACKUP_TEST_POSTGRES_URL);
    const url = new URL(process.env.BACKUP_TEST_POSTGRES_URL);
    url.pathname = `/${databaseName}`;
    databaseUrl = url.toString();
    deploy();
    sql(`INSERT INTO "TableType" (id, name_en, base_hourly_cents) VALUES ('${tableId}', 'Backed up table', 1234);
      INSERT INTO "Drink" (name_en, price_cents) VALUES ('Backed up drink', 456)`);
  }, 120000);

  afterEach(() => {
    if (databaseName) sql(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`, process.env.BACKUP_TEST_POSTGRES_URL);
  });

  test('restores pre-feature data, clears stale images, applies migration 20 and supports retries', async () => {
    preFeature();
    const archive = dump();
    deploy();
    addImage();
    sql(`UPDATE "TableType" SET name_en = 'Changed', background = '/api/public/table-backgrounds/${imageId}'; DELETE FROM "Drink"`);

    execFileSync('pg_restore', ['--dbname', databaseUrl, '--clean', '--if-exists', '--no-owner', '--no-privileges', '--single-transaction', '--exit-on-error'], { input: archive });
    expect(sql('SELECT count(*) FROM "TableBackgroundImage"')).toBe('1');
    expect(sql(`SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'TableType' AND column_name = 'background'`)).toBe('0');

    const backupService = service();
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await backupService.importFrom(archive);
      expect(result).toEqual(expect.objectContaining({ ok: true, migrations: expect.objectContaining({ code: 0 }) }));
      expect(sql('SELECT count(*) FROM "TableBackgroundImage"')).toBe('0');
      expect(sql(`SELECT name_en || ':' || base_hourly_cents || ':' || background_opacity FROM "TableType" WHERE id = '${tableId}'`)).toBe('Backed up table:1234:70');
      expect(sql('SELECT count(*) FROM "TableType" WHERE background IS NOT NULL')).toBe('0');
      expect(sql('SELECT name_en || \':\' || price_cents FROM "Drink"')).toBe('Backed up drink:456');
      expect(sql(`SELECT count(*) FROM "_prisma_migrations" WHERE migration_name = '${migration}' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`)).toBe('1');
      addImage();
    }
  }, 120000);

  test('restores an old archive when no image table exists yet', async () => {
    preFeature();
    const result = await service().importFrom(dump());
    expect(result.ok).toBe(true);
    expect(sql('SELECT count(*) FROM "TableBackgroundImage"')).toBe('0');
  }, 120000);

  test('preserves backed-up image bytes, references and opacity in a feature-era archive', async () => {
    addImage();
    sql(`UPDATE "TableType" SET background = '/api/public/table-backgrounds/${imageId}', background_opacity = 42`);
    const archive = dump();
    sql(`UPDATE "TableBackgroundImage" SET bytes = decode('ff', 'hex'); UPDATE "TableType" SET background = NULL, background_opacity = 99`);

    expect((await service().importFrom(archive)).ok).toBe(true);
    expect(sql('SELECT id || \':\' || content_type || \':\' || encode(bytes, \'hex\') FROM "TableBackgroundImage"')).toBe(`${imageId}:image/png:010203`);
    expect(sql('SELECT background || \':\' || background_opacity FROM "TableType"')).toBe(`/api/public/table-backgrounds/${imageId}:42`);
  }, 120000);

  test('does not erase existing image data when migration 20 encounters its table', () => {
    addImage();
    preFeature({ keepImages: true });
    deploy();
    expect(sql('SELECT encode(bytes, \'hex\') FROM "TableBackgroundImage"')).toBe('010203');
  }, 120000);

  test('leaves live data and images intact when the transactional restore fails', async () => {
    preFeature();
    const archive = dump();
    deploy();
    addImage();
    sql('UPDATE "TableType" SET name_en = \'Live data\'; CREATE VIEW restore_blocker AS SELECT * FROM "TableType"');

    const result = await service().importFrom(archive);
    expect(result.failed).toBe('restore_failed');
    expect(result.ok).toBeUndefined();
    expect(sql('SELECT name_en FROM "TableType"')).toBe('Live data');
    expect(sql('SELECT encode(bytes, \'hex\') FROM "TableBackgroundImage"')).toBe('010203');
  }, 120000);
});
