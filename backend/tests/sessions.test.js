const request = require('supertest');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Sessions API', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  test('Create session (POST /api/sessions)', async () => {
    // $transaction will call the callback with a tx that uses our mocks
    prisma.$transaction.mockImplementation(async (fn) => await fn(prisma));

    let call = 0;
    prisma.$queryRawUnsafe.mockImplementation(async () => {
      if(call === 0){ call++; return [{ id: 't1', table_type_id: 'tt1', number: 1, status: 'available' }]; }
      if(call === 1){ call++; return [{ id: 's1', table_id: 't1', patron_id: null, started_at: new Date().toISOString(), ended_at: null, status: 'active', created_at: new Date().toISOString(), number_of_players: 1, pin: '1234' }]; }
      // subsequent calls return empty
      return [];
    });

    const res = await agent.post('/api/sessions').send({ tableId: 't1', patronId: null, numberOfPlayers: 1 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.pin).toBeDefined();
  });

  test('End session (PATCH /api/sessions/:id/end)', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 's1', table_id: 't1' }]);
    prisma.$executeRawUnsafe.mockResolvedValue({});
    const res = await agent.patch('/api/sessions/s1/end');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('s1');
  });

  test('List sessions includes the subscriber count', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([
      { id: 's1', table_id: 't1', patron_id: null, started_at: new Date().toISOString(), ended_at: null, status: 'active', created_at: new Date().toISOString(), number_of_players: 2, pin: '1234', subscriber_count: 1 }
    ]);
    const res = await agent.get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body[0].subscriberCount).toBe(1);
  });

  test('PATCH /api/sessions/:id updates player and subscriber counts (clamped)', async () => {
    prisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const text = String(sql);
      if (text.includes('UPDATE')) return [{ id: 's1' }];
      if (text.includes('SELECT number_of_players FROM')) return [{ number_of_players: 2 }];
      return [{ id: 's1', table_id: 't1', patron_id: null, started_at: new Date().toISOString(), ended_at: null, status: 'active', created_at: new Date().toISOString(), number_of_players: 2 }];
    });
    let subscriberMetaLookups = 0;
    prisma.tabLineItem.findFirst.mockImplementation(async ({ where }) => {
      if (where.description === 'non_subscriber_started_at') return null;
      subscriberMetaLookups++;
      return subscriberMetaLookups === 3 ? { id: 'm1', quantity: 2 } : null;
    });

    const res = await agent.patch('/api/sessions/s1').send({ numberOfPlayers: 2, subscriberCount: 5 });
    expect(res.status).toBe(200);
    expect(res.body.numberOfPlayers).toBe(2);
    expect(res.body.subscriberCount).toBe(2);
    expect(prisma.tabLineItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'meta', description: 'subscriber_count', quantity: 2 })
    });
  });

  test('PATCH /api/sessions/:id starts table billing when the first non-subscriber joins', async () => {
    let playerCountRead = 0;
    prisma.$queryRawUnsafe.mockImplementation(async (sql) => {
      const text = String(sql);
      if (text.includes('UPDATE')) return [{ id: 's1' }];
      if (text.includes('SELECT number_of_players FROM')) {
        playerCountRead++;
        return [{ number_of_players: playerCountRead === 1 ? 1 : 2 }];
      }
      return [{ id: 's1', table_id: 't1', patron_id: null, started_at: new Date(Date.now() - 4 * 3600000), ended_at: null, status: 'active', created_at: new Date(), number_of_players: 2 }];
    });
    const subscriberMeta = { id: 'subscriber-meta', quantity: 1 };
    prisma.tabLineItem.findFirst.mockImplementation(async ({ where }) =>
      where.description === 'subscriber_count' ? subscriberMeta : null,
    );

    const res = await agent.patch('/api/sessions/s1').send({ numberOfPlayers: 2, subscriberCount: 1 });

    expect(res.status).toBe(200);
    expect(res.body.numberOfPlayers).toBe(2);
    expect(res.body.subscriberCount).toBe(1);
    expect(prisma.tabLineItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'meta', description: 'non_subscriber_started_at', quantity: 1 })
    });
  });

  test('Get session detail (GET /api/sessions/:id)', async () => {
    const startedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 1, startedAt, status: 'active' });
    prisma.tabLineItem.findMany.mockResolvedValue([{ id: 'li1', type: 'drink', description: 'Beer', quantity: 1, unit_price: 600, totalCents: 600 }]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, name_en: 'Pool' }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '50' });

    const res = await agent.get('/api/sessions/s1');
    expect(res.status).toBe(200);
    expect(res.body.session.id).toBe('s1');
    expect(res.body.itemsTotal).toBeGreaterThanOrEqual(0);
  });

  test('Get session detail bills only from the first non-subscriber join time', async () => {
    const startedAt = new Date(Date.now() - 4 * 3600000);
    const joinedAt = new Date(Date.now() - 30 * 60000);
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 2, startedAt, status: 'active' });
    prisma.tabLineItem.findMany.mockResolvedValue([
      { id: 'subscriber-meta', type: 'meta', description: 'subscriber_count', quantity: 1 },
      { id: 'charge-start-meta', type: 'meta', description: 'non_subscriber_started_at', quantity: 1, createdAt: joinedAt },
    ]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, name_en: 'Pool' }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '50' });

    const res = await agent.get('/api/sessions/s1');

    expect(res.status).toBe(200);
    expect(res.body.tableCharge).toBe(1250);
  });
});
