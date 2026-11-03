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

  test('POST /api/table-types stores the selected icon', async () => {
    prisma.tableType.create.mockResolvedValue({ id: 'tt3', name_en: 'Carom', icon: 'carom', base_hourly_cents: 3000 });
    const res = await agent.post('/api/table-types').send({ name_en: 'Carom', name_fr: 'Carambole', icon: 'carom', base_hourly_cents: 3000 });
    expect(res.status).toBe(201);
    expect(prisma.tableType.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ icon: 'carom' }),
    }));
  });

  test('POST /api/table-types derives an icon from the name when omitted', async () => {
    prisma.tableType.create.mockResolvedValue({ id: 'tt2', name_en: 'Snooker', icon: 'snooker', base_hourly_cents: 3000 });
    const res = await agent.post('/api/table-types').send({ name_en: 'Snooker', name_fr: 'Snooker', base_hourly_cents: 3000 });
    expect(res.status).toBe(201);
    expect(prisma.tableType.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ icon: 'snooker' }),
    }));
  });

  test('PUT /api/table-types/:id', async () => {
    prisma.tableType.update.mockResolvedValue({ id: 'tt2', name_en: 'Snooker', icon: 'pyramid', base_hourly_cents: 3200 });
    const res = await agent.put('/api/table-types/tt2').send({ name_en: 'Snooker', name_fr: 'Snooker', icon: 'pyramid', base_hourly_cents: 3200 });
    expect(res.status).toBe(200);
    expect(res.body.base_hourly_cents).toBe(3200);
    expect(prisma.tableType.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ icon: 'pyramid' }),
    }));
  });

  test('DELETE /api/table-types/:id when no tables or events exist', async () => {
    prisma.poolTable.count.mockResolvedValue(0);
    prisma.venueEvent.findMany.mockResolvedValue([]);
    prisma.tableType.delete.mockResolvedValue({});
    const res = await agent.delete('/api/table-types/tt2');
    expect([200,204]).toContain(res.status);
  });

  test('DELETE /api/table-types/:id when events use the type returns 409', async () => {
    prisma.poolTable.count.mockResolvedValue(0);
    prisma.venueEvent.findMany.mockResolvedValue([{ tableTypeIdsJson: '["tt2"]' }]);
    const res = await agent.delete('/api/table-types/tt2');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('has_events');
  });

  test('DELETE /api/table-types/:id when tables exist returns 409', async () => {
    prisma.poolTable.count.mockResolvedValue(2);
    const res = await agent.delete('/api/table-types/tt2');
    expect(res.status).toBe(409);
  });
});
