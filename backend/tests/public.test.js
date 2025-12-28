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
    prisma.session.findMany.mockResolvedValue([{ id: 'sess-1', pin: '0000', status: 'active', startedAt: started, numberOfPlayers: 1 }]);
    // items: one drink 600 cents
    prisma.tabLineItem.findMany.mockResolvedValue([{ id: 'li-1', type: 'drink', totalCents: 600 }]);
    // table type query
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt-1', name_en: 'Pool', base_hourly_cents: 2500 }]);
    const res = await agent.get('/api/public/table/1?pin=0000');
    expect(res.status).toBe(200);
    expect(res.body.itemsTotal).toBe(600);
    expect(typeof res.body.tableCharge).toBe('number');
  });
});
