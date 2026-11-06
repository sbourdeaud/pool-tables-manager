const request = require('./helpers/csrfRequest');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Sessions API', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', status: 'active' });
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

  describe('table switching locks', () => {
    beforeEach(() => {
      prisma.$queryRawUnsafe.mockImplementation(async (sql) => String(sql).includes('FOR UPDATE')
        ? [{ id: 't1', status: 'occupied' }, { id: 't2', status: 'available' }]
        : [{ id: 's1', table_id: 't2', status: 'active' }]);
    });

    test('locks both table rows in deterministic order before moving the session', async () => {
      const res = await agent.post('/api/sessions/s1/switch').send({ newTableId: 't2' });
      expect(res.status).toBe(200);
      expect(prisma.$queryRawUnsafe.mock.calls[0]).toEqual([expect.stringContaining('ORDER BY id FOR UPDATE'), ['t1', 't2']]);
      const moveIndex = prisma.$executeRawUnsafe.mock.calls.findIndex(call => String(call[0]).includes('SET table_id'));
      expect(prisma.$queryRawUnsafe.mock.invocationCallOrder[0]).toBeLessThan(prisma.$executeRawUnsafe.mock.invocationCallOrder[moveIndex]);
      const release = prisma.$executeRawUnsafe.mock.calls.find(call => String(call[0]).includes("SET status = 'available'"));
      expect(release).toEqual([expect.stringContaining("AND status = 'occupied' AND NOT EXISTS"), 't1']);
    });

    test('rejects an active legacy session on a stale available target without moving', async () => {
      prisma.session.findMany.mockResolvedValue([{ id: 'legacy' }]);
      const res = await agent.post('/api/sessions/s1/switch').send({ newTableId: 't2' });
      expect(res.status).toBe(409);
      expect(prisma.$executeRawUnsafe.mock.calls.some(call => String(call[0]).includes('UPDATE'))).toBe(false);
    });
  });

  test('List sessions includes the subscriber count and player-search state', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([
      { id: 's1', table_id: 't1', patron_id: null, started_at: new Date().toISOString(), ended_at: null, status: 'active', created_at: new Date().toISOString(), number_of_players: 2, pin: '1234', subscriber_count: 1, looking_for_players_count: 2, looking_for_players_up_to: true }
    ]);
    const res = await agent.get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body[0].subscriberCount).toBe(1);
    expect(res.body[0].lookingForPlayersCount).toBe(2);
    expect(res.body[0].lookingForPlayersUpTo).toBe(true);
  });

  test('DELETE /api/sessions/:id/looking-for-players clears an open search', async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    const res = await agent.delete('/api/sessions/s1/looking-for-players');
    expect(res.status).toBe(204);
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', status: 'active' },
      data: { lookingForPlayersCount: null, lookingForPlayersUpTo: false },
    });
  });

  test('POST /api/sessions/:id/looking-for-players/fulfill adds players and clears the request', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 's1',
      status: 'active',
      numberOfPlayers: 2,
      lookingForPlayersCount: 3,
      lookingForPlayersUpTo: true,
    });
    const subscriberMeta = { id: 'subscriber-meta', quantity: 1 };
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.tabLineItem.findFirst.mockResolvedValue(subscriberMeta);
    prisma.tabLineItem.update.mockResolvedValue({ ...subscriberMeta, quantity: 2 });

    const res = await agent.post('/api/sessions/s1/looking-for-players/fulfill').send({ subscribersAdded: 1, nonSubscribersAdded: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ numberOfPlayers: 4, subscriberCount: 2, lookingForPlayersCount: null, lookingForPlayersUpTo: false });
    expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 's1', status: 'active', numberOfPlayers: 2, lookingForPlayersCount: 3 }),
      data: { numberOfPlayers: 4, lookingForPlayersCount: null, lookingForPlayersUpTo: false },
    }));
    expect(prisma.tabLineItem.update).toHaveBeenCalledWith({ where: { id: 'subscriber-meta' }, data: { quantity: 2 } });
  });

  test('fulfilling a request with a non-subscriber starts table billing', async () => {
    const subscriberMeta = { id: 'subscriber-meta', quantity: 2 };
    prisma.session.findUnique.mockResolvedValue({
      id: 's1',
      status: 'active',
      numberOfPlayers: 2,
      lookingForPlayersCount: 3,
      lookingForPlayersUpTo: true,
    });
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.tabLineItem.findFirst.mockImplementation(async ({ where }) =>
      where.description === 'subscriber_count' ? subscriberMeta : null,
    );
    prisma.tabLineItem.create.mockResolvedValue({ id: 'billing-start' });

    const res = await agent.post('/api/sessions/s1/looking-for-players/fulfill').send({ subscribersAdded: 0, nonSubscribersAdded: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ numberOfPlayers: 3, subscriberCount: 2 });
    expect(prisma.tabLineItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'meta', description: 'non_subscriber_started_at' }),
    });
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

  test('excludes players joining in the final quarter of a running slot', async () => {
    const firstPlayerJoinedAt = new Date(Date.now() - 110 * 60000).toISOString();
    const lateJoinerJoinedAt = new Date(Date.now() - 1 * 60000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 2, startedAt: firstPlayerJoinedAt, status: 'active' });
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '0' });
    prisma.sessionPlayer.findMany.mockResolvedValue([
      { id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt: firstPlayerJoinedAt, leftAt: null, status: 'active' },
      { id: 'p2', sessionId: 's1', playerNumber: 2, isSubscriber: false, joinedAt: lateJoinerJoinedAt, leftAt: null, status: 'active' },
    ]);

    const res = await agent.get('/api/sessions/s1');

    expect(res.status).toBe(200);
    expect(res.body.tableCharge).toBe(5000);
    expect(res.body.players).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerNumber: 1, shareCents: 5000 }),
      expect.objectContaining({ playerNumber: 2, shareCents: 0 }),
    ]));
  });

  test('allows a player joining in the third hour to share that hour', async () => {
    const firstPlayerJoinedAt = new Date(Date.now() - 126 * 60000).toISOString();
    const secondPlayerJoinedAt = new Date(Date.now() - 3 * 60000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 2, startedAt: firstPlayerJoinedAt, status: 'active' });
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '0' });
    prisma.sessionPlayer.findMany.mockResolvedValue([
      { id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt: firstPlayerJoinedAt, leftAt: null, status: 'active' },
      { id: 'p2', sessionId: 's1', playerNumber: 2, isSubscriber: false, joinedAt: secondPlayerJoinedAt, leftAt: null, status: 'active' },
    ]);

    const res = await agent.get('/api/sessions/s1');

    expect(res.status).toBe(200);
    expect(res.body.tableCharge).toBe(7500);
    expect(res.body.players).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerNumber: 1, shareCents: 6250 }),
      expect.objectContaining({ playerNumber: 2, shareCents: 1250 }),
    ]));
  });

  test('keeps one slot timeline across non-subscriber gaps and allows early mid-slot joins', async () => {
    const firstPlayerJoinedAt = new Date(Date.now() - 100 * 60000).toISOString();
    const firstPlayerLeftAt = new Date(Date.now() - 85 * 60000).toISOString();
    const rejoinJoinedAt = new Date(Date.now() - 16 * 60000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 3, startedAt: firstPlayerJoinedAt, status: 'active' });
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '0' });
    prisma.sessionPlayer.findMany.mockResolvedValue([
      { id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt: firstPlayerJoinedAt, leftAt: firstPlayerLeftAt, status: 'settled', settledTableCents: 1250 },
      { id: 'p2', sessionId: 's1', playerNumber: 2, isSubscriber: false, joinedAt: firstPlayerJoinedAt, leftAt: null, status: 'active' },
      { id: 'p3', sessionId: 's1', playerNumber: 3, isSubscriber: false, joinedAt: rejoinJoinedAt, leftAt: null, status: 'active' },
    ]);

    const res = await agent.get('/api/sessions/s1');

    expect(res.status).toBe(200);
    expect(res.body.tableCharge).toBe(3750);
    expect(res.body.players).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerNumber: 2, shareCents: 2500 }),
      expect.objectContaining({ playerNumber: 3, shareCents: 1250 }),
    ]));
  });

  test('splits each hourly slot between non-subscribers active at slot start', async () => {
    const joinedAt = new Date(Date.now() - 91 * 60000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 2, startedAt: joinedAt, status: 'active' });
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '0' });
    prisma.sessionPlayer.findMany.mockResolvedValue([
      { id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt, leftAt: null, status: 'active' },
      { id: 'p2', sessionId: 's1', playerNumber: 2, isSubscriber: false, joinedAt, leftAt: null, status: 'active' },
    ]);

    const res = await agent.get('/api/sessions/s1');

    expect(res.status).toBe(200);
    expect(res.body.tableCharge).toBe(5000);
    expect(res.body.players).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerNumber: 1, shareCents: 2500 }),
      expect.objectContaining({ playerNumber: 2, shareCents: 2500 }),
    ]));
  });

  describe('item writes', () => {
    const item = { id: 'i1', sessionId: 's1', type: 'drink', description: 'Tea', quantity: 2, unitPrice: 300, totalCents: 600, vatRatePercent: 20, voidedAt: null };

    beforeEach(() => {
      prisma.tabLineItem.findUnique.mockResolvedValue(item);
      prisma.tabLineItem.create.mockImplementation(async ({ data }) => ({ id: 'i2', ...data }));
    });

    test.each(['/api/sessions/s1/items/i1', '/api/tab-items/i1'])('voids via %s under the session lock', async (url) => {
      const res = await agent.delete(url).query({ reason: 'mistake' });
      expect(res.status).toBe(204);
      expect(prisma.tabLineItem.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), 's1');
      expect(prisma.tabLineItem.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: expect.objectContaining({ voidedAt: expect.any(Date), voidReason: 'mistake' }) });
      expect(prisma.$executeRawUnsafe.mock.invocationCallOrder[0]).toBeLessThan(prisma.tabLineItem.update.mock.invocationCallOrder[0]);
    });

    test('rejects a session/item mismatch without changing the item', async () => {
      const res = await agent.delete('/api/sessions/other/items/i1');
      expect(res.status).toBe(404);
      expect(prisma.tabLineItem.update).not.toHaveBeenCalled();
    });

    test('corrects a historical ended session atomically with a linked replacement', async () => {
      prisma.session.findUnique.mockResolvedValue({ id: 's1', status: 'ended' });
      const res = await agent.patch('/api/tab-items/i1').send({ totalCents: 480 });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ correctedFromId: 'i1', totalCents: 480, vatAmountCents: 80 });
      expect(prisma.tabLineItem.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: expect.objectContaining({ voidReason: 'corrected: amount changed' }) });
      expect(prisma.tabLineItem.update.mock.invocationCallOrder[0]).toBeLessThan(prisma.tabLineItem.create.mock.invocationCallOrder[0]);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    test.each(['cancelled', 'missing'])('rejects writes when the session is %s', async (status) => {
      prisma.session.findUnique.mockResolvedValue(status === 'missing' ? null : { id: 's1', status });
      const res = await agent.patch('/api/tab-items/i1').send({ totalCents: 480 });
      expect(res.status).toBe(status === 'missing' ? 404 : 409);
      expect(prisma.tabLineItem.update).not.toHaveBeenCalled();
      expect(prisma.tabLineItem.create).not.toHaveBeenCalled();
    });

    test('rejects an item voided while waiting for the lock', async () => {
      prisma.tabLineItem.findUnique.mockResolvedValueOnce(item).mockResolvedValueOnce({ ...item, voidedAt: new Date() });
      const res = await agent.patch('/api/tab-items/i1').send({ totalCents: 480 });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('item_already_voided');
      expect(prisma.tabLineItem.update).not.toHaveBeenCalled();
      expect(prisma.tabLineItem.create).not.toHaveBeenCalled();
    });
  });

  describe('pending order cancellation', () => {
    const order = { id: 'o1', sessionId: 's1', status: 'pending' };

    test.each(['active', 'ended'])('cancels a pending order on a %s session under lock', async (status) => {
      prisma.session.findUnique.mockResolvedValue({ id: 's1', status });
      prisma.pendingOrder.findUnique.mockResolvedValue(order);
      const res = await agent.post('/api/pending-orders/o1/cancel');
      expect(res.status).toBe(200);
      expect(prisma.pendingOrder.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_xact_lock'), 's1');
      expect(prisma.pendingOrder.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { status: 'cancelled', fulfilledAt: expect.any(Date) } });
    });

    test.each(['fulfilled', 'cancelled'])('does not overwrite an order that became %s while waiting', async (status) => {
      prisma.pendingOrder.findUnique.mockResolvedValueOnce(order).mockResolvedValueOnce({ ...order, status });
      const res = await agent.post('/api/pending-orders/o1/cancel');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('already_resolved');
      expect(prisma.pendingOrder.update).not.toHaveBeenCalled();
    });

    test('does not update a missing session or missing order', async () => {
      prisma.pendingOrder.findUnique.mockResolvedValue(order);
      prisma.session.findUnique.mockResolvedValue(null);
      expect((await agent.post('/api/pending-orders/o1/cancel')).status).toBe(404);
      prisma.pendingOrder.findUnique.mockResolvedValue(null);
      expect((await agent.post('/api/pending-orders/o1/cancel')).status).toBe(404);
      expect(prisma.pendingOrder.update).not.toHaveBeenCalled();
    });
  });

  describe('cancellation', () => {
    beforeEach(() => {
      prisma.state.payments = [];
      prisma.state.receipts = [];
      prisma.session.update.mockImplementation(async ({ data }) => ({ id: 's1', ...data }));
    });

    test('cancels an empty active session without checkout, payment, invoice, or usage writes', async () => {
      const res = await agent.post('/api/sessions/s1/cancel');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, id: 's1', status: 'cancelled' });
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          status: 'cancelled',
          endedAt: expect.any(Date),
          pin: null,
          lookingForPlayersCount: null,
          lookingForPlayersUpTo: false,
        },
      });
      const tableRelease = prisma.$executeRawUnsafe.mock.calls.find(call => String(call[0]).includes('UPDATE "PoolTable"'));
      expect(tableRelease[1]).toBe('t1');
      expect(tableRelease[0]).toContain('NOT EXISTS');
      expect(prisma.$executeRawUnsafe.mock.calls.some(call => String(call[0]).includes('total_used_seconds'))).toBe(false);
      expect(prisma.state.receipts).toHaveLength(0);
      expect(prisma.state.receipts).toHaveLength(0);
      expect(prisma.state.payments).toHaveLength(0);
      expect(prisma.tabLineItem.create).not.toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe.mock.calls[0][0]).toContain('pg_advisory_xact_lock');
      expect(prisma.$executeRawUnsafe.mock.invocationCallOrder[0]).toBeLessThan(prisma.session.update.mock.invocationCallOrder[0]);
    });

    test('does not record a cancellation before its start', async () => {
      const startedAt = new Date(Date.now() + 60000);
      prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', status: 'active', startedAt });
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(200);
      expect(prisma.session.update.mock.calls[0][0].data.endedAt).toEqual(startedAt);
    });

    test('returns session_not_found for an unknown session', async () => {
      prisma.session.findUnique.mockResolvedValue(null);
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'session_not_found' });
      expect(prisma.session.update).not.toHaveBeenCalled();
    });

    test.each(['ended', 'cancelled'])('returns session_not_active for a %s session without releasing a table', async (status) => {
      prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', status });
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'session_not_active' });
      expect(prisma.session.update).not.toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe.mock.calls.some(call => String(call[0]).includes('UPDATE "PoolTable"'))).toBe(false);
    });

    test('blocks voided sales and does not treat metadata as activity', async () => {
      prisma.tabLineItem.findFirst.mockResolvedValue({ id: 'voided-sale', voidedAt: new Date() });
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'session_has_activity' });
      expect(prisma.tabLineItem.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ sessionId: 's1', OR: expect.any(Array) }),
        select: { id: true },
      });
      expect(prisma.session.update).not.toHaveBeenCalled();
    });

    test.each(['pending', 'fulfilled'])('blocks %s orders', async (status) => {
      prisma.pendingOrder.findFirst.mockResolvedValue({ id: 'order1', status });
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'session_has_activity' });
      expect(prisma.pendingOrder.findFirst).toHaveBeenCalledWith({
        where: { sessionId: 's1', status: { in: ['pending', 'fulfilled'] } },
        select: { id: true },
      });
    });

    test('blocks settled players even when their settlement amount was zero', async () => {
      prisma.sessionPlayer.findFirst.mockResolvedValue({ id: 'player1', status: 'settled', settledTableCents: 0 });
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'session_has_activity' });
      expect(prisma.session.update).not.toHaveBeenCalled();
    });

    test('blocks receipts', async () => {
      prisma.state.receipts.push({ id: 'receipt1', sessionId: 's1' });
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'session_has_activity' });
    });

    test('blocks transactions', async () => {
      prisma.transaction.findFirst.mockResolvedValue({ id: 'transaction1', sessionId: 's1' });
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'session_has_activity' });
    });

    test.each(['pending', 'captured', 'voided', 'refunded'])('blocks %s payments', async (status) => {
      prisma.state.payments.push({ id: `payment-${status}`, sessionId: 's1', status });
      const res = await agent.post('/api/sessions/s1/cancel');
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'session_has_activity' });
      expect(prisma.session.update).not.toHaveBeenCalled();
    });
  });

  test('applies the subscriber discount from the next slot after a subscriber joins', async () => {
    const nonSubscriberJoinedAt = new Date(Date.now() - 91 * 60000).toISOString();
    const subscriberJoinedAt = new Date(Date.now() - 35 * 60000).toISOString();
    prisma.session.findUnique.mockResolvedValue({ id: 's1', tableId: 't1', numberOfPlayers: 2, startedAt: nonSubscriberJoinedAt, status: 'active' });
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'tt1', base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue({ key: 'subscriber_discount', value: '50' });
    prisma.sessionPlayer.findMany.mockResolvedValue([
      { id: 'p1', sessionId: 's1', playerNumber: 1, isSubscriber: false, joinedAt: nonSubscriberJoinedAt, leftAt: null, status: 'active' },
      { id: 'p2', sessionId: 's1', playerNumber: 2, isSubscriber: true, joinedAt: subscriberJoinedAt, leftAt: null, status: 'active' },
    ]);

    const res = await agent.get('/api/sessions/s1');

    expect(res.status).toBe(200);
    expect(res.body.tableCharge).toBe(3750);
    expect(res.body.players).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerNumber: 1, shareCents: 3750 }),
      expect.objectContaining({ playerNumber: 2, isSubscriber: true, shareCents: 0 }),
    ]));
  });
});
