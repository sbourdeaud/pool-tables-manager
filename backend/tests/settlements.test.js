const request = require('supertest');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Settlement / Checkout flows', () => {
  const agent = request.agent(app);
  beforeEach(() => jest.resetAllMocks());

  test('POST /api/sessions/:id/settle handles table settlement and item adjustments', async () => {
    // Simulate subscriber meta present
    prisma.tabLineItem.findFirst.mockResolvedValue({ id: 'meta1', quantity: 1 });
    // Simulate original item retrieval
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'item1', session_id: 's1', description: 'Beer', quantity: 2, unit_price: 600, total_cents: 1200 }]);
    prisma.$executeRawUnsafe.mockResolvedValue({});

    const res = await agent.post('/api/sessions/s1/settle').send({ tableSettlementCents: 500, items: [{ itemId: 'item1', quantity: 1 }], isSubscriber: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
