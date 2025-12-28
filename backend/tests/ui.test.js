const request = require('supertest');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('UI / public endpoints', () => {
  const agent = request.agent(app);

  test('GET /health', async () => {
    const res = await agent.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/drinks returns localized list', async () => {
    prisma.drink.findMany.mockResolvedValue([{ id: 'd1', name_en: 'Beer', name_fr: 'Bière', price_cents: 600, taxable: true }]);
    const res = await agent.get('/api/drinks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
