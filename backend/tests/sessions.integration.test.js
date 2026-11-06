const request = require('./helpers/csrfRequest');
const { Client } = require('pg');

const describePostgres = process.env.SESSION_TEST_POSTGRES_URL ? describe : describe.skip;

async function withTimeout(promise, timeoutMs = 10000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('integration operation timed out')), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describePostgres('Session cancellation PostgreSQL integration', () => {
  let app;
  let prisma;
  let observer;
  let tableType;
  let table;
  let session;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.SESSION_TEST_POSTGRES_URL;
    process.env.PAYMENT_PROVIDER = 'fake';
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
    jest.restoreAllMocks();
    await prisma.creditNote.deleteMany();
    await prisma.paymentEvent.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.pendingOrder.deleteMany();
    await prisma.tabLineItem.deleteMany();
    await prisma.sessionPlayer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.session.deleteMany();
    await prisma.poolTable.deleteMany();
    await prisma.tableType.deleteMany();
    await prisma.setting.deleteMany();
    tableType = await prisma.tableType.create({ data: { name_en: 'Integration Pool', base_hourly_cents: 1200, vatRatePercent: 20 } });
    table = await prisma.poolTable.create({ data: { tableTypeId: tableType.id, number: 901, status: 'occupied' } });
    session = await prisma.session.create({ data: { tableId: table.id, status: 'active', startedAt: new Date(Date.now() - 60000), numberOfPlayers: 1, pin: '0000' } });
  });

  async function waitForSessionLockWaiter(client) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const result = await client.query(
        `SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'active' AND wait_event_type = 'Lock' AND query LIKE '%pool_tables_session%' LIMIT 1`
      );
      if (result.rows.length) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('session lock waiter did not start');
  }

  async function holdSessionLock() {
    const holder = new Client({ connectionString: process.env.SESSION_TEST_POSTGRES_URL });
    await holder.connect();
    await holder.query('BEGIN');
    await holder.query(`SELECT pg_advisory_xact_lock(hashtext('pool_tables_session'), hashtext($1::text))`, [session.id]);
    return holder;
  }

  test('cancellation starts and waits on the PostgreSQL advisory lock', async () => {
    const holder = await holdSessionLock();
    try {
      const pending = request(app).post(`/api/sessions/${session.id}/cancel`).then(result => result);
      await withTimeout(waitForSessionLockWaiter(observer));
      expect((await prisma.session.findUnique({ where: { id: session.id } })).status).toBe('active');
      await holder.query('COMMIT');
      const res = await withTimeout(pending);
      expect(res.status).toBe(200);
      expect((await prisma.session.findUnique({ where: { id: session.id } })).status).toBe('cancelled');
      expect((await prisma.poolTable.findUnique({ where: { id: table.id } })).status).toBe('available');
    } finally {
      await holder.query('ROLLBACK').catch(() => {});
      await holder.end();
    }
  });

  test('tab creation waits on the same lock and then prevents cancellation', async () => {
    const holder = await holdSessionLock();
    try {
      const pending = request(app).post(`/api/sessions/${session.id}/items`).send({ type: 'drink', description: 'Integration drink', quantity: 1, unitPrice: 500 }).then(result => result);
      await withTimeout(waitForSessionLockWaiter(observer));
      expect(await prisma.tabLineItem.count({ where: { sessionId: session.id } })).toBe(0);
      await holder.query('COMMIT');
      expect((await withTimeout(pending)).status).toBe(201);
      const cancel = await request(app).post(`/api/sessions/${session.id}/cancel`);
      expect(cancel.status).toBe(409);
      expect(cancel.body).toEqual({ error: 'session_has_activity' });
    } finally {
      await holder.query('ROLLBACK').catch(() => {});
      await holder.end();
    }
  });

  test.each([
    ['scoped void', (id) => request(app).delete(`/api/sessions/${session.id}/items/${id}`)],
    ['direct void', (id) => request(app).delete(`/api/tab-items/${id}`)],
    ['correction', (id) => request(app).patch(`/api/tab-items/${id}`).send({ totalCents: 400 })],
  ])('%s rechecks cancellation after waiting for the session lock', async (name, makeRequest) => {
    const item = await prisma.tabLineItem.create({ data: { sessionId: session.id, type: 'drink', description: 'Tea', quantity: 1, unitPrice: 500, totalCents: 500 } });
    const holder = await holdSessionLock();
    try {
      const pending = makeRequest(item.id).then(result => result);
      await withTimeout(waitForSessionLockWaiter(observer));
      await holder.query(`UPDATE "Session" SET status = 'cancelled' WHERE id::text = $1`, [session.id]);
      await holder.query('COMMIT');
      const res = await withTimeout(pending);
      expect(res.status).toBe(409);
      expect((await prisma.tabLineItem.findUnique({ where: { id: item.id } })).voidedAt).toBeNull();
      expect(await prisma.tabLineItem.count({ where: { sessionId: session.id } })).toBe(1);
    } finally {
      await holder.query('ROLLBACK').catch(() => {});
      await holder.end();
    }
  });

  test('a failed correction rolls back the original void', async () => {
    const item = await prisma.tabLineItem.create({ data: { sessionId: session.id, type: 'drink', description: 'Tea', quantity: 1, unitPrice: 500, totalCents: 500 } });
    const originalTransaction = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementationOnce((fn, options) => originalTransaction(async (tx) => {
      await fn(tx);
      throw new Error('forced correction rollback');
    }, options));
    expect((await request(app).patch(`/api/tab-items/${item.id}`).send({ totalCents: 400 })).status).toBe(500);
    expect((await prisma.tabLineItem.findUnique({ where: { id: item.id } })).voidedAt).toBeNull();
    expect(await prisma.tabLineItem.count({ where: { sessionId: session.id } })).toBe(1);
  });

  test('concurrent correction cannot create two replacements for the same item', async () => {
    const item = await prisma.tabLineItem.create({ data: { sessionId: session.id, type: 'drink', description: 'Tea', quantity: 1, unitPrice: 500, totalCents: 500 } });
    const results = await Promise.all([
      request(app).patch(`/api/tab-items/${item.id}`).send({ totalCents: 400 }),
      request(app).patch(`/api/tab-items/${item.id}`).send({ totalCents: 300 }),
    ]);
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    expect(await prisma.tabLineItem.count({ where: { correctedFromId: item.id } })).toBe(1);
  });

  test('concurrent fulfillment and cancellation resolve an order only once', async () => {
    const order = await prisma.pendingOrder.create({ data: { sessionId: session.id, tableId: table.id, status: 'pending', totalCents: 500, itemsJson: JSON.stringify([{ description: 'Tea', quantity: 1, unitPriceCents: 500, totalCents: 500 }]) } });
    const results = await Promise.all([
      request(app).post(`/api/pending-orders/${order.id}/fulfill`),
      request(app).post(`/api/pending-orders/${order.id}/cancel`),
    ]);
    expect(results.map(result => result.status).sort()).toEqual([200, 400]);
    const resolved = await prisma.pendingOrder.findUnique({ where: { id: order.id } });
    expect(['fulfilled', 'cancelled']).toContain(resolved.status);
    expect(await prisma.tabLineItem.count({ where: { sessionId: session.id } })).toBe(resolved.status === 'fulfilled' ? 1 : 0);
  });

  test('ending after a lock wait uses a timestamp no earlier than lock release', async () => {
    const holder = await holdSessionLock();
    try {
      const pending = request(app).patch(`/api/sessions/${session.id}/end`).then(result => result);
      await withTimeout(waitForSessionLockWaiter(observer));
      const releaseTime = (await holder.query('SELECT clock_timestamp() AS time')).rows[0].time;
      await holder.query('COMMIT');
      expect((await withTimeout(pending)).status).toBe(200);
      const ended = await prisma.session.findUnique({ where: { id: session.id } });
      expect(ended.endedAt.getTime()).toBeGreaterThanOrEqual(releaseTime.getTime());
      expect(ended.endedAt.getTime()).toBeGreaterThanOrEqual(ended.startedAt.getTime());
    } finally {
      await holder.query('ROLLBACK').catch(() => {});
      await holder.end();
    }
  });

  test('operations utilization excludes cancelled sessions', async () => {
    const startedAt = new Date('2025-06-02T10:00:00');
    const endedAt = new Date('2025-06-02T11:00:00');
    await prisma.session.update({ where: { id: session.id }, data: { status: 'ended', startedAt, endedAt } });
    await prisma.session.create({ data: { tableId: table.id, status: 'cancelled', startedAt, endedAt, numberOfPlayers: 1 } });
    const res = await request(app).get('/api/reports/operations').query({ weekDate: '2025-06-02' });
    expect(res.status).toBe(200);
    expect(res.body.utilizationByTableType[tableType.id][0][10]).toBe(60);
  });

  test('known zero-value internal metadata is preserved and allows cancellation', async () => {
    for (const description of ['subscriber_count', 'non_subscriber_started_at']) {
      await prisma.tabLineItem.create({ data: { sessionId: session.id, type: 'meta', description, quantity: 1, unitPrice: 0, totalCents: 0 } });
    }
    const res = await request(app).post(`/api/sessions/${session.id}/cancel`);
    expect(res.status).toBe(200);
    expect(await prisma.tabLineItem.count({ where: { sessionId: session.id } })).toBe(2);
    expect((await prisma.session.findUnique({ where: { id: session.id } })).pin).toBeNull();
  });

  test.each([
    [{ description: 'unknown_meta' }],
    [{ unitPrice: 1 }],
    [{ totalCents: 1 }],
    [{ vatAmountCents: 1 }],
  ])('meaningful metadata blocks cancellation: %p', async (overrides) => {
    await prisma.tabLineItem.create({
      data: {
        sessionId: session.id,
        type: 'meta',
        description: 'subscriber_count',
        quantity: 1,
        unitPrice: 0,
        totalCents: 0,
        ...overrides,
      },
    });
    const res = await request(app).post(`/api/sessions/${session.id}/cancel`);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'session_has_activity' });
    expect((await prisma.session.findUnique({ where: { id: session.id } })).status).toBe('active');
  });

  test('checkout and duplicate card attempts cannot pass an in-flight reservation', async () => {
    await prisma.setting.create({ data: { key: 'pos_enabled', value: 'true' } });
    const provider = require('../src/payments/fakeProvider');
    const createCardPayment = provider.createCardPayment;
    let releaseProvider;
    let providerStarted;
    const gate = new Promise(resolve => { releaseProvider = resolve; });
    const started = new Promise(resolve => { providerStarted = resolve; });
    const spy = jest.spyOn(provider, 'createCardPayment').mockImplementation(async (args) => {
      providerStarted();
      await gate;
      return createCardPayment(args);
    });
    const key = `inflight-${session.id}`;
    const pending = request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents: 1200, idempotencyKey: key }).then(result => result);
    try {
      const earlyResponse = await withTimeout(Promise.race([started.then(() => null), pending]));
      if (earlyResponse) throw new Error(`card request failed before provider start: ${earlyResponse.status}`);
      const retry = await request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents: 1200, idempotencyKey: key });
      expect(retry.status).toBe(200);
      expect(retry.body).toMatchObject({ status: 'pending', duplicate: true });
      const another = await request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents: 1200, idempotencyKey: `${key}-new` });
      expect(another.status).toBe(409);
      expect(another.body.error).toBe('payment_reconciliation_required');
      const checkout = await request(app).post(`/api/sessions/${session.id}/checkout`).send({});
      expect(checkout.status).toBe(409);
      expect(await prisma.receipt.count({ where: { sessionId: session.id } })).toBe(0);
      expect((await prisma.session.findUnique({ where: { id: session.id } })).status).toBe('active');
      expect(await prisma.payment.count({ where: { sessionId: session.id } })).toBe(1);
      releaseProvider();
      expect((await withTimeout(pending)).status).toBe(201);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      releaseProvider();
      await pending.catch(() => {});
    }
  });

  test('provider timeout after capture remains unresolved and cannot be cancelled or retried', async () => {
    await prisma.setting.create({ data: { key: 'pos_enabled', value: 'true' } });
    const provider = require('../src/payments/fakeProvider');
    const createCardPayment = provider.createCardPayment;
    const spy = jest.spyOn(provider, 'createCardPayment').mockImplementation(async (args) => {
      await createCardPayment(args);
      throw new Error('lost provider response');
    });
    const key = `lost-${session.id}`;
    const first = await request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents: 1200, idempotencyKey: key });
    expect(first.status).toBe(502);
    const payment = await prisma.payment.findUnique({ where: { id: first.body.paymentId } });
    expect(payment).toMatchObject({ status: 'unknown', providerRef: null });
    expect((await request(app).post(`/api/payments/${payment.id}/cancel`)).status).toBe(409);
    expect((await request(app).post(`/api/sessions/${session.id}/checkout`).send({})).status).toBe(409);
    const retry = await request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents: 1200, idempotencyKey: key });
    expect(retry.body).toMatchObject({ paymentId: payment.id, status: 'unknown', duplicate: true });
    const fresh = await request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents: 1200, idempotencyKey: `${key}-new` });
    expect(fresh.status).toBe(409);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await prisma.receipt.count({ where: { sessionId: session.id } })).toBe(0);
  });

  test('a rolled back reservation never invokes the provider', async () => {
    await prisma.setting.create({ data: { key: 'pos_enabled', value: 'true' } });
    const provider = require('../src/payments/fakeProvider');
    const spy = jest.spyOn(provider, 'createCardPayment');
    const originalTransaction = prisma.$transaction.bind(prisma);
    jest.spyOn(prisma, '$transaction').mockImplementationOnce((fn, options) => originalTransaction(async (tx) => {
      await fn(tx);
      throw new Error('forced rollback');
    }, options));
    const result = await request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents: 1200, idempotencyKey: `rollback-${session.id}` });
    expect(result.status).toBe(500);
    expect(await prisma.payment.count({ where: { sessionId: session.id } })).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  test('webhook event and reconciliation roll back and retry atomically', async () => {
    process.env.PAYMENT_PROVIDER = '';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    try {
      const payment = await prisma.payment.create({ data: { sessionId: session.id, method: 'card', provider: 'stripe', status: 'unknown', amountCents: 1200, idempotencyKey: `webhook-${session.id}` } });
      const Stripe = require('stripe');
      const stripe = new Stripe('sk_test_123');
      const payload = JSON.stringify({ id: `evt-${session.id}`, type: 'payment_intent.succeeded', data: { object: { object: 'payment_intent', id: `pi-${session.id}`, status: 'succeeded', amount: 1200, metadata: { reference: payment.idempotencyKey } } } });
      const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
      const post = () => request(app).post('/api/webhooks/stripe').set('Content-Type', 'application/json').set('stripe-signature', signature).send(payload);
      const originalTransaction = prisma.$transaction.bind(prisma);
      jest.spyOn(prisma, '$transaction').mockImplementationOnce((fn, options) => originalTransaction(async (tx) => {
        await fn(tx);
        throw new Error('forced webhook rollback');
      }, options));
      expect((await post()).status).toBe(500);
      expect(await prisma.paymentEvent.count()).toBe(0);
      expect((await prisma.payment.findUnique({ where: { id: payment.id } })).status).toBe('unknown');
      expect((await post()).status).toBe(200);
      expect((await prisma.payment.findUnique({ where: { id: payment.id } })).status).toBe('captured');
      expect(await prisma.paymentEvent.count()).toBe(1);
      expect((await post()).body.duplicate).toBe(true);
    } finally {
      process.env.PAYMENT_PROVIDER = 'fake';
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }
  });

  test('committed card reservation blocks cancellation and end while the provider is running', async () => {
    await prisma.setting.create({ data: { key: 'pos_enabled', value: 'true' } });
    await prisma.setting.create({ data: { key: 'currency', value: 'EUR' } });
    const provider = require('../src/payments/fakeProvider');
    const createCardPayment = provider.createCardPayment;
    let releaseProvider;
    let providerStarted;
    const gate = new Promise(resolve => { releaseProvider = resolve; });
    const started = new Promise(resolve => { providerStarted = resolve; });
    jest.spyOn(provider, 'createCardPayment').mockImplementation(async (args) => {
      providerStarted();
      await gate;
      return createCardPayment(args);
    });

    const pending = request(app).post('/api/payments/card').send({ sessionId: session.id, amountCents: 1200, idempotencyKey: `integration-${session.id}` });
    try {
      const earlyResponse = await withTimeout(Promise.race([started.then(() => null), pending]));
      if (earlyResponse) throw new Error(`card request failed before provider start: ${earlyResponse.status} ${JSON.stringify(earlyResponse.body)}`);
      const reservation = await prisma.payment.findFirst({ where: { sessionId: session.id } });
      expect(reservation).toMatchObject({ status: 'pending', providerRef: null, amountCents: 1200 });

      const cancel = await request(app).post(`/api/sessions/${session.id}/cancel`);
      expect(cancel.status).toBe(409);
      expect(cancel.body).toEqual({ error: 'session_has_activity' });
      const end = await request(app).patch(`/api/sessions/${session.id}/end`);
      expect(end.status).toBe(409);
      expect(end.body).toEqual({ error: 'session_has_activity' });

      releaseProvider();
      const created = await withTimeout(pending);
      expect(created.status).toBe(201);
      expect((await prisma.payment.findUnique({ where: { id: reservation.id } })).status).toBe('captured');
    } finally {
      releaseProvider();
      await pending.catch(() => {});
    }
  });
});
