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
});
