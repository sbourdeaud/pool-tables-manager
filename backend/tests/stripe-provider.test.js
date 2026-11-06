jest.mock('stripe', () => jest.fn());
jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));

const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');
const prisma = require('../src/prismaClient');
const app = require('../server');
const { getCardProvider } = require('../src/payments/provider');
const Stripe = require('stripe');
const { createStripeProvider } = require('../src/payments/stripeProvider');

describe('Stripe Terminal intent creation', () => {
  const originalEnv = { ...process.env };
  let stripe;
  let provider;

  beforeEach(() => {
    process.env.STRIPE_TERMINAL_READER_ID = 'tmr_test';
    stripe = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_payment_method' }),
        retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded', amount: 1200, currency: 'eur', metadata: { reference: 'reservation-key' } }),
      },
      refunds: { create: jest.fn(), retrieve: jest.fn(), list: jest.fn().mockImplementation(() => (async function* () {})()) },
      terminal: { readers: { processPaymentIntent: jest.fn().mockResolvedValue({}) } },
    };
    Stripe.mockImplementation(() => stripe);
    provider = createStripeProvider('sk_test');
  });

  afterAll(() => { process.env = originalEnv; });

  test('uses the reservation key for both idempotency and reconciliation metadata', async () => {
    await expect(provider.createCardPayment({ amountCents: 1200, currency: '€', reference: 'reservation-key' })).resolves.toEqual({ providerRef: 'pi_test', status: 'presenting' });
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith({ amount: 1200, currency: 'eur', payment_method_types: ['card_present'], capture_method: 'automatic', metadata: { reference: 'reservation-key' } }, { idempotencyKey: 'reservation-key', maxNetworkRetries: 0 });
    expect(stripe.terminal.readers.processPaymentIntent).toHaveBeenCalledWith('tmr_test', 'pi_test');
  });

  test.each(['reader_busy', undefined])('reader processing failure preserves intent reference and cause (%s)', async (code) => {
    const cause = Object.assign(new Error('reader request lost'), { code });
    stripe.terminal.readers.processPaymentIntent.mockRejectedValue(cause);
    await expect(provider.createCardPayment({ amountCents: 1200, currency: 'EUR', reference: 'reservation-key' })).rejects.toMatchObject({ providerRef: 'pi_test', code: code || 'reader_processing_failed', cause });
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  });

  test('failure before intent creation never invents an intent reference', async () => {
    const error = new Error('creation timed out');
    stripe.paymentIntents.create.mockRejectedValue(error);
    await expect(provider.createCardPayment({ amountCents: 1200, currency: 'EUR' })).rejects.toBe(error);
    expect(error.providerRef).toBeUndefined();
    expect(stripe.terminal.readers.processPaymentIntent).not.toHaveBeenCalled();
  });

  test.each([
    ['StripeInvalidRequestError', 400, true],
    ['StripeInvalidRequestError', 404, true],
    ['StripeAuthenticationError', 401, true],
    ['StripePermissionError', 403, true],
    ['StripeConnectionError', undefined, false],
    ['StripeAPIError', 500, false],
    ['StripeIdempotencyError', 400, false],
    ['StripeRateLimitError', 429, false],
    ['StripeCardError', 402, false],
  ])('classifies %s %s without guessing remote absence', async (type, statusCode, noRemoteObject) => {
    const error = Object.assign(new Error('Stripe error'), { type, statusCode });
    stripe.paymentIntents.create.mockRejectedValue(error);
    await expect(provider.createCardPayment({ amountCents: 1200, currency: 'EUR', reference: 'key' })).rejects.toMatchObject({ noRemoteObject });
  });

  test.each([
    { payment_intent: { id: 'pi_exists' } },
    { raw: { payment_intent: { id: 'pi_exists' } } },
    { headers: { 'stripe-should-retry': 'true' } },
    { code: 'idempotency_key_in_use' },
  ])('does not classify ambiguous rejection as remote absence: %p', async (details) => {
    stripe.paymentIntents.create.mockRejectedValue(Object.assign(new Error('error'), { type: 'StripeInvalidRequestError', statusCode: 400, ...details }));
    await expect(provider.createCardPayment({ amountCents: 1200 })).rejects.toMatchObject({ noRemoteObject: false });
  });

  test.each(['pending', 'requires_action', 'succeeded', 'failed', 'canceled'])('refund maps Stripe %s and uses durable metadata and idempotency', async (status) => {
    stripe.refunds.create.mockResolvedValue({ id: 're_test', status, amount: 400, payment_intent: 'pi_test', metadata: { reference: 'refund-key' } });
    const args = { providerRef: 'pi_test', amountCents: 400, reference: 'refund-key', createdAt: new Date().toISOString() };
    expect(await provider.refund(args)).toMatchObject({ providerRefundRef: 're_test', amountCents: 400, status: status === 'succeeded' ? 'refunded' : ['failed', 'canceled'].includes(status) ? 'failed' : 'pending' });
    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_test', amount: 400, metadata: { reference: 'refund-key' } }, { idempotencyKey: 'refund-key', maxNetworkRetries: 0 });
  });

  test.each([
    [{ type: 'StripeInvalidRequestError', statusCode: 400 }, true],
    [{ type: 'StripeInvalidRequestError', statusCode: 404 }, true],
    [{ type: 'StripeAuthenticationError', statusCode: 401 }, true],
    [{ type: 'StripePermissionError', statusCode: 403 }, true],
    [{ type: 'StripeConnectionError' }, false],
    [{ type: 'StripeAPIError', statusCode: 500 }, false],
    [{ type: 'StripeRateLimitError', statusCode: 429 }, false],
    [{ type: 'StripeIdempotencyError', statusCode: 400 }, false],
    [{ type: 'StripeCardError', statusCode: 402 }, false],
    [{ type: 'StripeInvalidRequestError', statusCode: 400, code: 'idempotency_key_in_use' }, false],
    [{ type: 'StripeInvalidRequestError', statusCode: 400, code: 'idempotency_key_mismatch' }, false],
    [{ type: 'StripeInvalidRequestError', statusCode: 400, headers: { 'stripe-should-retry': 'true' } }, false],
    [{ type: 'StripeInvalidRequestError', statusCode: 400, refund: { id: 're_existing' } }, false],
    [{ type: 'StripeInvalidRequestError', statusCode: 400, raw: { refund: { id: 're_existing' } } }, false],
    [{ type: 'StripeInvalidRequestError', statusCode: 400, payment_intent: { id: 'pi_test' } }, false],
    [{ type: 'StripeInvalidRequestError', statusCode: 400, raw: { payment_intent: { id: 'pi_test' } } }, false],
  ])('refund creation rejection %p classifies absence as %s', async (details, noRemoteObject) => {
    const error = Object.assign(new Error('Stripe refund error'), details);
    stripe.refunds.create.mockRejectedValue(error);
    await expect(provider.refund({ providerRef: 'pi_test', amountCents: 400, reference: 'key', createdAt: new Date().toISOString() })).rejects.toMatchObject({ noRemoteObject });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
  });

  test.each(['list', 'retrieve'])('refund %s failures cannot establish that no refund exists', async (method) => {
    const error = Object.assign(new Error('lookup rejected'), { type: 'StripeInvalidRequestError', statusCode: 400, noRemoteObject: true });
    if (method === 'list') stripe.refunds.list.mockImplementation(() => (async function* () { yield await Promise.reject(error); })());
    else stripe.refunds.retrieve.mockRejectedValue(error);
    const args = { providerRef: 'pi_test', amountCents: 400, reference: 'key', createdAt: new Date().toISOString() };
    await expect(method === 'list' ? provider.refund(args) : provider.getRefund({ ...args, providerRefundRef: 're_existing' })).rejects.toMatchObject({ noRemoteObject: false });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  test.each([undefined, 'invalid', new Date(Date.now() + 60000).toISOString()])('invalid reservation date %s cannot create a new refund', async (createdAt) => {
    await expect(provider.refund({ providerRef: 'pi_test', amountCents: 400, reference: 'key', createdAt })).rejects.toThrow('refund_reconciliation_required');
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  test('malformed Stripe success is not treated as confirmed', async () => {
    stripe.refunds.create.mockResolvedValue({ status: 'succeeded' });
    await expect(provider.refund({ providerRef: 'pi_test', amountCents: 400, reference: 'key', createdAt: new Date().toISOString() })).rejects.toThrow('invalid_refund_response');
  });

  test('expired unknown refund never creates another refund', async () => {
    await expect(provider.refund({ providerRef: 'pi_test', amountCents: 400, reference: 'old-key', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })).rejects.toThrow('refund_reconciliation_required');
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  test('lost responses reconcile by metadata across pages without another create even after expiry', async () => {
    stripe.refunds.list.mockImplementation(() => (async function* () {
      yield { id: 'other', metadata: {} };
      yield { id: 're_original', status: 'succeeded', amount: 400, payment_intent: 'pi_test', metadata: { reference: 'old-key' } };
    })());
    await expect(provider.refund({ providerRef: 'pi_test', amountCents: 400, reference: 'old-key', createdAt: '2020-01-01T00:00:00Z' })).resolves.toMatchObject({ status: 'refunded', providerRefundRef: 're_original' });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(stripe.refunds.list).toHaveBeenCalledWith({ payment_intent: 'pi_test', limit: 100 });
  });

  test('refund lookup errors never fall through to create', async () => {
    stripe.refunds.list.mockImplementation(() => (async function* () { yield await Promise.reject(new Error('network')); })());
    await expect(provider.refund({ providerRef: 'pi_test', amountCents: 400, reference: 'key', createdAt: new Date().toISOString() })).rejects.toThrow('network');
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  test('recovery replays identical creation parameters but retrieves fresh status without dispatching the reader', async () => {
    const args = { amountCents: 1200, currency: '€', reference: 'reservation-key', createdAt: new Date().toISOString() };
    await expect(provider.reconcileCardPayment(args)).resolves.toEqual({ providerRef: 'pi_test', status: 'captured' });
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith({ amount: 1200, currency: 'eur', payment_method_types: ['card_present'], capture_method: 'automatic', metadata: { reference: 'reservation-key' } }, { idempotencyKey: 'reservation-key', maxNetworkRetries: 0 });
    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test');
    expect(stripe.terminal.readers.processPaymentIntent).not.toHaveBeenCalled();
  });

  test.each([undefined, 'invalid', new Date(Date.now() + 60000).toISOString(), new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()])('recovery refuses unsafe reservation age %s without a remote mutation', async (createdAt) => {
    await expect(provider.reconcileCardPayment({ amountCents: 1200, currency: 'EUR', reference: 'reservation-key', createdAt })).rejects.toThrow('payment_reconciliation_required');
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  test('old reservations can only be linked by validated provider confirmation, never by replay', async () => {
    await expect(provider.reconcileCardPayment({ amountCents: 1200, currency: 'EUR', reference: 'reservation-key', createdAt: '2020-01-01', providerRef: 'pi_test' })).resolves.toEqual({ providerRef: 'pi_test', status: 'captured' });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  test.each([
    { amount: 1300 }, { currency: 'usd' }, { metadata: { reference: 'other' } }, { id: 'pi_other' }, { status: 'unrecognized' },
  ])('recovery rejects inconsistent provider evidence %p', async (changes) => {
    stripe.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_test', status: 'succeeded', amount: 1200, currency: 'eur', metadata: { reference: 'reservation-key' }, ...changes });
    await expect(provider.reconcileCardPayment({ amountCents: 1200, currency: 'EUR', reference: 'reservation-key', providerRef: 'pi_test' })).rejects.toThrow('payment_reconciliation_required');
  });

  test('cached 500 and concurrent-key conflicts remain ambiguous during recovery', async () => {
    for(const error of [Object.assign(new Error('cached 500'), { type: 'StripeAPIError', statusCode: 500 }), Object.assign(new Error('in use'), { code: 'idempotency_key_in_use' })]) {
      stripe.paymentIntents.create.mockRejectedValue(error);
      await expect(provider.reconcileCardPayment({ amountCents: 1200, currency: 'EUR', reference: 'reservation-key', createdAt: new Date().toISOString() })).rejects.toBe(error);
    }
    expect(stripe.terminal.readers.processPaymentIntent).not.toHaveBeenCalled();
  });

  test('unconfigured reader never creates an intent', async () => {
    delete process.env.STRIPE_TERMINAL_READER_ID;
    provider = createStripeProvider('sk_test');
    await expect(provider.createCardPayment({ amountCents: 1200, currency: 'EUR' })).rejects.toMatchObject({ code: 'reader_not_configured' });
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
  });
});

describe('Stripe refund reconciliation through the payment API', () => {
  const originalEnv = { ...process.env };
  const agent = request.agent(app);
  let stripe;

  beforeEach(() => {
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    setupAuthBypass(prisma);
    prisma.$transaction.mockImplementation(async fn => fn(prisma));
    prisma.state.mockSettings = { pos_enabled: 'true', currency: '€' };
    prisma.state.payments = [{ id: 'paid', sessionId: 'sess1', method: 'card', provider: 'stripe', providerRef: 'pi_paid', status: 'captured', amountCents: 1200, refundedCents: 0 }];
    prisma.state.receipts = [];
    prisma.state.creditNotes = [];
    prisma.session.findUnique.mockResolvedValue({ id: 'sess1', status: 'active', tableId: 't1', startedAt: new Date(Date.now() - 60000), numberOfPlayers: 2 });
    prisma.$queryRawUnsafe.mockResolvedValue([{ base_hourly_cents: 1200, vat_rate_percent: 20 }]);
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    stripe = { refunds: { create: jest.fn(), retrieve: jest.fn(), list: jest.fn().mockImplementation(() => (async function* () {})()) } };
    Stripe.mockImplementation(() => stripe);
    process.env.PAYMENT_PROVIDER = 'fake';
    getCardProvider();
    process.env.PAYMENT_PROVIDER = '';
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    process.env.STRIPE_TERMINAL_READER_ID = 'tmr_test';
  });

  afterAll(() => { process.env = originalEnv; });

  test('definitive rejection releases the reservation, preserves accounting, and permits a new keyed refund', async () => {
    prisma.state.payments[0].receiptId = 'receipt';
    prisma.state.receipts.push({ id: 'receipt', sessionId: 'sess1', itemsJson: JSON.stringify([{ totalCents: 1200, vatRatePercent: 20 }]) });
    stripe.refunds.create.mockImplementation(async args => ({ id: 're_new', status: 'succeeded', amount: args.amount, payment_intent: args.payment_intent, metadata: args.metadata }));
    stripe.refunds.create.mockRejectedValueOnce(Object.assign(new Error('invalid refund'), { type: 'StripeInvalidRequestError', statusCode: 400 }));

    const first = await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'failed-key' });
    expect(first.status).toBe(502);
    expect(first.body).toMatchObject({ error: 'refund_failed', refundStatus: 'failed', refundedCents: 0, refundPending: false, creditNote: null });
    expect(prisma.state.creditNotes).toHaveLength(0);
    const same = await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'failed-key' });
    expect(same.body).toMatchObject({ refundId: first.body.refundId, refundStatus: 'failed', refundedCents: 0 });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect((await agent.post(`/api/payments/paid/refunds/${first.body.refundId}/reconcile`).send({})).body.refundStatus).toBe('failed');
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    const next = await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'new-key' });
    expect(next.status).toBe(200);
    expect(next.body).toMatchObject({ refundStatus: 'refunded', refundedCents: 400, creditNote: { totalTtcCents: 400 } });
    expect(next.body.refundId).not.toBe(first.body.refundId);
    expect(prisma.state.creditNotes).toHaveLength(1);
    expect(JSON.parse(prisma.state.payments[0].refundOperationsJson)).toHaveLength(2);
  });

  test('an ambiguous refund blocks checkout and new reservations until the original refund is reconciled', async () => {
    stripe.refunds.create.mockRejectedValue(Object.assign(new Error('connection lost'), { type: 'StripeConnectionError' }));
    const first = await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'network-key' });
    expect(first.status).toBe(502);
    expect(first.body.error).toBe('refund_reconciliation_required');
    expect(JSON.parse(prisma.state.payments[0].refundOperationsJson)[0]).toMatchObject({ reference: first.body.refundId, status: 'unknown' });
    expect((await agent.post('/api/sessions/sess1/checkout').send({})).body.error).toBe('payment_reconciliation_required');
    expect((await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'other-key' })).body.error).toBe('refund_reconciliation_required');
    const retry = await agent.post('/api/payments/paid/refund').send({ amountCents: 400, idempotencyKey: 'network-key' });
    expect(retry.body.refundId).toBe(first.body.refundId);
    expect(stripe.refunds.create.mock.calls.map(call => call[1].idempotencyKey)).toEqual([first.body.refundId, first.body.refundId]);
    expect(prisma.state.creditNotes).toHaveLength(0);
    stripe.refunds.list.mockImplementation(() => (async function* () {
      yield { id: 're_original', status: 'succeeded', amount: 400, payment_intent: 'pi_paid', metadata: { reference: first.body.refundId } };
    })());
    const reconciled = await agent.post(`/api/payments/paid/refunds/${first.body.refundId}/reconcile`).send({});
    expect(reconciled.body).toMatchObject({ refundStatus: 'refunded', refundedCents: 400, refundPending: false });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(2);
    expect(JSON.parse(prisma.state.payments[0].refundOperationsJson)).toHaveLength(1);
    const checkout = await agent.post('/api/sessions/sess1/checkout').send({ payments: [{ method: 'card', paymentId: 'paid' }, { method: 'cash', amountCents: 400 }] });
    expect(checkout.status).toBe(200);
  });

  test('an explicit reconciliation can record a definitive create rejection without booking it', async () => {
    const operation = { reference: 'reserved-refund', idempotencyKey: 'reserved-key', amountCents: 400, status: 'unknown', createdAt: new Date().toISOString() };
    prisma.state.payments[0].refundOperationsJson = JSON.stringify([operation]);
    stripe.refunds.create.mockRejectedValue(Object.assign(new Error('invalid refund'), { type: 'StripeInvalidRequestError', statusCode: 400 }));
    const result = await agent.post('/api/payments/paid/refunds/reserved-refund/reconcile').send({});
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ error: 'refund_failed', refundStatus: 'failed', refundedCents: 0, refundPending: false });
    expect(prisma.state.creditNotes).toHaveLength(0);
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect((await agent.post('/api/payments/paid/refunds/reserved-refund/reconcile').send({})).body.refundStatus).toBe('failed');
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
  });

  test('a failed retrieval cannot release a reservation with a known Stripe refund', async () => {
    prisma.state.payments[0].refundOperationsJson = JSON.stringify([{ reference: 'reserved-refund', amountCents: 400, status: 'pending', providerRefundRef: 're_known', createdAt: new Date().toISOString() }]);
    stripe.refunds.retrieve.mockRejectedValue(Object.assign(new Error('not found'), { type: 'StripeInvalidRequestError', statusCode: 404, noRemoteObject: true }));
    const result = await agent.post('/api/payments/paid/refunds/reserved-refund/reconcile').send({});
    expect(result.body.error).toBe('refund_reconciliation_required');
    expect(JSON.parse(prisma.state.payments[0].refundOperationsJson)[0]).toMatchObject({ status: 'unknown', providerRefundRef: 're_known' });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });
});
