const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const request = require('./helpers/csrfRequest');
const { Client } = require('pg');

const describePostgres = process.env.PAYMENT_TEST_POSTGRES_URL ? describe : describe.skip;

async function withTimeout(promise, timeoutMs = 10000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('payment integration operation timed out')), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describePostgres('Card payment PostgreSQL integration in a disposable database', () => {
  const originalEnv = { ...process.env };
  const databaseName = `payment_test_${crypto.randomBytes(12).toString('hex')}`;
  let admin;
  let observer;
  let prisma;
  let app;
  let session;
  let table;
  let nextTableNumber = 1;
  let databaseCreated = false;

  beforeAll(async () => {
    admin = new Client({ connectionString: process.env.PAYMENT_TEST_POSTGRES_URL });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    databaseCreated = true;
    const url = new URL(process.env.PAYMENT_TEST_POSTGRES_URL);
    url.pathname = `/${databaseName}`;
    process.env.DATABASE_URL = url.toString();
    process.env.PAYMENT_PROVIDER = 'fake';
    delete process.env.STRIPE_SECRET_KEY;
    observer = new Client({ connectionString: process.env.DATABASE_URL });
    await observer.connect();
    const migrationsPath = path.join(__dirname, '../prisma/migrations');
    for (const entry of fs.readdirSync(migrationsPath).sort()) {
      const migration = path.join(migrationsPath, entry, 'migration.sql');
      if (fs.existsSync(migration)) {
        if(entry === '00000000000021_add_refund_operations') await observer.query(`INSERT INTO "Payment" (id, session_id, amount_cents, refunded_cents, status, created_at) VALUES ('11111111-1111-4111-8111-111111111111', gen_random_uuid(), 1200, 400, 'partially_refunded', '2020-01-01T12:00:00Z')`);
        await observer.query(fs.readFileSync(migration, 'utf8'));
      }
    }
    prisma = require('../src/prismaClient');
    app = require('../server');
  }, 60000);

  afterAll(async () => {
    jest.restoreAllMocks();
    if (prisma) await prisma.$disconnect();
    if (observer) await observer.end();
    if (databaseCreated) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    if (admin) await admin.end();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    jest.restoreAllMocks();
    await prisma.setting.upsert({ where: { key: 'pos_enabled' }, create: { key: 'pos_enabled', value: 'true' }, update: { value: 'true' } });
    const tableType = await prisma.tableType.create({ data: { name_en: 'Payment Integration', base_hourly_cents: 1200, vatRatePercent: 20 } });
    table = await prisma.poolTable.create({ data: { tableTypeId: tableType.id, number: nextTableNumber++, status: 'occupied' } });
    session = await prisma.session.create({ data: { tableId: table.id, status: 'active', startedAt: new Date(Date.now() - 60000), numberOfPlayers: 1 } });
  });

  async function createCard(amountCents = 1200, idempotencyKey = crypto.randomUUID()) {
    return request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents, idempotencyKey });
  }

  async function paymentById(id) {
    return prisma.payment.findUnique({ where: { id } });
  }

  async function waitForSessionLockWaiter() {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const result = await observer.query(`SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'active' AND wait_event_type = 'Lock' AND query LIKE '%pool_tables_session%' LIMIT 1`);
      if (result.rows.length) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('payment session lock waiter did not start');
  }

  test('pre-operation backup data survives the existing additive migration and reports legacy attribution', async () => {
    const restored = await paymentById('11111111-1111-4111-8111-111111111111');
    expect(restored).toMatchObject({ amountCents: 1200, refundedCents: 400, refundOperationsJson: '[]' });
    const csv = await request(app).get('/api/reports/payments/export').query({ from: '2020-01-01' });
    expect(csv.status).toBe(200);
    expect(csv.text).toContain('legacy_payment_time');
    expect(csv.text).toContain(',0,400,-400,refunded,');
  });

  test('committed reservation with no call recovers explicitly and concurrent retries reuse the reservation', async () => {
    const provider = require('../src/payments/fakeProvider');
    const key = crypto.randomUUID();
    const payment = await prisma.payment.create({ data: { sessionId: session.id, method: 'card', provider: 'fake', amountCents: 1200, currency: 'EUR', idempotencyKey: key, status: 'pending' } });
    expect((await createCard()).status).toBe(409);
    const reconcile = jest.spyOn(provider, 'reconcileCardPayment');
    const results = await Promise.all(Array.from({ length: 4 }, () => request(app).post(`/api/payments/${payment.id}/reconcile`).send({})));
    expect(results.every(result => result.status === 200 && result.body.status === 'captured')).toBe(true);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(await prisma.payment.count({ where: { sessionId: session.id } })).toBe(1);
  });

  test('lost response plus failed local recording recovers the same remote charge after restart', async () => {
    const provider = require('../src/payments/fakeProvider');
    const create = provider.createCardPayment.bind(provider);
    let remote;
    jest.spyOn(provider, 'createCardPayment').mockImplementation(async args => {
      remote = await create(args);
      throw new Error('connection lost after remote creation');
    });
    const created = await createCard();
    expect(created.status).toBe(502);
    expect(await paymentById(created.body.paymentId)).toMatchObject({ status: 'unknown', providerRef: null });
    jest.restoreAllMocks();
    expect((await request(app).get(`/api/payments/${created.body.paymentId}`)).body.status).toBe('unknown');
    const recovered = await request(app).post(`/api/payments/${created.body.paymentId}/reconcile`).send({});
    expect(recovered.status).toBe(200);
    expect(await paymentById(created.body.paymentId)).toMatchObject({ status: 'captured', providerRef: remote.providerRef });
  });

  test('recovery confirmation rollback preserves the block and retry links the same remote object', async () => {
    const payment = await prisma.payment.create({ data: { sessionId: session.id, method: 'card', provider: 'fake', amountCents: 1200, currency: 'EUR', idempotencyKey: crypto.randomUUID(), status: 'pending' } });
    const provider = require('../src/payments/fakeProvider');
    const reconcile = jest.spyOn(provider, 'reconcileCardPayment');
    const transaction = prisma.$transaction.bind(prisma);
    const rollback = jest.spyOn(prisma, '$transaction').mockImplementationOnce((fn, options) => transaction(async tx => {
      await fn(tx);
      throw new Error('recovery confirmation rollback');
    }, options));
    expect((await request(app).post(`/api/payments/${payment.id}/reconcile`).send({})).status).toBe(500);
    const remote = await reconcile.mock.results[0].value;
    rollback.mockRestore();
    expect(await paymentById(payment.id)).toMatchObject({ status: 'pending', providerRef: null });
    expect((await createCard()).status).toBe(409);
    expect((await request(app).post(`/api/payments/${payment.id}/reconcile`).send({})).status).toBe(200);
    expect(await paymentById(payment.id)).toMatchObject({ status: 'captured', providerRef: remote.providerRef });
  });

  test('expired and ambiguous recovery retains the block until provider-confirmed linking', async () => {
    const created = await createCard();
    const id = created.body.paymentId;
    const original = await paymentById(id);
    await prisma.payment.update({ where: { id }, data: { providerRef: null, status: 'unknown', createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) } });
    expect((await request(app).post(`/api/payments/${id}/reconcile`).send({})).status).toBe(409);
    expect((await request(app).post(`/api/payments/${id}/reconcile`).send({ providerRef: 'wrong' })).status).toBe(409);
    expect((await createCard()).status).toBe(409);
    expect((await request(app).patch(`/api/sessions/${session.id}/end`)).status).toBe(409);
    const confirmed = await request(app).post(`/api/payments/${id}/reconcile`).send({ providerRef: original.providerRef });
    expect(confirmed.status).toBe(200);
    expect(await paymentById(id)).toMatchObject({ providerRef: original.providerRef, status: 'captured' });
  });

  test('refund completion belongs to the current drawer and day, never the closed payment period', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const payment = await prisma.payment.create({ data: { sessionId: session.id, method: 'cash', provider: 'cash', amountCents: 1200, status: 'captured', createdAt: yesterday } });
    const oldShift = await prisma.cashShift.create({ data: { openedAt: new Date(yesterday.getTime() - 60000), closedAt: new Date(yesterday.getTime() + 60000), expectedCents: 1200, countedCents: 1200, varianceCents: 0 } });
    const shift = await request(app).post('/api/cash-shifts/open').send({ openingFloatCents: 5000 });
    const first = await request(app).post(`/api/payments/${payment.id}/refund`).send({ amountCents: 300, idempotencyKey: 'first' });
    expect(first.status).toBe(200);
    const completedAt = first.body.refunds[0].completedAt;
    expect(completedAt).toBeTruthy();
    expect((await request(app).post(`/api/payments/${payment.id}/refund`).send({ amountCents: 300, idempotencyKey: 'first' })).body.refunds[0].completedAt).toBe(completedAt);
    const current = await request(app).get('/api/cash-shifts/current');
    expect(current.body.totals).toMatchObject({ capturedCents: 0, refundedCents: 300, expectedCents: 4700 });
    const closed = await request(app).post(`/api/cash-shifts/${shift.body.id}/close`).send({ countedCents: 4700 });
    expect(closed.body.expectedCents).toBe(4700);
    await request(app).post(`/api/payments/${payment.id}/refund`).send({ amountCents: 200 });
    expect(await prisma.cashShift.findUnique({ where: { id: shift.body.id } })).toMatchObject({ expectedCents: 4700, varianceCents: 0 });
    expect(await prisma.cashShift.findUnique({ where: { id: oldShift.id } })).toMatchObject({ expectedCents: 1200 });
    const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const past = await request(app).get('/api/reports/reconciliation').query({ date: dateKey(yesterday) });
    expect(past.body.payments.byMethod.cash).toMatchObject({ capturedCents: 1200, refundedCents: 0, netCents: 1200 });
    const today = await request(app).get('/api/reports/reconciliation').query({ date: dateKey(new Date()) });
    expect(today.body.payments.byMethod.cash).toMatchObject({ capturedCents: 0, refundedCents: 500, netCents: -500 });
    const csv = await request(app).get('/api/reports/payments/export').query({ from: dateKey(new Date()) });
    expect(csv.text).toContain(',refund,');
    expect(csv.text).toContain('confirmation');
  });

  test('drawer close waits for committed refund cash movement and freezes the resulting total', async () => {
    const payment = await prisma.payment.create({ data: { sessionId: session.id, method: 'cash', provider: 'cash', amountCents: 1200, status: 'captured', createdAt: new Date(Date.now() - 86400000) } });
    const shift = await request(app).post('/api/cash-shifts/open').send({ openingFloatCents: 5000 });
    await observer.query('BEGIN');
    await observer.query("SELECT pg_advisory_xact_lock(hashtext('pool_cash_movements'))");
    let refund;
    let close;
    try {
      refund = request(app).post(`/api/payments/${payment.id}/refund`).send({ amountCents: 300 }).then(result => result);
      for(let attempt = 0; attempt < 200; attempt += 1) {
        await observer.query('SELECT pg_stat_clear_snapshot()');
        const waiting = await observer.query("SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%pool_cash_movements%'");
        if(waiting.rows.length) break;
        if(attempt === 199) throw new Error('refund did not reach cash movement lock');
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      close = request(app).post(`/api/cash-shifts/${shift.body.id}/close`).send({ countedCents: 4700 }).then(result => result);
      for(let attempt = 0; attempt < 200; attempt += 1) {
        await observer.query('SELECT pg_stat_clear_snapshot()');
        const waiting = await observer.query("SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%pool_cash_movements%'");
        if(waiting.rows.length >= 2) break;
        if(attempt === 199) throw new Error('close did not wait for refund lock');
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      await observer.query('COMMIT');
      expect((await withTimeout(refund)).status).toBe(200);
      expect((await withTimeout(close)).body).toMatchObject({ expectedCents: 4700, varianceCents: 0 });
    } finally {
      await observer.query('ROLLBACK');
      if(refund) await refund.catch(() => {});
      if(close) await close.catch(() => {});
    }
  });

  test('legacy aggregate and undated successful refunds retain their historical attribution without replay', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const payment = await prisma.payment.create({ data: { sessionId: session.id, method: 'cash', provider: 'cash', amountCents: 1200, refundedCents: 400, status: 'partially_refunded', createdAt: yesterday, refundOperationsJson: JSON.stringify([{ reference: 'old-success', amountCents: 200, status: 'refunded' }]) } });
    const result = await request(app).post(`/api/payments/${payment.id}/refund`).send({ amountCents: 100 });
    expect(result.status).toBe(200);
    expect(result.body.refundedCents).toBe(500);
    const csv = await request(app).get('/api/reports/payments/export').query({ from: yesterday.toISOString().slice(0, 10) });
    expect(csv.text.match(/legacy_payment_time/g)).toHaveLength(2);
    expect(JSON.parse((await paymentById(payment.id)).refundOperationsJson)).toHaveLength(2);
  });

  test('split receipt refunds credit only attached net funds, not earlier returned funds', async () => {
    const created = await createCard();
    const id = created.body.paymentId;
    await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400 });
    const checkout = await request(app).post(`/api/sessions/${session.id}/checkout`).send({ discountCents: 200, payments: [{ method: 'card', paymentId: id }, { method: 'cash', amountCents: 200 }] });
    expect(checkout.status).toBe(200);
    const cash = checkout.body.payments.find(item => item.method === 'cash');
    const results = await Promise.all([request(app).post(`/api/payments/${id}/refund`).send({}), request(app).post(`/api/payments/${cash.id}/refund`).send({})]);
    expect(results.every(result => result.status === 200)).toBe(true);
    const notes = await prisma.creditNote.findMany({ where: { receiptId: (await paymentById(id)).receiptId } });
    expect(notes.reduce((sum, note) => sum + note.totalTtcCents, 0)).toBe(1000);
    expect(notes.map(note => note.totalTtcCents).sort((a, b) => a - b)).toEqual([200, 800]);
  });

  test('reader error retains the intent, blocks unsafe operations, and polls to a confirmed capture', async () => {
    const provider = require('../src/payments/fakeProvider');
    const create = provider.createCardPayment;
    const spy = jest.spyOn(provider, 'createCardPayment').mockImplementation(async (args) => {
      const intent = await create(args);
      throw Object.assign(new Error('reader response lost'), { providerRef: intent.providerRef, status: 'captured' });
    });
    const key = crypto.randomUUID();
    const created = await createCard(1200, key);
    expect(created.status).toBe(502);
    const payment = await paymentById(created.body.paymentId);
    expect(payment).toMatchObject({ status: 'unknown', providerRef: created.body.providerRef, idempotencyKey: key });
    expect(payment.providerRef).toMatch(/^fake_/);
    expect((await createCard(1200, key)).body).toMatchObject({ paymentId: payment.id, status: 'unknown', duplicate: true });
    expect((await createCard()).status).toBe(409);
    expect((await request(app).patch(`/api/sessions/${session.id}/end`)).status).toBe(409);
    expect((await request(app).post(`/api/payments/${payment.id}/refund`).send({})).status).toBe(409);
    expect((await request(app).post(`/api/sessions/${session.id}/checkout`).send({})).status).toBe(409);
    const poll = await request(app).get(`/api/payments/${payment.id}`);
    expect(poll.body.status).toBe('captured');
    expect((await paymentById(payment.id)).status).toBe('captured');
    expect((await request(app).patch(`/api/sessions/${session.id}/end`)).status).toBe(409);
    const checkout = await request(app).post(`/api/sessions/${session.id}/checkout`).send({ payments: [{ method: 'card', paymentId: payment.id }] });
    expect(checkout.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await prisma.payment.count({ where: { sessionId: session.id } })).toBe(1);
  });

  test('unclear provider results cannot be canceled without confirmed retrieval', async () => {
    const provider = require('../src/payments/fakeProvider');
    jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('reader timeout'), { providerRef: 'known-intent' }));
    const status = jest.spyOn(provider, 'getStatus').mockRejectedValue(new Error('retrieval unavailable'));
    jest.spyOn(provider, 'cancel').mockResolvedValue({ status: 'canceled' });
    const created = await createCard();
    const id = created.body.paymentId;
    expect((await request(app).get(`/api/payments/${id}`)).body.status).toBe('unknown');
    expect((await request(app).post(`/api/payments/${id}/cancel`)).status).toBe(502);
    expect(await paymentById(id)).toMatchObject({ status: 'unknown', providerRef: 'known-intent' });
    status.mockResolvedValue({ status: 'canceled' });
    expect((await request(app).post(`/api/payments/${id}/cancel`)).body.status).toBe('canceled');
    expect((await request(app).patch(`/api/sessions/${session.id}/end`)).status).toBe(200);
  });

  test('an unavailable error-recording transaction leaves a durable blocking reservation', async () => {
    const provider = require('../src/payments/fakeProvider');
    const providerRef = `intent-${session.id}`;
    jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('reader timeout'), { providerRef }));
    const transaction = prisma.$transaction.bind(prisma);
    let calls = 0;
    jest.spyOn(prisma, '$transaction').mockImplementation((fn, options) => transaction(async (tx) => {
      const result = await fn(tx);
      if (++calls === 2) throw new Error('forced error-recording rollback');
      return result;
    }, options));
    const result = await createCard();
    expect(result.status).toBe(502);
    expect(result.body.providerRef).toBe(providerRef);
    expect(calls).toBe(2);
    expect(await paymentById(result.body.paymentId)).toMatchObject({ status: 'pending', providerRef: null });
    jest.restoreAllMocks();
    expect((await createCard()).status).toBe(409);
    expect((await request(app).patch(`/api/sessions/${session.id}/end`)).status).toBe(409);
    expect(await prisma.receipt.count({ where: { sessionId: session.id } })).toBe(0);
  });

  test('partial refunds attach only net funds, preserve gross history and refund only the remaining balance', async () => {
    const provider = require('../src/payments/fakeProvider');
    const refund = jest.spyOn(provider, 'refund');
    const created = await createCard();
    const id = created.body.paymentId;
    const partial = await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400 });
    expect(partial.status).toBe(200);
    expect(partial.body.creditNote).toBeNull();
    const mismatch = await request(app).post(`/api/sessions/${session.id}/checkout`).send({ payments: [{ method: 'card', paymentId: id }] });
    expect(mismatch.body).toMatchObject({ error: 'payment_mismatch', expectedCents: 1200, receivedCents: 800 });
    const checkout = await request(app).post(`/api/sessions/${session.id}/checkout`).send({ payments: [{ method: 'card', paymentId: id, amountCents: 1200 }, { method: 'cash', amountCents: 400 }] });
    expect(checkout.status).toBe(200);
    expect(checkout.body.payments.map(p => p.amountCents)).toEqual([800, 400]);
    expect(await paymentById(id)).toMatchObject({ amountCents: 1200, refundedCents: 400, status: 'partially_refunded', receiptId: expect.any(String) });
    expect(await prisma.creditNote.count({ where: { paymentId: id } })).toBe(0);
    expect((await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 801 })).status).toBe(400);
    const rest = await request(app).post(`/api/payments/${id}/refund`).send({});
    expect(rest.status).toBe(200);
    expect(rest.body).toMatchObject({ amountCents: 1200, refundedCents: 1200, status: 'refunded', creditNote: { totalTtcCents: 800 } });
    expect(refund.mock.calls.map(([args]) => args.amountCents)).toEqual([400, 800]);
    expect((await request(app).post(`/api/payments/${id}/refund`).send({})).status).toBe(409);
    expect(refund).toHaveBeenCalledTimes(2);
  });

  test('checkout waits for an in-flight refund and validates its committed net balance', async () => {
    const created = await createCard();
    const id = created.body.paymentId;
    await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400 });
    const provider = require('../src/payments/fakeProvider');
    let releaseRefund;
    let refundStarted;
    const gate = new Promise(resolve => { releaseRefund = resolve; });
    const started = new Promise(resolve => { refundStarted = resolve; });
    jest.spyOn(provider, 'refund').mockImplementation(async () => {
      refundStarted();
      await gate;
      return { status: 'refunded' };
    });
    const pendingRefund = request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 200 }).then(result => result);
    let pendingCheckout;
    try {
      const early = await withTimeout(Promise.race([started.then(() => null), pendingRefund]));
      if (early) throw new Error(`refund failed before provider call: ${early.status}`);
      pendingCheckout = request(app).post(`/api/sessions/${session.id}/checkout`).send({ payments: [{ method: 'card', paymentId: id }, { method: 'cash', amountCents: 400 }] }).then(result => result);
      await withTimeout(waitForSessionLockWaiter());
      expect(await prisma.receipt.count({ where: { sessionId: session.id } })).toBe(0);
      releaseRefund();
      expect((await withTimeout(pendingRefund)).status).toBe(200);
      const checkout = await withTimeout(pendingCheckout);
      expect(checkout.status).toBe(400);
      expect(checkout.body).toMatchObject({ error: 'payment_mismatch', receivedCents: 1000 });
      expect(await paymentById(id)).toMatchObject({ refundedCents: 600, receiptId: null });
      expect((await prisma.session.findUnique({ where: { id: session.id } })).status).toBe('active');
    } finally {
      releaseRefund();
      await pendingRefund.catch(() => {});
      if (pendingCheckout) await pendingCheckout.catch(() => {});
    }
  });

  test('concurrent refunds cannot spend the same remaining funds twice', async () => {
    const provider = require('../src/payments/fakeProvider');
    const created = await createCard();
    const id = created.body.paymentId;
    await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400 });
    const refund = jest.spyOn(provider, 'refund');
    const results = await Promise.all([
      request(app).post(`/api/payments/${id}/refund`).send({}),
      request(app).post(`/api/payments/${id}/refund`).send({}),
    ]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(refund).toHaveBeenCalledTimes(1);
    expect(refund).toHaveBeenCalledWith(expect.objectContaining({ providerRef: (await paymentById(id)).providerRef, amountCents: 800, reference: expect.any(String), createdAt: expect.any(String) }));
    expect((await paymentById(id)).refundedCents).toBe(1200);
  });

  test('a failed checkout rolls back attachment without altering the partial refund', async () => {
    const created = await createCard();
    const id = created.body.paymentId;
    await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400 });
    const transaction = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementationOnce((fn, options) => transaction(async (tx) => {
      await fn(tx);
      throw new Error('forced checkout rollback');
    }, options));
    const result = await request(app).post(`/api/sessions/${session.id}/checkout`).send({ payments: [{ method: 'card', paymentId: id }, { method: 'cash', amountCents: 400 }] });
    expect(result.status).toBe(500);
    expect(await paymentById(id)).toMatchObject({ status: 'partially_refunded', amountCents: 1200, refundedCents: 400, receiptId: null });
    expect(await prisma.receipt.count({ where: { sessionId: session.id } })).toBe(0);
    expect((await prisma.session.findUnique({ where: { id: session.id } })).status).toBe('active');
    expect((await prisma.poolTable.findUnique({ where: { id: table.id } })).status).toBe('occupied');
  });

  test('provider success followed by database rollback reconciles once with no duplicate credit note', async () => {
    const created = await createCard();
    const id = created.body.paymentId;
    expect((await request(app).post(`/api/sessions/${session.id}/checkout`).send({ payments: [{ method: 'card', paymentId: id }] })).status).toBe(200);
    const provider = require('../src/payments/fakeProvider');
    const remote = new Map();
    let externalRefunds = 0;
    const refund = jest.spyOn(provider, 'refund').mockImplementation(async (args) => {
      const row = await observer.query('SELECT refund_operations_json FROM "Payment" WHERE id = $1', [id]);
      expect(JSON.parse(row.rows[0].refund_operations_json)[0].reference).toBe(args.reference);
      if(!remote.has(args.reference)) {
        externalRefunds += 1;
        remote.set(args.reference, { status: 'refunded', providerRefundRef: `re_${args.reference}`, amountCents: args.amountCents, providerRef: args.providerRef, reference: args.reference });
      }
      return remote.get(args.reference);
    });
    const transaction = prisma.$transaction.bind(prisma);
    let transactions = 0;
    const rollback = jest.spyOn(prisma, '$transaction').mockImplementation((fn, options) => transaction(async (tx) => {
      const result = await fn(tx);
      if(++transactions === 2) throw new Error('forced post-provider rollback');
      return result;
    }, options));
    const failed = await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'durable-key' });
    expect(failed.status).toBe(500);
    expect(externalRefunds).toBe(1);
    expect(await paymentById(id)).toMatchObject({ refundedCents: 0, status: 'captured' });
    expect(JSON.parse((await paymentById(id)).refundOperationsJson)).toEqual([expect.objectContaining({ status: 'unknown', reference: failed.body.refundId })]);
    expect(await prisma.creditNote.count({ where: { paymentId: id } })).toBe(0);
    rollback.mockRestore();
    const retry = await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'durable-key' });
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ refundedCents: 400, refundStatus: 'refunded', creditNote: { totalTtcCents: 400 } });
    expect(refund).toHaveBeenCalledTimes(2);
    expect(externalRefunds).toBe(1);
    const duplicates = await Promise.all(Array.from({ length: 4 }, () => request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'durable-key' })));
    expect(duplicates.every(result => result.body.refundedCents === 400)).toBe(true);
    expect(await prisma.creditNote.count({ where: { paymentId: id } })).toBe(1);
    expect(JSON.parse((await paymentById(id)).refundOperationsJson)).toHaveLength(1);
    expect(externalRefunds).toBe(1);
  });

  test('reservation rollback prevents any external refund', async () => {
    const created = await createCard();
    const provider = require('../src/payments/fakeProvider');
    const refund = jest.spyOn(provider, 'refund');
    const transaction = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementationOnce((fn, options) => transaction(async (tx) => {
      await fn(tx);
      throw new Error('forced reservation rollback');
    }, options));
    const failed = await request(app).post(`/api/payments/${created.body.paymentId}/refund`).send({});
    expect(failed.status).toBe(500);
    expect(refund).not.toHaveBeenCalled();
    expect(JSON.parse((await paymentById(created.body.paymentId)).refundOperationsJson)).toEqual([]);
  });

  test('pending refund reserves funds, failed refund releases them, and an explicit new key creates a new operation', async () => {
    const created = await createCard();
    const id = created.body.paymentId;
    const provider = require('../src/payments/fakeProvider');
    const refund = jest.spyOn(provider, 'refund').mockResolvedValue({ status: 'pending', providerRefundRef: 're_pending' });
    const retrieve = jest.spyOn(provider, 'getRefund').mockResolvedValue({ status: 'pending', providerRefundRef: 're_pending', amountCents: 400 });
    const pending = await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'pending-key' });
    expect(pending.status).toBe(409);
    expect(await paymentById(id)).toMatchObject({ refundedCents: 0, status: 'captured' });
    expect((await request(app).post(`/api/sessions/${session.id}/checkout`).send({})).status).toBe(409);
    expect((await createCard()).status).toBe(409);
    expect((await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'new-key' })).status).toBe(409);
    retrieve.mockResolvedValue({ status: 'failed', providerRefundRef: 're_pending', amountCents: 400 });
    const failed = await request(app).post(`/api/payments/${id}/refunds/${pending.body.refundId}/reconcile`).send({});
    expect(failed.body).toMatchObject({ refundStatus: 'failed', refundedCents: 0, refundPending: false });
    expect((await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'pending-key' })).body.refundStatus).toBe('failed');
    expect(refund).toHaveBeenCalledTimes(1);
    refund.mockResolvedValue({ status: 'refunded', providerRefundRef: 're_new' });
    expect((await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'new-key' })).body.refundedCents).toBe(400);
    expect(JSON.parse((await paymentById(id)).refundOperationsJson)).toHaveLength(2);
  });

  test('same-key concurrent partial refunds create only one operation and one provider refund', async () => {
    const created = await createCard();
    const id = created.body.paymentId;
    const provider = require('../src/payments/fakeProvider');
    const refund = jest.spyOn(provider, 'refund');
    const results = await Promise.all(Array.from({ length: 5 }, () => request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 200, idempotencyKey: 'concurrent-key' })));
    expect(results.every(result => result.status === 200 && result.body.refundedCents === 200)).toBe(true);
    expect(refund).toHaveBeenCalledTimes(1);
    expect(JSON.parse((await paymentById(id)).refundOperationsJson)).toHaveLength(1);
    expect((await paymentById(id)).refundedCents).toBe(200);
  });

  test('refund webhook rollback and concurrent replay book one credit note and one event', async () => {
    const created = await createCard();
    const id = created.body.paymentId;
    expect((await request(app).post(`/api/sessions/${session.id}/checkout`).send({ payments: [{ method: 'card', paymentId: id }] })).status).toBe(200);
    await prisma.payment.update({ where: { id }, data: { provider: 'stripe', providerRef: `pi_${id}` } });
    process.env.PAYMENT_PROVIDER = '';
    process.env.STRIPE_SECRET_KEY = 'sk_test_refund';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_refund';
    const provider = require('../src/payments/provider').getCardProvider();
    const refund = jest.spyOn(provider, 'refund').mockImplementation(async args => ({ status: 'pending', providerRefundRef: `re_${id}`, amountCents: args.amountCents, providerRef: args.providerRef, reference: args.reference }));
    const retrieve = jest.spyOn(provider, 'getRefund');
    try {
      const pending = await request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'webhook-key' });
      expect(pending.status).toBe(409);
      retrieve.mockResolvedValue({ status: 'refunded', providerRefundRef: `re_${id}`, amountCents: 400, providerRef: `pi_${id}`, reference: pending.body.refundId });
      const stripe = new (require('stripe'))('sk_test_refund');
      const payload = JSON.stringify({ id: `evt_${id}`, type: 'refund.updated', data: { object: { object: 'refund', id: `re_${id}`, payment_intent: `pi_${id}`, status: 'pending', amount: 400, metadata: { reference: pending.body.refundId } } } });
      const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_refund' });
      const webhook = () => request(app).post('/api/webhooks/stripe').set('Content-Type', 'application/json').set('stripe-signature', signature).send(payload);
      const transaction = prisma.$transaction.bind(prisma);
      const rollback = jest.spyOn(prisma, '$transaction').mockImplementationOnce((fn, options) => transaction(async tx => {
        await fn(tx);
        throw new Error('forced webhook rollback');
      }, options));
      expect((await webhook()).status).toBe(500);
      rollback.mockRestore();
      expect((await paymentById(id)).refundedCents).toBe(0);
      expect(await prisma.creditNote.count({ where: { paymentId: id } })).toBe(0);
      expect(await prisma.paymentEvent.count({ where: { eventId: `evt_${id}` } })).toBe(0);
      const results = await Promise.all([webhook(), webhook(), request(app).get(`/api/payments/${id}`), request(app).post(`/api/payments/${id}/refund`).send({ amountCents: 400, idempotencyKey: 'webhook-key' })]);
      expect(results.every(result => result.status === 200)).toBe(true);
      expect((await paymentById(id)).refundedCents).toBe(400);
      expect(await prisma.creditNote.count({ where: { paymentId: id } })).toBe(1);
      expect(await prisma.paymentEvent.count({ where: { eventId: `evt_${id}` } })).toBe(1);
      expect(refund).toHaveBeenCalledTimes(1);
    } finally {
      process.env.PAYMENT_PROVIDER = 'fake';
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }
  });

  test('uncommitted proof of intent absence never releases a durable blocking reservation', async () => {
    const provider = require('../src/payments/fakeProvider');
    const create = jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('definitive rejection'), { noRemoteObject: true }));
    const transaction = prisma.$transaction.bind(prisma);
    let calls = 0;
    const rollback = jest.spyOn(prisma, '$transaction').mockImplementation((fn, options) => transaction(async tx => {
      const result = await fn(tx);
      if(++calls === 2) throw new Error('absence proof rollback');
      return result;
    }, options));
    const key = crypto.randomUUID();
    const created = await createCard(1200, key);
    rollback.mockRestore();
    expect(created.status).toBe(502);
    expect(await paymentById(created.body.paymentId)).toMatchObject({ status: 'pending', providerRef: null });
    expect((await createCard(1200, key)).body).toMatchObject({ status: 'pending', duplicate: true });
    expect((await createCard()).status).toBe(409);
    expect((await request(app).patch(`/api/sessions/${session.id}/end`)).status).toBe(409);
    expect(create).toHaveBeenCalledTimes(1);
  });

  test.each([true, false])('intent creation rejection releases funds only with definite absence: %s', async (noRemoteObject) => {
    const provider = require('../src/payments/fakeProvider');
    jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('creation rejected'), { noRemoteObject }));
    const created = await createCard();
    expect(created.status).toBe(502);
    expect((await paymentById(created.body.paymentId)).status).toBe(noRemoteObject ? 'creation_rejected' : 'unknown');
    expect((await request(app).patch(`/api/sessions/${session.id}/end`)).status).toBe(noRemoteObject ? 200 : 409);
  });

  test.each([
    ['captured', 0, null, 409],
    ['partially_refunded', 400, null, 409],
    ['unknown', 0, null, 409],
    ['pending', 0, null, 409],
    ['refunded', 1200, null, 200],
    ['canceled', 0, null, 200],
    ['captured', 0, 'receipt', 200],
    ['partially_refunded', 400, 'receipt', 200],
  ])('/end preserves payment safety for %s refunded=%i receipt=%s even with POS off', async (status, refundedCents, receiptId, expectedStatus) => {
    await prisma.setting.update({ where: { key: 'pos_enabled' }, data: { value: 'false' } });
    let attachedReceiptId = null;
    if (receiptId) {
      const receipt = await prisma.receipt.create({ data: { number: nextTableNumber, year: 2026, sessionId: session.id, itemsJson: '[]', subtotalHtCents: 1000, vatCents: 200, totalTtcCents: 1200 } });
      attachedReceiptId = receipt.id;
    }
    await prisma.payment.create({ data: { sessionId: session.id, method: 'card', provider: 'fake', amountCents: 1200, refundedCents, status, receiptId: attachedReceiptId } });
    const result = await request(app).patch(`/api/sessions/${session.id}/end`);
    expect(result.status).toBe(expectedStatus);
    const currentSession = await prisma.session.findUnique({ where: { id: session.id } });
    const currentTable = await prisma.poolTable.findUnique({ where: { id: table.id } });
    expect(currentSession.status).toBe(expectedStatus === 409 ? 'active' : 'ended');
    expect(currentTable.status).toBe(expectedStatus === 409 ? 'occupied' : 'available');
    if (expectedStatus === 409) expect(currentSession.endedAt).toBeNull();
  });
});
