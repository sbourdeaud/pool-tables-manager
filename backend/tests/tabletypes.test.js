const request = require('supertest');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('TableType CRUD', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  test('GET /api/table-types', async () => {
    prisma.tableType.findMany.mockResolvedValue([{ id: 'tt1', name_en: 'Pool', base_hourly_cents: 2500 }]);
    const res = await agent.get('/api/table-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/table-types', async () => {
    prisma.tableType.create.mockResolvedValue({ id: 'tt2', name_en: 'Snooker', base_hourly_cents: 3000 });
    const res = await agent.post('/api/table-types').send({ name_en: 'Snooker', name_fr: 'Snooker', base_hourly_cents: 3000 });
    expect(res.status).toBe(201);
    expect(res.body.name_en).toBe('Snooker');
  });

  test('PUT /api/table-types/:id', async () => {
    prisma.tableType.update.mockResolvedValue({ id: 'tt2', name_en: 'Snooker', base_hourly_cents: 3200 });
    const res = await agent.put('/api/table-types/tt2').send({ name_en: 'Snooker', name_fr: 'Snooker', base_hourly_cents: 3200 });
    expect(res.status).toBe(200);
    expect(res.body.base_hourly_cents).toBe(3200);
  });

  test('DELETE /api/table-types/:id when no tables exist', async () => {
    prisma.poolTable.count.mockResolvedValue(0);
    prisma.tableType.delete.mockResolvedValue({});
    const res = await agent.delete('/api/table-types/tt2');
    expect([200,204]).toContain(res.status);
  });

  test('DELETE /api/table-types/:id when tables exist returns 409', async () => {
    prisma.poolTable.count.mockResolvedValue(2);
    const res = await agent.delete('/api/table-types/tt2');
    expect(res.status).toBe(409);
  });
});
