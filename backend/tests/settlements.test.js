const request = require('supertest');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const { setupAuthBypass } = require('./helpers/authBypass');
const app = require('../server');

describe('Settlement / Checkout flows', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  test('POST /api/sessions/:id/settle handles table settlement and item adjustments', async () => {
    // Simulate subscriber meta present
    prisma.tabLineItem.findFirst.mockResolvedValue({ id: 'meta1', quantity: 1 });
    // Simulate the selected tab item being retrieved for settlement
    prisma.tabLineItem.findUnique.mockResolvedValue({ id: 'item1', sessionId: 's1', type: 'drink', description: 'Beer', quantity: 2, unitPrice: 600, totalCents: 1200, vatRatePercent: 20, voidedAt: null });
    // Simulate original item retrieval
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'item1', session_id: 's1', description: 'Beer', quantity: 2, unit_price: 600, total_cents: 1200 }]);
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.post('/api/sessions/s1/settle').send({ tableSettlementCents: 500, items: [{ itemId: 'item1', quantity: 1 }], isSubscriber: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
