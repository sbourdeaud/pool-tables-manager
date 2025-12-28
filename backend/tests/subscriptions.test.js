const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Subscriptions', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    prisma.state.users = [];
    prisma.state.subscriptions = [];
    setupAuthBypass(prisma);
  });

  test('POST /api/subscriptions creates subscription and patron if needed', async () => {
    const res = await agent.post('/api/subscriptions').send({ patron_name: 'Charlie', patron_email: 'c@c.com', plan_name: 'monthly', monthly_fee_cents: 1000 });
    expect(res.status).toBe(201);
    expect(res.body.plan_name).toBe('monthly');
  });

  test('DELETE /api/subscriptions/:id deletes subscription', async () => {
    // Add a subscription to state first
    prisma.state.subscriptions.push({ id: 's1', patronId: 'u1', plan_name: 'test', monthly_fee_cents: 1000 });
    const res = await agent.delete('/api/subscriptions/s1');
    expect([200,204]).toContain(res.status);
  });
});
