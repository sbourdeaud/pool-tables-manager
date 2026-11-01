const request = require('supertest');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Reports', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  test('GET /api/reports/financial returns error when weekDate missing for week', async () => {
    const res = await agent.get('/api/reports/financial').query({ periodType: 'week' });
    expect(res.status).toBe(400);
  });

  test('GET /api/reports/financial returns totals with empty DB', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.tabLineItem.findFirst.mockResolvedValue(null);
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.subscription.findMany.mockResolvedValue([]);
    const res = await agent.get('/api/reports/financial').query({ periodType: 'year', year: '2025' });
    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBeDefined();
  });

  test('GET /api/reports/invoices returns immutable receipt details with table and payments', async () => {
    const receipt = {
      id: 'receipt1',
      number: 7,
      year: 2026,
      sessionId: 'session1',
      itemsJson: JSON.stringify([{ description: 'Table Time', quantity: 1, unitPrice: 1200, totalCents: 1200, vatRatePercent: 20 }]),
      subtotalHtCents: 1000,
      vatCents: 200,
      totalTtcCents: 1200,
      discountCents: 0,
      createdAt: new Date('2026-05-14T12:00:00Z'),
    };
    const receiptFindMany = jest.spyOn(prisma.receipt, 'findMany').mockResolvedValue([receipt]);
    const paymentFindMany = jest.spyOn(prisma.payment, 'findMany').mockResolvedValue([
      { id: 'payment1', receiptId: 'receipt1', method: 'cash', amountCents: 1200, currency: 'EUR', status: 'captured' },
    ]);
    prisma.session.findMany.mockResolvedValue([{ id: 'session1', tableId: 'table1' }]);
    prisma.poolTable.findMany.mockResolvedValue([{ id: 'table1', number: 4 }]);

    const res = await agent.get('/api/reports/invoices').query({ from: '2026-05-01', to: '2026-05-31' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      receiptNumber: 7,
      year: 2026,
      tableNumber: 4,
      totalTtcCents: 1200,
      items: [{ description: 'Table Time', totalCents: 1200 }],
      payments: [{ method: 'cash', amountCents: 1200 }],
    });
    expect(receiptFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { createdAt: { gte: expect.any(Date), lte: expect.any(Date) } },
      take: 100,
    }));
    expect(paymentFindMany).toHaveBeenCalled();
    receiptFindMany.mockRestore();
    paymentFindMany.mockRestore();
  });

  test('GET /api/reports/invoices rejects invalid or repeated date filters', async () => {
    const res = await agent.get('/api/reports/invoices').query({ from: ['2026-05-01', '2026-05-02'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_date_range');
  });
});
