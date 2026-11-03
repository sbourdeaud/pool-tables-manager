const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Waitlist endpoints', () => {
  const agent = request.agent(app);
  const createdAt = new Date('2026-01-01T12:00:00.000Z');

  beforeEach(() => {
    prisma.state.waitlistEntries = [];
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    setupAuthBypass(prisma);
    prisma.waitlistEntry.findMany.mockResolvedValue([]);
    prisma.waitlistEntry.create.mockImplementation(async ({ data }) => ({ id: 'wait1', createdAt, ...data }));
    prisma.waitlistEntry.deleteMany.mockResolvedValue({ count: 1 });
    prisma.poolTable.findMany.mockResolvedValue([{ id: 'table1', tableTypeId: 'type1', status: 'available' }]);
    prisma.tableType.findMany.mockResolvedValue([{ id: 'type1', name_en: 'American' }]);
    prisma.tableType.findUnique.mockResolvedValue({ id: 'type1', name_en: 'American' });
    prisma.session.findMany.mockResolvedValue([]);
  });

  test('POST /api/waitlist stores a patron, party size, and pool type', async () => {
    const res = await agent.post('/api/waitlist').send({ patronName: 'Sam', partySize: 3, tableTypeId: 'type1' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ patronName: 'Sam', partySize: 3, tableTypeId: 'type1', tableTypeName: 'American' });
    expect(prisma.waitlistEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ patronName: 'Sam', partySize: 3, tableTypeId: 'type1' }),
    });
  });

  test('GET /api/waitlist returns elapsed time, queue position, and expected wait', async () => {
    prisma.waitlistEntry.findMany.mockResolvedValue([
      { id: 'wait1', patronName: 'Sam', partySize: 3, tableTypeId: 'type1', tableTypeName: 'American', createdAt },
    ]);

    const res = await agent.get('/api/waitlist');

    expect(res.status).toBe(200);
    expect(res.body.queueDepth).toBe(1);
    expect(res.body.entries[0]).toMatchObject({ patronName: 'Sam', partySize: 3, tableTypeName: 'American', position: 1, expectedWaitMinutes: 0 });
    expect(res.body.entries[0].elapsedMinutes).toBeGreaterThanOrEqual(0);
  });

  test('public waitlist summary exposes queue aggregates per table type', async () => {
    prisma.waitlistEntry.findMany.mockResolvedValue([
      { id: 'wait1', patronName: 'Private Name', partySize: 4, tableTypeId: 'type1', tableTypeName: 'American', createdAt },
    ]);

    const res = await agent.get('/api/public/waitlist');

    expect(res.status).toBe(200);
    expect(res.body.queueDepth).toBe(1);
    expect(res.body.averageWaitMinutes).toBe(0);
    expect(res.body.byTableType).toEqual([
      { tableTypeId: 'type1', tableTypeName: 'American', tableTypeIcon: 'american', queueDepth: 1, averageWaitMinutes: 0 },
    ]);
    expect(JSON.stringify(res.body)).not.toContain('Private Name');
    expect(res.body.patronName).toBeUndefined();
  });

  test('public waitlist summary includes types with no current wait', async () => {
    const res = await agent.get('/api/public/waitlist');

    expect(res.status).toBe(200);
    expect(res.body.queueDepth).toBe(0);
    expect(res.body.byTableType).toEqual([
      { tableTypeId: 'type1', tableTypeName: 'American', tableTypeIcon: 'american', queueDepth: 0, averageWaitMinutes: null },
    ]);
  });

  test('seat and cancel actions remove entries from the active queue', async () => {
    const seated = await agent.post('/api/waitlist/wait1/seat');
    const cancelled = await agent.delete('/api/waitlist/wait2');

    expect(seated.status).toBe(200);
    expect(cancelled.status).toBe(204);
    expect(prisma.waitlistEntry.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.waitlistEntry.deleteMany.mock.calls[0][0]).toEqual({ where: { id: 'wait1' } });
    expect(prisma.waitlistEntry.deleteMany.mock.calls[1][0]).toEqual({ where: { id: 'wait2' } });
  });
});
