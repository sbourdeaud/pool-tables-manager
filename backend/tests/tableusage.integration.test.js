const request = require('./helpers/csrfRequest');
const { Client } = require('pg');

const describePostgres = process.env.SESSION_TEST_POSTGRES_URL ? describe : describe.skip;

describePostgres('Session table lifecycle PostgreSQL concurrency', () => {
  let app;
  let prisma;
  let observer;
  let tableType;
  let table;
  let session;
  let nextTableNumber = 1000000;
  const originalEnv = { ...process.env };
  const pendingRequests = [];
  const holders = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.SESSION_TEST_POSTGRES_URL;
    prisma = require('../src/prismaClient');
    app = require('../server');
    observer = new Client({ connectionString: process.env.SESSION_TEST_POSTGRES_URL });
    await observer.connect();
  });

  afterAll(async () => {
    if (observer) await observer.end();
    if (prisma) await prisma.$disconnect();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    tableType = await prisma.tableType.create({ data: { name_en: 'Table concurrency', base_hourly_cents: 1200, vatRatePercent: 20 } });
    table = await createTable('occupied');
    session = await createSession(table.id);
  });

  afterEach(async () => {
    for (const holder of holders.splice(0)) {
      await holder.query('ROLLBACK').catch(() => {});
      await holder.end();
    }
    await Promise.allSettled(pendingRequests.splice(0));
    const tables = await prisma.poolTable.findMany({ where: { tableTypeId: tableType.id } });
    const sessions = await prisma.session.findMany({ where: { tableId: { in: tables.map(row => row.id) } } });
    const where = { sessionId: { in: sessions.map(row => row.id) } };
    await prisma.receipt.deleteMany({ where });
    await prisma.tabLineItem.deleteMany({ where });
    await prisma.sessionPlayer.deleteMany({ where });
    await prisma.session.deleteMany({ where: { id: { in: sessions.map(row => row.id) } } });
    await prisma.poolTable.deleteMany({ where: { tableTypeId: tableType.id } });
    await prisma.tableType.delete({ where: { id: tableType.id } });
  });

  function createTable(status = 'available') {
    return prisma.poolTable.create({ data: { tableTypeId: tableType.id, number: nextTableNumber++, status } });
  }

  function createSession(tableId) {
    return prisma.session.create({ data: { tableId, status: 'active', startedAt: new Date(Date.now() - 60000), numberOfPlayers: 1 } });
  }

  function finish(kind, id = session.id) {
    if (kind === 'end') return request(app).patch(`/api/sessions/${id}/end`);
    return request(app).post(`/api/sessions/${id}/${kind}`).send({});
  }

  function startRequest(req) {
    const pending = req.then(result => result);
    pendingRequests.push(pending);
    return pending;
  }

  async function holdTableLock(tableId = table.id) {
    const holder = new Client({ connectionString: process.env.SESSION_TEST_POSTGRES_URL });
    await holder.connect();
    holders.push(holder);
    await holder.query('BEGIN');
    await holder.query('SELECT id FROM "PoolTable" WHERE id::text = $1 FOR UPDATE', [tableId]);
    return holder;
  }

  async function waitForTableLockWaiters(count = 1) {
    for (let attempt = 0; attempt < 160; attempt += 1) {
      const result = await observer.query(
        `SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'active' AND wait_event_type = 'Lock' AND query LIKE '%"PoolTable"%'`
      );
      if (result.rows.length >= count) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`expected ${count} table row lock waiters`);
  }

  async function expectTableStatus(tableId, status) {
    expect((await prisma.poolTable.findUnique({ where: { id: tableId } })).status).toBe(status);
  }

  test.each(['cancel', 'end', 'checkout'])('%s preserves maintenance committed while waiting and locks before ending', async (kind) => {
    const holder = await holdTableLock();
    const pending = startRequest(finish(kind));
    await waitForTableLockWaiters();
    expect((await prisma.session.findUnique({ where: { id: session.id } })).status).toBe('active');
    await holder.query('UPDATE "PoolTable" SET status = $1 WHERE id::text = $2', ['maintenance', table.id]);
    await holder.query('COMMIT');
    expect((await pending).status).toBe(200);
    await expectTableStatus(table.id, 'maintenance');
    const stored = await prisma.session.findUnique({ where: { id: session.id } });
    expect(stored.status).toBe(kind === 'cancel' ? 'cancelled' : 'ended');
    const usage = await prisma.poolTable.findUnique({ where: { id: table.id } });
    expect(usage.totalUsedSeconds).toBe(kind === 'cancel' ? 0 : Math.round((stored.endedAt - stored.startedAt) / 1000));
    expect(usage.usedSinceMaintenanceSeconds).toBe(usage.totalUsedSeconds);
  });

  test.each(['cancel', 'end', 'checkout'])('%s does not release a table with an active session committed during its lock wait', async (kind) => {
    const holder = await holdTableLock();
    const pending = startRequest(finish(kind));
    await waitForTableLockWaiters();
    const duplicateId = require('crypto').randomUUID();
    await holder.query('INSERT INTO "Session" (id, table_id, status, started_at, created_at) VALUES ($1::uuid, $2::uuid, $3, now(), now())', [duplicateId, table.id, 'active']);
    await holder.query('COMMIT');
    expect((await pending).status).toBe(200);
    await expectTableStatus(table.id, 'occupied');
    expect((await prisma.session.findUnique({ where: { id: duplicateId } })).status).toBe('active');
    expect((await request(app).post('/api/sessions').send({ tableId: table.id })).status).toBe(409);
  });

  test.each(['cancel', 'end', 'checkout'])('concurrent %s of legacy duplicate sessions releases only after the final session', async (kind) => {
    const duplicate = await createSession(table.id);
    const holder = await holdTableLock();
    const first = startRequest(finish(kind));
    const second = startRequest(finish(kind, duplicate.id));
    await waitForTableLockWaiters(2);
    await holder.query('COMMIT');
    expect((await Promise.all([first, second])).map(result => result.status)).toEqual([200, 200]);
    await expectTableStatus(table.id, 'available');
    expect(await prisma.session.count({ where: { tableId: table.id, status: 'active' } })).toBe(0);
  });

  test.each(['cancel', 'end', 'checkout'])('a repeated %s cannot release a newly started session', async (kind) => {
    expect((await finish(kind)).status).toBe(200);
    const next = await request(app).post('/api/sessions').send({ tableId: table.id, numberOfPlayers: 1 });
    expect(next.status).toBe(201);
    expect((await finish(kind)).status).toBe(409);
    await expectTableStatus(table.id, 'occupied');
    expect((await prisma.session.findUnique({ where: { id: next.body.id } })).status).toBe('active');
  });

  test('concurrent starts claim an available table only once', async () => {
    const target = await createTable();
    const holder = await holdTableLock(target.id);
    const first = startRequest(request(app).post('/api/sessions').send({ tableId: target.id }));
    const second = startRequest(request(app).post('/api/sessions').send({ tableId: target.id }));
    await waitForTableLockWaiters(2);
    await holder.query('COMMIT');
    expect((await Promise.all([first, second])).map(result => result.status).sort()).toEqual([201, 409]);
    expect(await prisma.session.count({ where: { tableId: target.id, status: 'active' } })).toBe(1);
    await expectTableStatus(target.id, 'occupied');
  });

  test.each(['start', 'switch'])('switch racing with %s locks the target before checking availability', async (competitor) => {
    const target = await createTable();
    const otherTable = await createTable('occupied');
    const otherSession = await createSession(otherTable.id);
    const holder = await holdTableLock(target.id);
    const first = startRequest(request(app).post(`/api/sessions/${session.id}/switch`).send({ newTableId: target.id }));
    const second = startRequest(competitor === 'start'
      ? request(app).post('/api/sessions').send({ tableId: target.id })
      : request(app).post(`/api/sessions/${otherSession.id}/switch`).send({ newTableId: target.id }));
    await waitForTableLockWaiters(2);
    expect((await prisma.session.findUnique({ where: { id: session.id } })).tableId).toBe(table.id);
    await holder.query('COMMIT');
    const results = await Promise.all([first, second]);
    expect(results.map(result => result.status).filter(status => status === 409)).toHaveLength(1);
    expect(results[0].status === 200 || results[1].status === (competitor === 'start' ? 201 : 200)).toBe(true);
    expect(await prisma.session.count({ where: { tableId: target.id, status: 'active' } })).toBe(1);
    await expectTableStatus(target.id, 'occupied');
  });

  test('opposing switches use the same table lock order without a deadlock', async () => {
    const target = await createTable('occupied');
    const other = await createSession(target.id);
    const results = await Promise.all([
      request(app).post(`/api/sessions/${session.id}/switch`).send({ newTableId: target.id }),
      request(app).post(`/api/sessions/${other.id}/switch`).send({ newTableId: table.id }),
    ]);
    expect(results.map(result => result.status)).toEqual([409, 409]);
    await expectTableStatus(table.id, 'occupied');
    await expectTableStatus(target.id, 'occupied');
  });

  test.each(['start', 'switch'])('%s rejects maintenance and stale available tables with legacy active sessions', async (kind) => {
    const target = await createTable('maintenance');
    const claim = () => kind === 'start'
      ? request(app).post('/api/sessions').send({ tableId: target.id })
      : request(app).post(`/api/sessions/${session.id}/switch`).send({ newTableId: target.id });
    expect((await claim()).status).toBe(409);
    await prisma.poolTable.update({ where: { id: target.id }, data: { status: 'available' } });
    const existing = await createSession(target.id);
    expect((await claim()).status).toBe(409);
    expect(await prisma.session.count({ where: { tableId: target.id, status: 'active' } })).toBe(1);
    expect((await prisma.session.findUnique({ where: { id: existing.id } })).status).toBe('active');
  });

  test.each(['start', 'switch'])('%s rechecks maintenance after waiting for the target row', async (kind) => {
    const target = await createTable();
    const holder = await holdTableLock(target.id);
    const pending = startRequest(kind === 'start'
      ? request(app).post('/api/sessions').send({ tableId: target.id })
      : request(app).post(`/api/sessions/${session.id}/switch`).send({ newTableId: target.id }));
    await waitForTableLockWaiters();
    await holder.query('UPDATE "PoolTable" SET status = $1 WHERE id::text = $2', ['maintenance', target.id]);
    await holder.query('COMMIT');
    expect((await pending).status).toBe(409);
    await expectTableStatus(target.id, 'maintenance');
    expect(await prisma.session.count({ where: { tableId: target.id, status: 'active' } })).toBe(0);
  });

  test('leaving maintenance rechecks active sessions committed during its row lock wait', async () => {
    const target = await createTable('maintenance');
    const holder = await holdTableLock(target.id);
    const pending = startRequest(request(app).put(`/api/tables/${target.id}`).send({ status: 'available' }));
    await waitForTableLockWaiters();
    await holder.query('INSERT INTO "Session" (id, table_id, status, started_at, created_at) VALUES ($1::uuid, $2::uuid, $3, now(), now())', [require('crypto').randomUUID(), target.id, 'active']);
    await holder.query('COMMIT');
    const result = await pending;
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('occupied');
    await expectTableStatus(target.id, 'occupied');
    expect(await prisma.session.count({ where: { tableId: target.id, status: 'active' } })).toBe(1);
    expect((await request(app).post('/api/sessions').send({ tableId: target.id })).status).toBe(409);
  });

  test('maintenance rechecks active sessions committed during its row lock wait', async () => {
    const target = await createTable();
    const holder = await holdTableLock(target.id);
    const pending = startRequest(request(app).put(`/api/tables/${target.id}`).send({ status: 'maintenance', number: 2000000 }));
    await waitForTableLockWaiters();
    await holder.query('UPDATE "PoolTable" SET status = $1 WHERE id::text = $2', ['occupied', target.id]);
    await holder.query('INSERT INTO "Session" (id, table_id, status, started_at, created_at) VALUES ($1::uuid, $2::uuid, $3, now(), now())', [require('crypto').randomUUID(), target.id, 'active']);
    await holder.query('COMMIT');
    const result = await pending;
    expect(result.status).toBe(409);
    expect(result.body).toEqual({ error: 'table_unavailable' });
    expect(await prisma.poolTable.findUnique({ where: { id: target.id } })).toMatchObject({ status: 'occupied', number: target.number });
    expect(await prisma.session.count({ where: { tableId: target.id, status: 'active' } })).toBe(1);
  });

  test.each(['start', 'switch'])('maintenance racing with %s never hides an active session', async (kind) => {
    const target = await createTable();
    const holder = await holdTableLock(target.id);
    const maintenance = startRequest(request(app).put(`/api/tables/${target.id}`).send({ status: 'maintenance' }));
    const claim = startRequest(kind === 'start'
      ? request(app).post('/api/sessions').send({ tableId: target.id })
      : request(app).post(`/api/sessions/${session.id}/switch`).send({ newTableId: target.id }));
    await waitForTableLockWaiters(2);
    await holder.query('COMMIT');
    const [maintenanceResult, claimResult] = await Promise.all([maintenance, claim]);
    const maintenanceWon = maintenanceResult.status === 200;
    expect(maintenanceResult.status).toBe(maintenanceWon ? 200 : 409);
    expect(claimResult.status).toBe(maintenanceWon ? 409 : kind === 'start' ? 201 : 200);
    await expectTableStatus(target.id, maintenanceWon ? 'maintenance' : 'occupied');
    expect(await prisma.session.count({ where: { tableId: target.id, status: 'active' } })).toBe(maintenanceWon ? 0 : 1);
  });

  test('legacy maintenance with active sessions recovers to occupied and can be released normally', async () => {
    await prisma.poolTable.update({ where: { id: table.id }, data: { status: 'maintenance', totalUsedSeconds: 120, usedSinceMaintenanceSeconds: 60 } });
    const duplicate = await createSession(table.id);
    const result = await request(app).put(`/api/tables/${table.id}`).send({ status: 'available' });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: 'occupied', totalUsedSeconds: 120, usedSinceMaintenanceSeconds: 0 });
    expect(await prisma.poolTable.findUnique({ where: { id: table.id } })).toMatchObject({ status: 'occupied', totalUsedSeconds: 120, usedSinceMaintenanceSeconds: 0 });
    expect((await request(app).post('/api/sessions').send({ tableId: table.id })).status).toBe(409);
    expect((await finish('cancel')).status).toBe(200);
    await expectTableStatus(table.id, 'occupied');
    expect((await finish('cancel', duplicate.id)).status).toBe(200);
    await expectTableStatus(table.id, 'available');
  });

  test.each(['occupied', 'available'])('explicit availability rejects %s with an active session', async (status) => {
    await prisma.poolTable.update({ where: { id: table.id }, data: { status } });
    const result = await request(app).put(`/api/tables/${table.id}`).send({ status: 'available' });
    expect(result.status).toBe(409);
    expect(result.body).toEqual({ error: 'table_unavailable' });
    await expectTableStatus(table.id, status);
    expect((await request(app).post('/api/sessions').send({ tableId: table.id })).status).toBe(409);
  });

  test('leaving maintenance uses the locked state and resets only the maintenance counter', async () => {
    const target = await createTable();
    const holder = await holdTableLock(target.id);
    const pending = startRequest(request(app).put(`/api/tables/${target.id}`).send({ status: 'available' }));
    await waitForTableLockWaiters();
    await holder.query('UPDATE "PoolTable" SET status = $1, total_used_seconds = 120, used_since_maintenance_seconds = 60 WHERE id::text = $2', ['maintenance', target.id]);
    await holder.query('COMMIT');
    expect((await pending).status).toBe(200);
    expect(await prisma.poolTable.findUnique({ where: { id: target.id } })).toMatchObject({ status: 'available', totalUsedSeconds: 120, usedSinceMaintenanceSeconds: 0 });
  });

  test('switch preserves source maintenance and does not free a source with legacy duplicates', async () => {
    const target = await createTable();
    await prisma.poolTable.update({ where: { id: table.id }, data: { status: 'maintenance' } });
    const holder = await holdTableLock(table.id);
    const pending = startRequest(request(app).post(`/api/sessions/${session.id}/switch`).send({ newTableId: target.id }));
    await waitForTableLockWaiters();
    await holder.query('COMMIT');
    expect((await pending).status).toBe(200);
    await expectTableStatus(table.id, 'maintenance');
    await expectTableStatus(target.id, 'occupied');
    const duplicate = await createSession(target.id);
    const third = await createTable();
    expect((await request(app).post(`/api/sessions/${session.id}/switch`).send({ newTableId: third.id })).status).toBe(200);
    await expectTableStatus(target.id, 'occupied');
    expect((await prisma.session.findUnique({ where: { id: duplicate.id } })).tableId).toBe(target.id);
  });
});
