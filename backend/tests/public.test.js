const request = require('supertest');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Public table endpoint', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns 404 when table not found', async () => {
    prisma.poolTable.findMany.mockResolvedValue([]);
    const res = await agent.get('/api/public/table/99');
    expect(res.status).toBe(404);
  });

  test('returns 403 on invalid PIN', async () => {
    prisma.poolTable.findMany.mockResolvedValue([{ id: 'tbl-1' }]);
    prisma.session.findMany.mockResolvedValue([{ id: 'sess-1', pin: '1234', status: 'active', startedAt: new Date().toISOString(), numberOfPlayers: 1 }]);
    const res = await agent.get('/api/public/table/1');
    expect(res.status).toBe(403);
  });

  test('returns totals when valid PIN and session exists', async () => {
    prisma.poolTable.findMany.mockResolvedValue([{ id: 'tbl-1' }]);
    const started = new Date(Date.now() - 90 * 60 * 1000).toISOString(); // 1.5 hours ago
    prisma.session.findMany.mockResolvedValue([{ id: 'sess-1', pin: '0000', status: 'active', startedAt: started, numberOfPlayers: 1, lookingForPlayersCount: 2, lookingForPlayersUpTo: true }]);
    // items: one drink 600 cents
    prisma.tabLineItem.findMany.mockResolvedValue([{ id: 'li-1', type: 'drink', totalCents: 600 }]);
    // table type query
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt-1', name_en: 'Pool', base_hourly_cents: 2500 }]);
    const res = await agent.get('/api/public/table/1?pin=0000');
    expect(res.status).toBe(200);
    expect(res.body.itemsTotal).toBe(600);
    expect(typeof res.body.tableCharge).toBe('number');
    expect(res.body.session.lookingForPlayersCount).toBe(2);
    expect(res.body.session.lookingForPlayersUpTo).toBe(true);
  });

  test('lets a PIN holder set and cancel a player search', async () => {
    const session = { id: 'sess-1', pin: '0000', status: 'active', numberOfPlayers: 2, lookingForPlayersCount: 3, lookingForPlayersUpTo: true };
    prisma.poolTable.findMany.mockResolvedValue([{ id: 'tbl-1' }]);
    prisma.session.findMany.mockResolvedValue([session]);
    prisma.session.updateMany.mockResolvedValue({ count: 1 });

    const set = await agent.post('/api/public/table/1/looking-for-players').send({ pin: '0000', count: 2, upTo: true });
    expect(set.status).toBe(200);
    expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sess-1', status: 'active', pin: '0000' },
      data: { lookingForPlayersCount: 2, lookingForPlayersUpTo: true },
    }));

    const cancel = await agent.post('/api/public/table/1/looking-for-players/cancel').send({ pin: '0000' });
    expect(cancel.status).toBe(200);
    expect(cancel.body).toEqual({ count: null, upTo: false });
    expect(prisma.session.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { lookingForPlayersCount: null, lookingForPlayersUpTo: false },
    }));
  });

  test('fulfills a PIN holder player search with the confirmed players', async () => {
    const session = { id: 'sess-1', pin: '0000', status: 'active', numberOfPlayers: 2, lookingForPlayersCount: 3, lookingForPlayersUpTo: true };
    const subscriberMeta = { id: 'subscriber-meta', quantity: 1 };
    prisma.poolTable.findMany.mockResolvedValue([{ id: 'tbl-1' }]);
    prisma.session.findMany.mockResolvedValue([session]);
    prisma.session.findUnique.mockResolvedValue(session);
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.tabLineItem.findFirst.mockResolvedValue(subscriberMeta);
    prisma.tabLineItem.update.mockResolvedValue({ ...subscriberMeta, quantity: 2 });

    const res = await agent.post('/api/public/table/1/looking-for-players/fulfill').send({ pin: '0000', subscribersAdded: 1, nonSubscribersAdded: 1 });

    expect(res.status).toBe(200);
    expect(res.body.numberOfPlayers).toBe(4);
    expect(res.body.subscriberCount).toBe(2);
    expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'sess-1', status: 'active', lookingForPlayersCount: 3 }),
      data: { numberOfPlayers: 4, lookingForPlayersCount: null, lookingForPlayersUpTo: false },
    }));
    expect(prisma.tabLineItem.update).toHaveBeenCalledWith({ where: { id: 'subscriber-meta' }, data: { quantity: 2 } });
  });

  test('rejects player-search writes with an invalid PIN or count', async () => {
    prisma.poolTable.findMany.mockResolvedValue([{ id: 'tbl-1' }]);
    prisma.session.findMany.mockResolvedValue([{ id: 'sess-1', pin: '0000', status: 'active' }]);

    const invalidPin = await agent.post('/api/public/table/1/looking-for-players').send({ pin: '9999', count: 2, upTo: false });
    const invalidCount = await agent.post('/api/public/table/1/looking-for-players').send({ pin: '0000', count: 0, upTo: false });

    expect(invalidPin.status).toBe(403);
    expect(invalidCount.status).toBe(400);
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });
});

describe('Public table status board endpoint', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns all tables with status without authentication', async () => {
    prisma.poolTable.findMany.mockResolvedValue([
      { id: 'tbl-1', tableTypeId: 'tt-1', number: 1, status: 'available' },
      { id: 'tbl-2', tableTypeId: 'tt-1', number: 2, status: 'occupied' },
      { id: 'tbl-3', tableTypeId: 'tt-2', number: 3, status: 'maintenance' }
    ]);
    prisma.tableType.findMany.mockResolvedValue([
      { id: 'tt-1', name_en: 'Pool' },
      { id: 'tt-2', name_en: 'Snooker' }
    ]);
    const started = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    prisma.session.findMany.mockResolvedValue([
      { id: 'sess-2', tableId: 'tbl-2', status: 'active', startedAt: started, numberOfPlayers: 3, pin: '9999', lookingForPlayersCount: 2, lookingForPlayersUpTo: true }
    ]);

    const res = await agent.get('/api/public/tables');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { number: 1, typeName: 'Pool', status: 'available' },
      { number: 2, typeName: 'Pool', status: 'occupied', numberOfPlayers: 3, startedAt: started, lookingForPlayersCount: 2, lookingForPlayersUpTo: true },
      { number: 3, typeName: 'Snooker', status: 'maintenance' }
    ]);
  });

  test('never exposes session ids, PINs, or tab data', async () => {
    prisma.poolTable.findMany.mockResolvedValue([
      { id: 'tbl-2', tableTypeId: 'tt-1', number: 2, status: 'occupied' }
    ]);
    prisma.tableType.findMany.mockResolvedValue([{ id: 'tt-1', name_en: 'Pool' }]);
    prisma.session.findMany.mockResolvedValue([
      { id: 'sess-2', tableId: 'tbl-2', status: 'active', startedAt: new Date().toISOString(), numberOfPlayers: 2, pin: '1234' }
    ]);

    const res = await agent.get('/api/public/tables');
    expect(res.status).toBe(200);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('pin');
    expect(serialized).not.toContain('1234');
    expect(serialized).not.toContain('sess-2');
    expect(serialized).not.toContain('sessionId');
  });
});
