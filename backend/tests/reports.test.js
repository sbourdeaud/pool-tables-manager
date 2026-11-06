const request = require('./helpers/csrfRequest');
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

  test('GET /api/reports/operations rejects missing or invalid weeks', async () => {
    const missing = await agent.get('/api/reports/operations');
    const invalid = await agent.get('/api/reports/operations').query({ weekDate: '2026-02-31' });
    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  test('GET /api/reports/operations buckets overlapping sessions and ordered drink quantities by type', async () => {
    prisma.session.findMany.mockResolvedValue([
      { id: 'session-before', tableId: 'table1', startedAt: new Date('2026-05-31T23:30:00'), endedAt: new Date('2026-06-01T00:30:00') },
      { id: 'session-inside', tableId: 'table1', startedAt: new Date('2026-06-01T00:30:00'), endedAt: new Date('2026-06-01T02:00:00') },
    ]);
    prisma.poolTable.findMany.mockResolvedValue([{ id: 'table1', tableTypeId: 'type1' }]);
    prisma.tableType.findMany.mockResolvedValue([{ id: 'type1', name_en: 'English Pool' }]);
    const orderFindMany = jest.spyOn(prisma.pendingOrder, 'findMany').mockResolvedValue([
      { tableId: 'table1', createdAt: new Date('2026-06-02T13:45:00'), itemsJson: JSON.stringify([{ quantity: 2 }, { quantity: 1 }]) },
    ]);

    const res = await agent.get('/api/reports/operations').query({ weekDate: '2026-06-03' });

    expect(res.status).toBe(200);
    expect(res.body.weekStart).toBe('2026-06-01');
    expect(res.body.tableTypes).toEqual([{ id: 'type1', name: 'English Pool' }]);
    expect(res.body.utilizationByTableType.type1[0].slice(0, 2)).toEqual([60, 60]);
    expect(res.body.drinksByTableType.type1[1][13]).toBe(3);
    expect(prisma.session.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { not: 'cancelled' }, startedAt: { lt: expect.any(Date) }, OR: expect.any(Array) }),
    }));
    expect(orderFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { not: 'cancelled' } }),
    }));
    orderFindMany.mockRestore();
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
      sessionStartedAt: new Date('2026-05-14T10:00:00Z'),
      sessionEndedAt: new Date('2026-05-14T12:00:00Z'),
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
      sessionStartedAt: '2026-05-14T10:00:00.000Z',
      sessionEndedAt: '2026-05-14T12:00:00.000Z',
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
