const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

const ACTIVE_SESSION = () => ({ id: 'sess1', status: 'active', tableId: 't1', startedAt: new Date(Date.now() - 60000), numberOfPlayers: 2 });

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
    prisma.state.paymentEvents = [];
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma.__makeTx()));
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

  test('listing payments syncs stale presenting card payments', async () => {
    prisma.state.payments.push({ id: 'stale1', sessionId: 'sess1', method: 'card', provider: 'fake', providerRef: 'fake_unknown', status: 'presenting', amountCents: 1200, refundedCents: 0, createdAt: new Date() });
    const res = await agent.get('/api/payments');
    expect(res.status).toBe(200);
    const stale = res.body.find(p => p.id === 'stale1');
    expect(stale.status).toBe('failed');
    expect(prisma.state.payments.find(p => p.id === 'stale1').status).toBe('failed');
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

    const res = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'card', paymentId }] });
    expect(res.status).toBe(200);
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].method).toBe('card');
    const row = prisma.state.payments.find(p => p.id === paymentId);
    expect(row.receiptId).toBeTruthy();
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
});
