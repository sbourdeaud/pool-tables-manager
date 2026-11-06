const request = require('supertest');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const { setupAuthBypass } = require('./helpers/authBypass');
const app = require('../server');

describe('Settlement / Checkout flows', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', status: 'active' });
  });

  test('POST /api/sessions/:id/settle handles table settlement and item adjustments', async () => {
    // Simulate subscriber meta present
    prisma.tabLineItem.findFirst.mockResolvedValue({ id: 'meta1', quantity: 1 });
    // Simulate the selected tab item being retrieved for settlement
    prisma.tabLineItem.findUnique.mockResolvedValue({ id: 'item1', sessionId: 's1', type: 'drink', description: 'Beer', quantity: 2, unitPrice: 600, totalCents: 1200, vatRatePercent: 20, voidedAt: null });
    // Simulate original item retrieval
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'item1', session_id: 's1', description: 'Beer', quantity: 2, unit_price: 600, total_cents: 1200 }]);
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.post('/api/sessions/s1/settle').send({ tableSettlementCents: 500, items: [{ itemId: 'item1', quantity: 1 }], isSubscriber: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/sessions/:id/settle calculates a player seat share when playerId is supplied', async () => {
    const joinedAt = new Date(Date.now() - 91 * 60000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 2, startedAt: joinedAt, status: 'active' });
    prisma.sessionPlayer.findUnique.mockResolvedValue({
      id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt, leftAt: null, status: 'active'
    });
    prisma.sessionPlayer.findMany.mockResolvedValue([
      { id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt, leftAt: null, status: 'active' },
      { id: 'p2', sessionId: 's1', playerNumber: 2, isSubscriber: true, joinedAt, leftAt: null, status: 'active' },
    ]);
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '50' });
    prisma.sessionPlayer.update.mockResolvedValue({});
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.post('/api/sessions/s1/settle').send({ playerId: 'p1', items: [] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tableSettlementCents).toBe(2500);
    expect(prisma.sessionPlayer.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' },
      data: expect.objectContaining({ status: 'settled', settledTableCents: 2500 }),
    }));
  });


  test('settles a seat with an adjusted table-time amount', async () => {
    const joinedAt = new Date(Date.now() - 30 * 60000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 2, startedAt: joinedAt, status: 'active' });
    prisma.sessionPlayer.findUnique.mockResolvedValue({
      id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt, leftAt: null, status: 'active'
    });
    prisma.sessionPlayer.findMany.mockResolvedValue([
      { id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt, leftAt: null, status: 'active' },
      { id: 'p2', sessionId: 's1', playerNumber: 2, isSubscriber: false, joinedAt, leftAt: null, status: 'active' },
    ]);
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '0' });
    prisma.sessionPlayer.update.mockResolvedValue({});
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.post('/api/sessions/s1/settle').send({ playerId: 'p1', tableSettlementCents: 1000, items: [] });

    expect(res.status).toBe(200);
    expect(res.body.tableSettlementCents).toBe(1000);
    expect(prisma.sessionPlayer.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' },
      data: expect.objectContaining({ settledTableCents: 1000 }),
    }));
  });

  test('rejects an adjusted table-time amount above the remaining table charge', async () => {
    const joinedAt = new Date(Date.now() - 30 * 60000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 2, startedAt: joinedAt, status: 'active' });
    prisma.sessionPlayer.findUnique.mockResolvedValue({
      id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt, leftAt: null, status: 'active'
    });
    prisma.sessionPlayer.findMany.mockResolvedValue([
      { id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt, leftAt: null, status: 'active' },
      { id: 'p2', sessionId: 's1', playerNumber: 2, isSubscriber: false, joinedAt, leftAt: null, status: 'active' },
    ]);
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '0' });
    prisma.sessionPlayer.update.mockResolvedValue({});
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.post('/api/sessions/s1/settle').send({ playerId: 'p1', tableSettlementCents: 99999, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_settlement');
    expect(prisma.sessionPlayer.update).not.toHaveBeenCalled();
  });
});
