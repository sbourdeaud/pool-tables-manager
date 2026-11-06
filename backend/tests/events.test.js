const request = require('./helpers/csrfRequest');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Venue events', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  const eventInput = {
    title: 'Junior tournament',
    description: 'Club tournament for junior players',
    eventDate: '2026-06-20',
    allDay: false,
    startTime: '10:00',
    endTime: '15:30',
    tableTypeIds: ['type1'],
  };

  test('POST /api/events validates the time slot', async () => {
    const res = await agent.post('/api/events').send({ ...eventInput, startTime: '16:00', endTime: '15:30' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_event');
  });

  test('POST /api/events rejects unknown table types', async () => {
    prisma.tableType.findMany.mockResolvedValue([]);
    const res = await agent.post('/api/events').send(eventInput);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_table_types');
  });

  test('GET /api/public/events rejects invalid months', async () => {
    const res = await agent.get('/api/public/events').query({ month: '2026-13' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_month');
  });

  test('POST /api/events creates an all-day event with selected table types', async () => {
    prisma.tableType.findMany.mockResolvedValue([{ id: 'type1', name_en: 'English Pool' }]);
    prisma.venueEvent.create.mockImplementation(async ({ data }) => ({
      id: 'event1',
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      updatedAt: new Date('2026-06-01T12:00:00.000Z'),
      ...data,
    }));

    const res = await agent.post('/api/events').send({ ...eventInput, allDay: true, startTime: null, endTime: null });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'event1',
      title: 'Junior tournament',
      eventDate: '2026-06-20',
      allDay: true,
      startTime: null,
      endTime: null,
      tableTypeIds: ['type1'],
      tableTypes: [{ id: 'type1', name: 'English Pool' }],
    });
    expect(prisma.venueEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tableTypeIdsJson: '["type1"]',
        eventDate: new Date('2026-06-20T00:00:00.000Z'),
      }),
    }));
  });

  test('PUT and DELETE /api/events manage existing events', async () => {
    prisma.venueEvent.findUnique.mockResolvedValue({ id: 'event1' });
    prisma.tableType.findMany.mockResolvedValue([{ id: 'type1', name_en: 'English Pool' }]);
    prisma.venueEvent.update.mockImplementation(async ({ data }) => ({
      id: 'event1',
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      updatedAt: new Date('2026-06-02T12:00:00.000Z'),
      ...data,
    }));
    const updated = await agent.put('/api/events/event1').send({ ...eventInput, title: 'Updated tournament' });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('Updated tournament');

    prisma.venueEvent.deleteMany.mockResolvedValue({ count: 1 });
    const deleted = await agent.delete('/api/events/event1');
    expect(deleted.status).toBe(204);
  });

  test('GET /api/public/events lists month events with localized table types', async () => {
    prisma.venueEvent.findMany.mockResolvedValue([{
      id: 'event1',
      title: 'Junior tournament',
      description: 'Club tournament for junior players',
      eventDate: new Date('2026-06-20T00:00:00.000Z'),
      allDay: false,
      startTime: '10:00',
      endTime: '15:30',
      tableTypeIdsJson: '["type1"]',
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      updatedAt: new Date('2026-06-02T12:00:00.000Z'),
    }]);
    prisma.tableType.findMany.mockResolvedValue([{ id: 'type1', name_en: 'English Pool', name_fr: 'Billard anglais' }]);

    const res = await agent.get('/api/public/events').query({ month: '2026-06', lang: 'fr' });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual([{
      id: 'event1',
      title: 'Junior tournament',
      description: 'Club tournament for junior players',
      eventDate: '2026-06-20',
      allDay: false,
      startTime: '10:00',
      endTime: '15:30',
      tableTypeIds: ['type1'],
      tableTypes: [{ id: 'type1', name: 'Billard anglais' }],
    }]);
    expect(prisma.venueEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { eventDate: { gte: new Date('2026-06-01T00:00:00.000Z'), lt: new Date('2026-07-01T00:00:00.000Z') } },
    }));
  });
});
