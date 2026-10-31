const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('POS payments (optional feature)', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    prisma.state.mockSettings = { pos_enabled: 'true', currency: '€' };
    prisma.state.payments = [];
    prisma.state.cashShifts = [];
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    setupAuthBypass(prisma);
  });

  test('endpoints are disabled unless pos_enabled is true', async () => {
    prisma.state.mockSettings.pos_enabled = 'false';
    const open = await agent.post('/api/cash-shifts/open').send({ openingFloatCents: 1000 });
    expect(open.status).toBe(409);
    expect(open.body.error).toBe('pos_disabled');
    const list = await agent.get('/api/payments');
    expect(list.status).toBe(409);
  });

  test('cash shift: open, prevent double-open, current expected total, close with variance', async () => {
    const opened = await agent.post('/api/cash-shifts/open').send({ openingFloatCents: 5000 });
    expect(opened.status).toBe(201);

    const again = await agent.post('/api/cash-shifts/open').send({ openingFloatCents: 100 });
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('shift_already_open');

    const current = await agent.get('/api/cash-shifts/current');
    expect(current.status).toBe(200);
    expect(current.body.totals.expectedCents).toBe(5000);

    const closed = await agent.post(`/api/cash-shifts/${opened.body.id}/close`).send({ countedCents: 5200 });
    expect(closed.status).toBe(200);
    expect(closed.body.expectedCents).toBe(5000);
    expect(closed.body.varianceCents).toBe(200);

    const shifts = await agent.get('/api/cash-shifts');
    expect(shifts.body).toHaveLength(1);
    expect(shifts.body[0].closedAt).toBeTruthy();
  });

  test('refunds are capped at the captured amount', async () => {
    prisma.state.payments.push({ id: 'pay1', sessionId: 's1', method: 'cash', amountCents: 1000, refundedCents: 0, status: 'captured', createdAt: new Date() });

    const partial = await agent.post('/api/payments/pay1/refund').send({ amountCents: 400 });
    expect(partial.status).toBe(200);
    expect(partial.body.refundedCents).toBe(400);
    expect(partial.body.status).toBe('partially_refunded');

    const tooMuch = await agent.post('/api/payments/pay1/refund').send({ amountCents: 700 });
    expect(tooMuch.status).toBe(400);

    const rest = await agent.post('/api/payments/pay1/refund').send({});
    expect(rest.status).toBe(200);
    expect(rest.body.status).toBe('refunded');

    const again = await agent.post('/api/payments/pay1/refund').send({});
    expect(again.status).toBe(409);
  });

  test('payments list returns recorded payments', async () => {
    prisma.state.payments.push({ id: 'pay9', sessionId: 's1', method: 'cash', amountCents: 450, refundedCents: 0, status: 'captured', currency: '€', createdAt: new Date() });
    const res = await agent.get('/api/payments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].method).toBe('cash');
    expect(res.body[0].amountCents).toBe(450);
  });

  test('financial report includes byPaymentMethod only when POS is enabled', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.tabLineItem.findFirst.mockResolvedValue(null);
    prisma.tabLineItem.findMany.mockResolvedValue([]);

    const enabled = await agent.get('/api/reports/financial').query({ periodType: 'year', year: '2025' });
    expect(enabled.status).toBe(200);
    expect(enabled.body.byPaymentMethod).toEqual({});

    prisma.state.mockSettings.pos_enabled = 'false';
    const disabled = await agent.get('/api/reports/financial').query({ periodType: 'year', year: '2025' });
    expect(disabled.status).toBe(200);
    expect(disabled.body.byPaymentMethod).toBeUndefined();
  });
});
