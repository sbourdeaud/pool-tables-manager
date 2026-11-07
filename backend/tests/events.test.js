const request = require('./helpers/csrfRequest');
const rawRequest = require('supertest');
const bcrypt = require('bcryptjs');
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

  afterEach(() => jest.restoreAllMocks());

  const eventInput = {
    title: 'Junior tournament',
    description: 'Club tournament for junior players',
    eventDate: '2026-06-20',
    allDay: false,
    startTime: '10:00',
    endTime: '15:30',
    tableTypeIds: ['type1'],
  };

  test('GET /api/events lists the UTC month in calendar order with English table types', async () => {
    prisma.venueEvent.findMany.mockResolvedValue([{
      id: 'event1',
      ...eventInput,
      eventDate: new Date('2026-12-20T00:00:00.000Z'),
      tableTypeIdsJson: '["type1"]',
      createdAt: new Date('2026-12-01T12:00:00.000Z'),
      updatedAt: new Date('2026-12-02T12:00:00.000Z'),
    }]);
    prisma.tableType.findMany.mockResolvedValue([{ id: 'type1', name_en: 'English Pool', name_fr: 'Billard anglais' }]);

    const res = await agent.get('/api/events').query({ month: '2026-12', lang: 'fr' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{
      id: 'event1',
      ...eventInput,
      eventDate: '2026-12-20',
      tableTypes: [{ id: 'type1', name: 'English Pool' }],
    }]);
    expect(prisma.venueEvent.findMany).toHaveBeenCalledWith({
      where: { eventDate: { gte: new Date('2026-12-01T00:00:00.000Z'), lt: new Date('2027-01-01T00:00:00.000Z') } },
      orderBy: [{ eventDate: 'asc' }, { allDay: 'desc' }, { startTime: 'asc' }],
    });
    expect(prisma.tableType.findMany).toHaveBeenCalledWith();
  });

  test.each([undefined, '', '2026-13', '2026-00', '2026-6', 'invalid'])('GET /api/events rejects invalid month %p before event queries', async (month) => {
    const res = await agent.get('/api/events').query({ month });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_month' });
    expect(prisma.venueEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.tableType.findMany).not.toHaveBeenCalled();
  });

  test.each([
    ['OIDC', { key: 'oidc_enabled', value: 'true' }],
    ['local', { key: 'local_admin_password_hash', value: 'configured' }],
  ])('%s auth requires a staff session but leaves public events accessible', async (name, setting) => {
    prisma.setting.findMany.mockResolvedValue([setting]);
    prisma.venueEvent.findMany.mockResolvedValue([]);
    prisma.tableType.findMany.mockResolvedValue([]);
    const unauthenticated = request.agent(app);

    for (const [method, url] of [
      ['get', '/api/events?month=2026-06'],
      ['post', '/api/events'],
      ['put', '/api/events/event1'],
      ['delete', '/api/events/event1'],
    ]) {
      const res = await unauthenticated[method](url).send(eventInput);
      expect(res.status).toBe(401);
      expect(res.text).toBe('Unauthorized');
    }
    for (const method of Object.values(prisma.venueEvent)) expect(method).not.toHaveBeenCalled();
    expect(prisma.tableType.findMany).not.toHaveBeenCalled();
    prisma.setting.findMany.mockClear();

    const publicRes = await unauthenticated.get('/api/public/events').query({ month: '2026-06' });
    expect(publicRes.status).toBe(200);
    expect(publicRes.body).toEqual([]);
    expect(publicRes.headers['cache-control']).toBe('no-store');
    expect(prisma.setting.findMany).not.toHaveBeenCalled();
  });

  test('configured local auth allows staff events after session login', async () => {
    const hash = await bcrypt.hash('password123', 4);
    prisma.setting.findMany.mockResolvedValue([{ key: 'local_admin_password_hash', value: hash }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'local_admin_password_hash', value: hash });
    prisma.venueEvent.findMany.mockResolvedValue([]);
    prisma.tableType.findMany.mockResolvedValue([]);
    const authenticated = request.agent(app);

    const login = await authenticated.post('/auth/local/login').send({ username: 'admin', password: 'password123' });
    expect(login.status).toBe(200);
    const res = await authenticated.get('/api/events').query({ month: '2026-06' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test.each([
    ['post', '/api/events'],
    ['put', '/api/events/event1'],
    ['delete', '/api/events/event1'],
  ])('%s %s rejects missing CSRF before authentication or event database calls', async (method, url) => {
    const withoutToken = rawRequest.agent(app);
    await withoutToken.get('/api/csrf-token').expect(200);

    for (const client of [rawRequest(app), withoutToken]) {
      const res = await client[method](url).send(eventInput);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'invalid_csrf_token' });
    }
    expect(prisma.setting.findMany).not.toHaveBeenCalled();
    expect(prisma.tableType.findMany).not.toHaveBeenCalled();
    for (const method of Object.values(prisma.venueEvent)) expect(method).not.toHaveBeenCalled();
  });

  test.each(['put', 'delete'])('%s /api/events/:id returns 404 for a missing event', async (method) => {
    prisma.venueEvent.findUnique.mockResolvedValue(null);
    prisma.venueEvent.deleteMany.mockResolvedValue({ count: 0 });

    const res = await agent[method]('/api/events/missing').send(eventInput);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'event_not_found' });
    expect(prisma.venueEvent[method === 'put' ? 'findUnique' : 'deleteMany']).toHaveBeenCalledWith({ where: { id: 'missing' } });
    expect(prisma.tableType.findMany).not.toHaveBeenCalled();
    expect(prisma.venueEvent.update).not.toHaveBeenCalled();
  });

  test.each([
    ['get', '/api/events', 'findMany'],
    ['post', '/api/events', 'create'],
    ['put', '/api/events/event1', 'update'],
    ['delete', '/api/events/event1', 'deleteMany'],
    ['get', '/api/public/events', 'findMany'],
  ])('%s %s returns db_error on database failure', async (method, url, operation) => {
    const error = new Error('Event database unavailable');
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.tableType.findMany.mockResolvedValue([{ id: 'type1', name_en: 'English Pool' }]);
    prisma.venueEvent.findUnique.mockResolvedValue({ id: 'event1' });
    prisma.venueEvent[operation].mockRejectedValue(error);

    const req = agent[method](url);
    const res = await (method === 'get' ? req.query({ month: '2026-06' }) : req.send(eventInput));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'db_error' });
    expect(logged).toHaveBeenCalledWith(error);
    if (url === '/api/public/events') expect(res.headers['cache-control']).toBe('no-store');
  });

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

  test.each([undefined, '', '2026-13', '2026-00', '2026-6', 'invalid'])('GET /api/public/events rejects invalid month %p without caching', async (month) => {
    const res = await agent.get('/api/public/events').query({ month });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_month');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(prisma.venueEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.tableType.findMany).not.toHaveBeenCalled();
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
