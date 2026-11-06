const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

const ACTIVE_SESSION = () => ({ id: 'sess1', status: 'active', tableId: 't1', startedAt: new Date(Date.now() - 60000), numberOfPlayers: 2 });

function serializeTransactions() {
  let tail = Promise.resolve();
  prisma.$transaction.mockImplementation((fn) => {
    const result = tail.then(() => fn(prisma));
    tail = result.then(() => undefined, () => undefined);
    return result;
  });
}

describe('POS card payments (provider adapters)', () => {
  const agent = request.agent(app);
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.PAYMENT_PROVIDER = 'fake';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    prisma.state.mockSettings = { pos_enabled: 'true', currency: '€' };
    prisma.state.payments = [];
    prisma.state.cashShifts = [];
    prisma.state.receipts = [];
    prisma.state.creditNotes = [];
    prisma.state.paymentEvents = [];
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    setupAuthBypass(prisma);
    prisma.session.findUnique.mockResolvedValue(ACTIVE_SESSION());
    prisma.$queryRawUnsafe.mockResolvedValue([{ base_hourly_cents: 1200, vat_rate_percent: 20 }]);
    prisma.tabLineItem.findMany.mockResolvedValue([]);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('config reports the fake provider when POS is enabled', async () => {
    const res = await agent.get('/api/payments/config');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pos_enabled: true, card_enabled: true, provider: 'fake' });
  });

  test('creates a card payment through the provider and caps at the amount due', async () => {
    const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('captured');
    expect(prisma.state.payments).toHaveLength(1);
    expect(prisma.state.payments[0].provider).toBe('fake');
    expect(prisma.state.payments[0].providerRef).toMatch(/^fake_/);

    const tooMuch = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 999999 });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.error).toBe('amount_exceeds_total');
  });

  test('card creation is idempotent for a repeated idempotency key', async () => {
    const first = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'key-1' });
    expect(first.status).toBe(201);
    const second = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'key-1' });
    expect(second.status).toBe(200);
    expect(second.body.paymentId).toBe(first.body.paymentId);
    expect(second.body.duplicate).toBe(true);
    expect(prisma.state.payments).toHaveLength(1);
  });

  test('uncertain provider failures preserve a reservation and block further charges', async () => {
    const provider = require('../src/payments/fakeProvider');
    const spy = jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('terminal timeout'), { code: 'terminal_timeout' }));
    try {
      const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'failed-key' });
      expect(created.status).toBe(502);
      expect(created.body).toEqual({ error: 'terminal_timeout', paymentId: expect.any(String) });
      expect(prisma.state.payments).toHaveLength(1);
      expect(prisma.state.payments[0]).toMatchObject({ id: created.body.paymentId, status: 'unknown' });
      expect(prisma.state.payments[0].providerRef ?? null).toBeNull();

      const cancel = await agent.post('/api/sessions/sess1/cancel');
      expect(cancel.status).toBe(409);
      expect(cancel.body).toEqual({ error: 'session_has_activity' });

      const retry = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'failed-key' });
      expect(retry.status).toBe(200);
      expect(retry.body).toMatchObject({ paymentId: created.body.paymentId, status: 'unknown', duplicate: true });
      const newKey = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'another-key' });
      expect(newKey.status).toBe(409);
      expect(newKey.body.error).toBe('payment_reconciliation_required');
      const cancelPayment = await agent.post(`/api/payments/${created.body.paymentId}/cancel`);
      expect(cancelPayment.status).toBe(409);
      expect(cancelPayment.body.error).toBe('payment_reconciliation_required');
      const refund = await agent.post(`/api/payments/${created.body.paymentId}/refund`).send({});
      expect(refund.status).toBe(409);
      const checkout = await agent.post('/api/sessions/sess1/checkout').send({});
      expect(checkout.status).toBe(409);
      expect(checkout.body.error).toBe('payment_reconciliation_required');
      expect(prisma.state.receipts).toHaveLength(0);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  test.each(['captured', 'canceled', 'presenting', 'failed', undefined])('provider errors retain their reference until a confirmed %s status is polled', async (liveStatus) => {
    const provider = require('../src/payments/fakeProvider');
    const create = jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('reader timeout'), { code: 'reader_timeout', providerRef: 'intent-known', status: 'captured' }));
    const status = jest.spyOn(provider, 'getStatus').mockResolvedValue({ status: liveStatus });
    try {
      const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'reader-error' });
      expect(created.status).toBe(502);
      expect(created.body).toMatchObject({ error: 'reader_timeout', providerRef: 'intent-known' });
      const paymentId = created.body.paymentId;
      expect(prisma.state.payments[0]).toMatchObject({ id: paymentId, status: 'unknown', providerRef: 'intent-known' });
      expect(status).not.toHaveBeenCalled();
      expect((await agent.patch('/api/sessions/sess1/end')).status).toBe(409);
      expect((await agent.post(`/api/payments/${paymentId}/refund`).send({})).status).toBe(409);
      const retry = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'reader-error' });
      expect(retry.body).toMatchObject({ paymentId, status: 'unknown', duplicate: true });
      const fetched = await agent.get(`/api/payments/${paymentId}`);
      expect(status).toHaveBeenCalledWith('intent-known');
      expect(fetched.body.status).toBe(['captured', 'canceled', 'presenting'].includes(liveStatus) ? liveStatus : 'unknown');
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      create.mockRestore();
      status.mockRestore();
    }
  });

  test('failed polling and an unconfirmed cancellation leave a referenced error unresolved', async () => {
    const provider = require('../src/payments/fakeProvider');
    const create = jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('reader timeout'), { providerRef: 'intent-known' }));
    const status = jest.spyOn(provider, 'getStatus').mockRejectedValue(new Error('status unavailable'));
    const cancel = jest.spyOn(provider, 'cancel').mockResolvedValue({ status: 'canceled' });
    try {
      const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
      const paymentId = created.body.paymentId;
      expect((await agent.get(`/api/payments/${paymentId}`)).body.status).toBe('unknown');
      expect((await agent.get('/api/payments')).body[0].status).toBe('unknown');
      expect((await agent.post(`/api/payments/${paymentId}/cancel`)).status).toBe(502);
      expect(prisma.state.payments[0]).toMatchObject({ status: 'unknown', providerRef: 'intent-known' });
      expect((await agent.post('/api/sessions/sess1/checkout').send({})).status).toBe(409);
      expect((await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 })).status).toBe(409);
    } finally {
      create.mockRestore();
      status.mockRestore();
      cancel.mockRestore();
    }
  });

  test('a provider error cannot overwrite a concurrent confirmed reconciliation', async () => {
    const provider = require('../src/payments/fakeProvider');
    const create = jest.spyOn(provider, 'createCardPayment').mockImplementation(async () => {
      Object.assign(prisma.state.payments[0], { providerRef: 'intent-known', status: 'captured' });
      throw Object.assign(new Error('late reader error'), { providerRef: 'intent-known' });
    });
    try {
      expect((await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 })).status).toBe(502);
      expect(prisma.state.payments[0]).toMatchObject({ status: 'captured', providerRef: 'intent-known' });
    } finally {
      create.mockRestore();
    }
  });

  test('a failure recording the provider error retains the pending reservation and returns its reference', async () => {
    const provider = require('../src/payments/fakeProvider');
    const create = jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('reader error'), { providerRef: 'intent-known' }));
    const update = jest.spyOn(prisma.payment, 'update').mockRejectedValue(new Error('database unavailable'));
    try {
      const result = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
      expect(result.status).toBe(502);
      expect(result.body).toMatchObject({ providerRef: 'intent-known', paymentId: expect.any(String) });
      expect(prisma.state.payments[0]).toMatchObject({ status: 'pending' });
      expect((await agent.patch('/api/sessions/sess1/end')).status).toBe(409);
      expect((await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 })).status).toBe(409);
    } finally {
      create.mockRestore();
      update.mockRestore();
    }
  });

  test('rejects reuse of an idempotency key for a different amount', async () => {
    const first = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'shared-key' });
    expect(first.status).toBe(201);
    const conflict = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 600, idempotencyKey: 'shared-key' });
    expect(conflict.status).toBe(409);
    expect(conflict.body).toEqual({ error: 'idempotency_conflict' });
    expect(prisma.state.payments).toHaveLength(1);
  });

  test('listing payments does not treat an unverifiable provider status as failure', async () => {
    prisma.state.payments.push({ id: 'stale1', sessionId: 'sess1', method: 'card', provider: 'fake', providerRef: 'fake_unknown', status: 'presenting', amountCents: 1200, refundedCents: 0, createdAt: new Date() });
    const res = await agent.get('/api/payments');
    expect(res.status).toBe(200);
    const stale = res.body.find(p => p.id === 'stale1');
    expect(stale.status).toBe('presenting');
    expect(prisma.state.payments.find(p => p.id === 'stale1').status).toBe('presenting');
  });

  test('reconciliation reports terminal settlement availability', async () => {
    const res = await agent.get('/api/reports/reconciliation').query({ date: new Date().toISOString().slice(0, 10) });
    expect(res.status).toBe(200);
    expect(res.body.terminal).toEqual({ available: false });
  });

  test('polls a payment, cannot cancel captured ones, and refunds through the provider', async () => {
    const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
    const paymentId = created.body.paymentId;

    const fetched = await agent.get(`/api/payments/${paymentId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.method).toBe('card');

    const cancel = await agent.post(`/api/payments/${paymentId}/cancel`);
    expect(cancel.status).toBe(409);

    const refund = await agent.post(`/api/payments/${paymentId}/refund`).send({});
    expect(refund.status).toBe(200);
    expect(refund.body.status).toBe('refunded');
  });

  test('checkout attaches a captured card payment', async () => {
    const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
    const paymentId = created.body.paymentId;
    prisma.$transaction.mockClear();

    const res = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'card', paymentId }] });
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].method).toBe('card');
    const row = prisma.state.payments.find(p => p.id === paymentId);
    expect(row.receiptId).toBeTruthy();
  });

  test.each([0, 200])('checkout applies the net partially refunded card with a %i-cent discount and refunds only its remainder', async (discountCents) => {
    prisma.$queryRawUnsafe.mockImplementation(async (sql) => String(sql).includes('MAX(number)') ? [{ next: 1 }] : [{ base_hourly_cents: 1200, vat_rate_percent: 20 }]);
    const provider = require('../src/payments/fakeProvider');
    const refund = jest.spyOn(provider, 'refund');
    try {
      const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
      const paymentId = created.body.paymentId;
      const partial = await agent.post(`/api/payments/${paymentId}/refund`).send({ amountCents: 400 });
      expect(partial.status).toBe(200);
      expect(partial.body).toMatchObject({ amountCents: 1200, refundedCents: 400, status: 'partially_refunded', creditNote: null });
      const checkout = await agent.post('/api/sessions/sess1/checkout').send({ discountCents, payments: [{ method: 'card', paymentId, amountCents: 999999 }, { method: 'cash', amountCents: 400 - discountCents }] });
      expect(checkout.status).toBe(200);
      expect(checkout.body.totalTtcCents).toBe(1200 - discountCents);
      expect(checkout.body.payments.map(p => p.amountCents)).toEqual([800, 400 - discountCents]);
      expect(prisma.state.payments[0]).toMatchObject({ amountCents: 1200, refundedCents: 400, status: 'partially_refunded', receiptId: expect.any(String) });
      expect(prisma.state.creditNotes).toHaveLength(0);
      const overRefund = await agent.post(`/api/payments/${paymentId}/refund`).send({ amountCents: 801 });
      expect(overRefund.status).toBe(400);
      expect(overRefund.body).toMatchObject({ error: 'invalid_amount', remainingCents: 800 });
      const rest = await agent.post(`/api/payments/${paymentId}/refund`).send({});
      expect(rest.status).toBe(200);
      expect(rest.body).toMatchObject({ amountCents: 1200, refundedCents: 1200, status: 'refunded', creditNote: { totalTtcCents: 800 } });
      expect(refund.mock.calls.map(([args]) => args.amountCents)).toEqual([400, 800]);
      expect((await agent.post(`/api/payments/${paymentId}/refund`).send({})).status).toBe(409);
      expect(refund).toHaveBeenCalledTimes(2);
    } finally {
      refund.mockRestore();
    }
  });

  test('a net partially refunded card can pay the discounted total without cash', async () => {
    prisma.state.payments.push({ id: 'partial', sessionId: 'sess1', method: 'card', status: 'partially_refunded', amountCents: 1200, refundedCents: 400 });
    const result = await agent.post('/api/sessions/sess1/checkout').send({ discountCents: 400, payments: [{ method: 'card', paymentId: 'partial' }] });
    expect(result.status).toBe(200);
    expect(result.body.totalTtcCents).toBe(800);
    expect(result.body.payments[0].amountCents).toBe(800);
  });

  test('partially refunded cards cap subsequent captures at the remaining net balance', async () => {
    prisma.state.payments.push({ id: 'partial', sessionId: 'sess1', method: 'card', status: 'partially_refunded', amountCents: 1200, refundedCents: 400 });
    const over = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 401 });
    expect(over.status).toBe(400);
    expect(over.body).toMatchObject({ maxCents: 400 });
    const rest = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 400 });
    expect(rest.status).toBe(201);
    const checkout = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'card', paymentId: 'partial' }, { method: 'card', paymentId: rest.body.paymentId }] });
    expect(checkout.status).toBe(200);
    expect(checkout.body.payments.map(p => p.amountCents)).toEqual([800, 400]);
  });

  test.each([true, false])('unattached partially refunded funds cannot be omitted with POS enabled=%s', async (posEnabled) => {
    prisma.state.mockSettings.pos_enabled = String(posEnabled);
    prisma.state.payments.push({ id: 'partial', sessionId: 'sess1', method: 'card', status: 'partially_refunded', amountCents: 1200, refundedCents: 400 });
    const checkout = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'cash', amountCents: 1200 }] });
    expect(checkout.status).toBe(409);
    expect(checkout.body.error).toBe('card_payment_not_attached');
    expect(prisma.state.receipts).toHaveLength(0);
  });

  test.each([
    ['partially_refunded', 400, null, 409],
    ['captured', 0, null, 409],
    ['captured', 0, 'receipt', 200],
    ['partially_refunded', 400, 'receipt', 200],
    ['refunded', 1200, null, 200],
    ['canceled', 0, null, 200],
    ['unknown', 0, null, 409],
    ['presenting', 0, null, 409],
    ['failed', 0, null, 409],
  ])('/end handles %s card funds refunded=%i receipt=%s', async (status, refundedCents, receiptId, expectedStatus) => {
    prisma.state.mockSettings.pos_enabled = 'false';
    prisma.state.payments.push({ id: 'card', sessionId: 'sess1', method: 'card', status, amountCents: 1200, refundedCents, receiptId });
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'sess1', table_id: 't1' }]);
    const end = await agent.patch('/api/sessions/sess1/end');
    expect(end.status).toBe(expectedStatus);
    if (expectedStatus === 409) {
      expect(end.body.error).toBe('session_has_activity');
      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    }
  });

  test('partially refunded card validation rejects duplicate, reused, foreign and zero-net cards', async () => {
    const payment = { id: 'partial', sessionId: 'sess1', method: 'card', status: 'partially_refunded', amountCents: 1200, refundedCents: 400 };
    prisma.state.payments.push(payment);
    const makeRequest = (payments) => agent.post('/api/sessions/sess1/checkout').send({ payments });
    const card = { method: 'card', paymentId: 'partial' };
    expect((await makeRequest([card, card])).body.error).toBe('duplicate_payment');
    payment.receiptId = 'used';
    expect((await makeRequest([card])).body.error).toBe('payment_already_used');
    payment.receiptId = null;
    payment.sessionId = 'other';
    expect((await makeRequest([card])).body.error).toBe('invalid_payment');
    payment.sessionId = 'sess1';
    payment.refundedCents = 1200;
    expect((await makeRequest([card])).body.error).toBe('invalid_payment_amount');
    payment.status = 'refunded';
    expect((await makeRequest([card])).body.error).toBe('payment_not_captured');
    expect(prisma.state.receipts).toHaveLength(0);
  });

  test('checkout rejects card payments that are not captured or already used', async () => {
    const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
    const paymentId = created.body.paymentId;
    await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'card', paymentId }] });

    prisma.session.findUnique.mockResolvedValue(ACTIVE_SESSION());
    const reuse = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'card', paymentId }] });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error).toBe('payment_already_used');
  });

  test.each(['pending', 'presenting', 'unknown', 'failed', 'unrecognized'])('checkout blocks unresolved card status %s even when POS is disabled', async (status) => {
    prisma.state.payments.push({ id: 'unresolved', sessionId: 'sess1', method: 'card', status, amountCents: 1200 });
    prisma.state.mockSettings.pos_enabled = 'false';
    const checkout = await agent.post('/api/sessions/sess1/checkout').send({});
    expect(checkout.status).toBe(409);
    expect(checkout.body.error).toBe('payment_reconciliation_required');
    expect(prisma.state.receipts).toHaveLength(0);
  });

  test('a captured card must be attached once and limits subsequent card charges', async () => {
    const first = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 600, idempotencyKey: 'split-1' });
    expect(first.status).toBe(201);
    const over = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'split-over' });
    expect(over.status).toBe(400);
    expect(over.body).toMatchObject({ error: 'amount_exceeds_total', maxCents: 600 });
    const omitted = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'cash', amountCents: 1200 }] });
    expect(omitted.status).toBe(409);
    expect(omitted.body.error).toBe('card_payment_not_attached');
    const duplicate = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'card', paymentId: first.body.paymentId }, { method: 'card', paymentId: first.body.paymentId }] });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.error).toBe('duplicate_payment');
    const second = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 600, idempotencyKey: 'split-2' });
    expect(second.status).toBe(201);
    const checkout = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'card', paymentId: first.body.paymentId }, { method: 'card', paymentId: second.body.paymentId }] });
    expect(checkout.status).toBe(200);
  });

  test('idempotent retry returns the original payment even after session end or total changes', async () => {
    const first = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'stable-key' });
    prisma.session.findUnique.mockResolvedValue({ ...ACTIVE_SESSION(), status: 'ended' });
    const retry = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'stable-key' });
    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ paymentId: first.body.paymentId, duplicate: true });
  });

  test('cancel requires a confirmed provider status', async () => {
    const provider = require('../src/payments/fakeProvider');
    prisma.state.payments.push({ id: 'pending', sessionId: 'sess1', method: 'card', provider: 'fake', providerRef: 'ref', status: 'presenting', amountCents: 1200 });
    const cancel = jest.spyOn(provider, 'cancel').mockRejectedValue(new Error('timeout'));
    const status = jest.spyOn(provider, 'getStatus').mockRejectedValue(new Error('timeout'));
    try {
      const result = await agent.post('/api/payments/pending/cancel');
      expect(result.status).toBe(502);
      expect(result.body.error).toBe('payment_reconciliation_required');
      expect(prisma.state.payments[0].status).toBe('presenting');
    } finally {
      cancel.mockRestore();
      status.mockRestore();
    }
  });

  test('provider replies without a usable reference remain unresolved', async () => {
    const provider = require('../src/payments/fakeProvider');
    const spy = jest.spyOn(provider, 'createCardPayment').mockResolvedValue({ status: 'captured' });
    try {
      const result = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200, idempotencyKey: 'no-ref' });
      expect(result.status).toBe(502);
      expect(prisma.state.payments[0].status).toBe('unknown');
      expect((await agent.post('/api/payments/pay1/cancel')).status).toBe(409);
      expect((await agent.post('/api/sessions/sess1/checkout').send({})).status).toBe(409);
    } finally {
      spy.mockRestore();
    }
  });

  test.each(['canceled', 'captured'])('cancel records only a provider-confirmed %s status', async (liveStatus) => {
    const provider = require('../src/payments/fakeProvider');
    prisma.state.payments.push({ id: 'pending', sessionId: 'sess1', method: 'card', provider: 'fake', providerRef: 'ref', status: 'presenting', amountCents: 1200 });
    const cancel = jest.spyOn(provider, 'cancel').mockResolvedValue({ status: 'canceled' });
    const status = jest.spyOn(provider, 'getStatus').mockResolvedValue({ status: liveStatus });
    try {
      const result = await agent.post('/api/payments/pending/cancel');
      expect(result.status).toBe(200);
      expect(result.body.status).toBe(liveStatus);
      expect(prisma.state.payments[0].status).toBe(liveStatus);
    } finally {
      cancel.mockRestore();
      status.mockRestore();
    }
  });

  test('stripe webhook reconciles an unknown reservation using verified intent metadata', async () => {
    process.env.PAYMENT_PROVIDER = '';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    prisma.state.payments.push({ id: 'unknown', sessionId: 'sess1', method: 'card', provider: 'stripe', providerRef: null, idempotencyKey: 'reference', status: 'unknown', amountCents: 1200 });
    const Stripe = require('stripe');
    const stripe = new Stripe('sk_test_123');
    const payload = JSON.stringify({ id: 'evt_reconcile', type: 'payment_intent.succeeded', data: { object: { object: 'payment_intent', id: 'pi_reconcile', status: 'succeeded', amount: 1200, metadata: { reference: 'reference' } } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });
    const result = await request(app).post('/api/webhooks/stripe').set('Content-Type', 'application/json').set('stripe-signature', signature).send(payload);
    expect(result.status).toBe(200);
    expect(prisma.state.payments[0]).toMatchObject({ status: 'captured', providerRef: 'pi_reconcile' });
    const duplicate = await request(app).post('/api/webhooks/stripe').set('Content-Type', 'application/json').set('stripe-signature', signature).send(payload);
    expect(duplicate.body.duplicate).toBe(true);
  });

  test.each([null, '', '   ', 123, {}])('provider error with unusable reference %p remains unresolved without guessing', async (providerRef) => {
    const provider = require('../src/payments/fakeProvider');
    const create = jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('reader error'), { providerRef }));
    try {
      const result = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
      expect(result.status).toBe(502);
      expect(result.body.providerRef).toBeUndefined();
      expect(prisma.state.payments[0]).toMatchObject({ status: 'unknown', providerRef: null });
      expect((await agent.post(`/api/payments/${result.body.paymentId}/cancel`)).status).toBe(409);
    } finally {
      create.mockRestore();
    }
  });

  test('refunds require a card reference and serialize cumulative refund amounts', async () => {
    serializeTransactions();
    const provider = require('../src/payments/fakeProvider');
    const refund = jest.spyOn(provider, 'refund');
    try {
      prisma.state.payments.push({ id: 'partial', sessionId: 'sess1', method: 'card', provider: 'fake', status: 'partially_refunded', amountCents: 1200, refundedCents: 400 });
      expect((await agent.post('/api/payments/partial/refund').send({})).body.error).toBe('payment_reconciliation_required');
      expect(refund).not.toHaveBeenCalled();
      prisma.state.payments[0].providerRef = 'intent-known';
      const results = await Promise.all([agent.post('/api/payments/partial/refund').send({}), agent.post('/api/payments/partial/refund').send({})]);
      expect(results.map(r => r.status).sort()).toEqual([200, 409]);
      expect(refund).toHaveBeenCalledTimes(1);
      expect(refund).toHaveBeenCalledWith(expect.objectContaining({ providerRef: 'intent-known', amountCents: 800, reference: expect.any(String), createdAt: expect.any(String) }));
      expect(prisma.state.payments[0].refundedCents).toBe(1200);
    } finally {
      refund.mockRestore();
    }
  });

  test('provider refund failures leave partial funds and accounting unchanged', async () => {
    const provider = require('../src/payments/fakeProvider');
    const refund = jest.spyOn(provider, 'refund').mockRejectedValue(new Error('refund unavailable'));
    prisma.state.payments.push({ id: 'partial', sessionId: 'sess1', method: 'card', provider: 'fake', providerRef: 'intent-known', status: 'partially_refunded', amountCents: 1200, refundedCents: 400 });
    try {
      const result = await agent.post('/api/payments/partial/refund').send({ amountCents: 200 });
      expect(result.status).toBe(502);
      expect(prisma.state.payments[0]).toMatchObject({ status: 'partially_refunded', refundedCents: 400 });
      expect(prisma.state.creditNotes).toHaveLength(0);
      expect((await agent.patch('/api/sessions/sess1/end')).status).toBe(409);
    } finally {
      refund.mockRestore();
    }
  });

  test.each([true, false])('only definitive intent absence releases the session: %s', async (noRemoteObject) => {
    const provider = require('../src/payments/fakeProvider');
    const create = jest.spyOn(provider, 'createCardPayment').mockRejectedValue(Object.assign(new Error('rejected'), { noRemoteObject }));
    try {
      const result = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
      expect(result.status).toBe(502);
      expect(prisma.state.payments[0].status).toBe(noRemoteObject ? 'creation_rejected' : 'unknown');
      expect((await agent.patch('/api/sessions/sess1/end')).status).toBe(noRemoteObject ? 200 : 409);
    } finally { create.mockRestore(); }
  });

  test.each(['pending', 'failed'])('refund %s does not book money or credit notes and retries the same operation', async (status) => {
    serializeTransactions();
    const provider = require('../src/payments/fakeProvider');
    const refund = jest.spyOn(provider, 'refund').mockResolvedValue({ status, providerRefundRef: 're_pending' });
    const retrieve = jest.spyOn(provider, 'getRefund').mockResolvedValue({ status: 'refunded', providerRefundRef: 're_pending', amountCents: 400 });
    prisma.state.payments.push({ id: 'paid', sessionId: 'sess1', method: 'card', provider: 'fake', providerRef: 'pi_paid', status: 'captured', amountCents: 1200, refundedCents: 0, receiptId: 'receipt' });
    prisma.state.receipts.push({ id: 'receipt', sessionId: 'sess1', itemsJson: JSON.stringify([{ totalCents: 1200, vatRatePercent: 20 }]) });
    try {
      const response = await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'refund-key' });
      expect(response.status).toBe(status === 'pending' ? 409 : 502);
      expect(response.body).toMatchObject({ refundStatus: status, status: 'captured', refundedCents: 0, refundPending: status === 'pending', creditNote: null });
      expect(prisma.state.creditNotes).toHaveLength(0);
      const retry = await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'refund-key' });
      expect(retry.body.refundId).toBe(response.body.refundId);
      expect(retry.body.refundedCents).toBe(status === 'pending' ? 400 : 0);
      expect(prisma.state.creditNotes).toHaveLength(status === 'pending' ? 1 : 0);
      await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'refund-key' });
      expect(prisma.state.creditNotes).toHaveLength(status === 'pending' ? 1 : 0);
      expect(refund).toHaveBeenCalledTimes(1);
      expect((await agent.post('/api/payments/paid/refund').send({ amountCents: 500, idempotencyKey: 'refund-key' })).status).toBe(409);
    } finally { refund.mockRestore(); retrieve.mockRestore(); }
  });

  test('unknown refund holds funds through polling and can reconcile without another reservation', async () => {
    const provider = require('../src/payments/fakeProvider');
    const created = await agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
    const id = created.body.paymentId;
    const refund = jest.spyOn(provider, 'refund').mockRejectedValueOnce(new Error('response lost')).mockResolvedValue({ status: 'refunded', providerRefundRef: 're_once' });
    const retrieve = jest.spyOn(provider, 'getRefund').mockResolvedValue(null);
    try {
      const failed = await agent.post(`/api/payments/${id}/refund`).send({ amountCents: 400 });
      expect(failed.status).toBe(502);
      const operation = JSON.parse(prisma.state.payments[0].refundOperationsJson)[0];
      expect(operation).toMatchObject({ reference: failed.body.refundId, status: 'unknown', amountCents: 400 });
      expect((await agent.get(`/api/payments/${id}`)).body).toMatchObject({ refundedCents: 0, refundPending: true });
      expect((await agent.post('/api/sessions/sess1/checkout').send({})).status).toBe(409);
      expect((await agent.post(`/api/payments/${id}/cancel`)).status).toBe(409);
      expect((await agent.post(`/api/payments/${id}/refund`).send({ amountCents: 400 })).status).toBe(409);
      const recovered = await agent.post(`/api/payments/${id}/refunds/${operation.reference}/reconcile`).send({});
      expect(recovered.body).toMatchObject({ refundedCents: 400, refundStatus: 'refunded', refundPending: false });
      expect(refund.mock.calls[0][0].reference).toBe(refund.mock.calls[1][0].reference);
      expect(JSON.parse(prisma.state.payments[0].refundOperationsJson)).toHaveLength(1);
    } finally { refund.mockRestore(); retrieve.mockRestore(); }
  });

  test('refund webhook retrieves authoritative status, books once and ignores stale events', async () => {
    process.env.PAYMENT_PROVIDER = '';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const { getCardProvider } = require('../src/payments/provider');
    const provider = getCardProvider();
    const operation = { reference: 'refund-reservation', amountCents: 400, status: 'unknown', createdAt: new Date().toISOString() };
    prisma.state.payments.push({ id: 'paid', sessionId: 'sess1', method: 'card', provider: 'stripe', providerRef: 'pi_paid', status: 'captured', amountCents: 1200, refundedCents: 0, receiptId: 'receipt', refundOperationsJson: JSON.stringify([operation]) });
    prisma.state.receipts.push({ id: 'receipt', itemsJson: JSON.stringify([{ totalCents: 1200, vatRatePercent: 20 }]) });
    const retrieve = jest.spyOn(provider, 'getRefund').mockResolvedValue({ status: 'refunded', providerRefundRef: 're_once', amountCents: 400, providerRef: 'pi_paid', reference: operation.reference });
    const stripe = new (require('stripe'))('sk_test_123');
    async function webhook(id, status) {
      const payload = JSON.stringify({ id, type: 'refund.updated', data: { object: { id: 're_once', object: 'refund', payment_intent: 'pi_paid', amount: 400, status, metadata: { reference: operation.reference } } } });
      return request(app).post('/api/webhooks/stripe').set('Content-Type', 'application/json').set('stripe-signature', stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' })).send(payload);
    }
    try {
      expect((await webhook('evt_refund', 'pending')).status).toBe(200);
      expect(prisma.state.payments[0]).toMatchObject({ refundedCents: 400, status: 'partially_refunded' });
      expect((await webhook('evt_refund', 'pending')).body.duplicate).toBe(true);
      expect((await webhook('evt_stale', 'failed')).status).toBe(200);
      expect(prisma.state.creditNotes).toHaveLength(1);
      expect(retrieve).toHaveBeenCalledTimes(1);
      expect(prisma.state.payments[0].refundedCents).toBe(400);
    } finally { retrieve.mockRestore(); }
  });

  test('cash checkout still works with explicit splits and rejects mismatches', async () => {
    const mismatch = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'cash', amountCents: 100 }] });
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error).toBe('payment_mismatch');

    const ok = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'cash', amountCents: 600 }, { method: 'cash', amountCents: 600 }] });
    expect(ok.status).toBe(200);
    expect(ok.body.payments).toHaveLength(2);
  });

  test('stripe webhook verifies signatures, is idempotent and updates statuses', async () => {
    // Switch to the Stripe provider for this test.
    process.env.PAYMENT_PROVIDER = '';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    prisma.state.payments.push({ id: 'payPI', sessionId: 'sess1', method: 'card', provider: 'stripe', providerRef: 'pi_123', status: 'presenting', amountCents: 1200, refundedCents: 0, createdAt: new Date() });

    const Stripe = require('stripe');
    const stripe = new Stripe('sk_test_123');
    const payload = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded', data: { object: { object: 'payment_intent', id: 'pi_123', status: 'succeeded' } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_test' });

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);
    expect(res.status).toBe(200);
    expect(prisma.state.payments.find(p => p.id === 'payPI').status).toBe('captured');

    const duplicate = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', signature)
      .send(payload);
    expect(duplicate.body.duplicate).toBe(true);

    const bad = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'bad_signature')
      .send(payload);
    expect(bad.status).toBe(400);
  });

  test('cancellation blocks the committed reservation while the provider call is running', async () => {
    serializeTransactions();
    const provider = require('../src/payments/fakeProvider');
    const createCardPayment = provider.createCardPayment;
    let releaseProvider;
    let providerStarted;
    const providerGate = new Promise(resolve => { releaseProvider = resolve; });
    const started = new Promise(resolve => { providerStarted = resolve; });
    const events = [];
    prisma.$executeRawUnsafe.mockImplementation(async (sql) => {
      if (String(sql).includes('pg_advisory_xact_lock')) events.push('lock');
      return {};
    });
    const spy = jest.spyOn(provider, 'createCardPayment').mockImplementation(async (args) => {
      events.push('provider');
      providerStarted();
      await providerGate;
      return createCardPayment(args);
    });

    try {
      const cardRequest = agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
      await Promise.race([started, cardRequest]);
      const cancel = await agent.post('/api/sessions/sess1/cancel');
      expect(cancel.status).toBe(409);
      expect(cancel.body).toEqual({ error: 'session_has_activity' });
      expect(prisma.state.payments[0].status).toBe('pending');
      releaseProvider();
      const card = await cardRequest;

      expect(card.status).toBe(201);
      expect(events.slice(0, 3)).toEqual(['lock', 'lock', 'provider']);
      expect(prisma.state.payments).toHaveLength(1);
      expect(prisma.session.update).not.toHaveBeenCalled();
    } finally {
      releaseProvider();
      spy.mockRestore();
    }
  });

  test('card creation waits for cancellation and does not call the provider afterwards', async () => {
    serializeTransactions();
    const provider = require('../src/payments/fakeProvider');
    const session = ACTIVE_SESSION();
    prisma.session.findUnique.mockImplementation(async () => session);
    let releaseCancellation;
    let cancellationStarted;
    const cancellationGate = new Promise(resolve => { releaseCancellation = resolve; });
    const started = new Promise(resolve => { cancellationStarted = resolve; });
    prisma.session.update.mockImplementation(async ({ data }) => {
      cancellationStarted();
      await cancellationGate;
      Object.assign(session, data);
      return session;
    });
    const spy = jest.spyOn(provider, 'createCardPayment');

    try {
      const cancelRequest = agent.post('/api/sessions/sess1/cancel');
      await Promise.race([started, cancelRequest]);
      const cardRequest = agent.post('/api/payments/card').send({ sessionId: 'sess1', amountCents: 1200 });
      releaseCancellation();
      const [cancel, card] = await Promise.all([cancelRequest, cardRequest]);

      expect(cancel.status).toBe(200);
      expect(card.status).toBe(409);
      expect(card.body).toEqual({ error: 'session_not_active' });
      expect(spy).not.toHaveBeenCalled();
      expect(prisma.state.payments).toHaveLength(0);
      expect(session.pin).toBeNull();
    } finally {
      releaseCancellation();
      spy.mockRestore();
    }
  });
});
