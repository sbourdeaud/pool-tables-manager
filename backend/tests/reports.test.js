const request = require('supertest');
const { setupAuthBypass } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Reports', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    jest.resetAllMocks();
    setupAuthBypass(prisma);
  });

  test('GET /api/reports/financial returns error when weekDate missing for week', async () => {
    const res = await agent.get('/api/reports/financial').query({ periodType: 'week' });
    expect(res.status).toBe(400);
  });

  test('GET /api/reports/financial returns totals with empty DB', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.tabLineItem.findFirst.mockResolvedValue(null);
    prisma.tabLineItem.findMany.mockResolvedValue([]);
    prisma.subscription.findMany.mockResolvedValue([]);
    const res = await agent.get('/api/reports/financial').query({ periodType: 'year', year: '2025' });
    expect(res.status).toBe(200);
    expect(res.body.totalRevenue).toBeDefined();
  });
});
