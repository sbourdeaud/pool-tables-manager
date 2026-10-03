const request = require('supertest');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Table usage / maintenance tracking', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  test('GET /api/tables exposes lifetime and since-maintenance usage', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([
      { id: 'tbl-1', table_type_id: 'tt-1', number: 1, status: 'available', total_used_seconds: 7200, used_since_maintenance_seconds: 1800, created_at: new Date() }
    ]);
    const res = await agent.get('/api/tables');
    expect(res.status).toBe(200);
    expect(res.body[0].totalUsedSeconds).toBe(7200);
    expect(res.body[0].usedSinceMaintenanceSeconds).toBe(1800);
  });

  test('ending a session accumulates its duration onto the table usage counters', async () => {
    const startedAt = new Date(Date.now() - 3661 * 1000); // ~1h1m ago
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'sess-1', table_id: 'tbl-1', started_at: startedAt }]);
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.patch('/api/sessions/sess-1/end');
    expect(res.status).toBe(200);

    const usageCall = prisma.$executeRawUnsafe.mock.calls.find(c => String(c[0]).includes('total_used_seconds'));
    expect(usageCall).toBeTruthy();
    // Second arg is the elapsed seconds; second-to-last is the table id
    expect(usageCall[1]).toBeGreaterThanOrEqual(3660);
    expect(usageCall[2]).toBe('tbl-1');
  });

  test('checkout accumulates usage (table_time + usage update in transaction)', async () => {
    const startedAt = new Date(Date.now() - 3600 * 1000);
    prisma.session.findUnique.mockResolvedValue({ id: 'sess-1', tableId: 'tbl-1', status: 'active', startedAt, numberOfPlayers: 1 });
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ base_hourly_cents: 2500, vat_rate_percent: 20 }]);
    prisma.setting.findUnique.mockResolvedValue(null);

    const tx = {
      tabLineItem: { create: jest.fn(async () => ({})) },
      receipt: { create: jest.fn(async () => ({ number: 1, year: 2026, totalTtcCents: 2500, subtotalHtCents: 2083, vatCents: 417, discountCents: 0, itemsJson: JSON.stringify([{ description: 'Table Time', quantity: 1, unitPrice: 2500, totalCents: 2500, vatRatePercent: 20 }]) })) },
      $executeRawUnsafe: jest.fn(async () => ({})),
      $queryRawUnsafe: jest.fn(async () => [{ next: 1 }])
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));

    const res = await agent.post('/api/sessions/sess-1/checkout').send({});
    expect(res.status).toBe(200);
    const usageCall = tx.$executeRawUnsafe.mock.calls.find(c => String(c[0]).includes('total_used_seconds'));
    expect(usageCall).toBeTruthy();
    expect(usageCall[2]).toBe('tbl-1');
    // The receipt payload must carry everything needed to print the invoice
    expect(res.body.receiptNumber).toBe(1);
    expect(res.body.vatCents).toBe(417);
    expect(res.body.subtotalHtCents).toBe(2083);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0].vatRatePercent).toBe(20);
  });

  test('leaving maintenance resets the since-maintenance counter but not lifetime', async () => {
    // First raw call: current status lookup. Second: the UPDATE ... RETURNING.
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ status: 'maintenance' }])
      .mockResolvedValueOnce([{ id: 'tbl-1', table_type_id: 'tt-1', number: 1, status: 'available', total_used_seconds: 7200, used_since_maintenance_seconds: 0, created_at: new Date() }]);

    const res = await agent.put('/api/tables/tbl-1').send({ status: 'available' });
    expect(res.status).toBe(200);
    expect(res.body.totalUsedSeconds).toBe(7200);
    expect(res.body.usedSinceMaintenanceSeconds).toBe(0);

    const updateSql = String(prisma.$queryRawUnsafe.mock.calls[1][0]);
    expect(updateSql).toContain('used_since_maintenance_seconds = 0');
  });

  test('table type accepts an optional max used hours threshold', async () => {
    prisma.tableType.create.mockResolvedValue({ id: 'tt-9', name_en: 'Pool', maxUsedHours: 4 });
    const res = await agent.post('/api/table-types').send({ name_en: 'Pool', name_fr: 'Pool', base_hourly_cents: 2500, vatRatePercent: 20, maxUsedHours: 4 });
    expect(res.status).toBe(201);
    expect(prisma.tableType.create.mock.calls[0][0].data.maxUsedHours).toBe(4);
  });
});
