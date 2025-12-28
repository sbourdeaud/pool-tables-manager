const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Settings endpoints', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    prisma.state.mockSettings = {};
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    setupAuthBypass(prisma);
  });

  test('GET /api/settings returns object', async () => {
    prisma.state.mockSettings['currency'] = '$';
    const res = await agent.get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.currency).toBe('$');
  });

  test('PATCH /api/settings allowed when no auth configured', async () => {
    const res = await agent.patch('/api/settings').send({ currency: '€' });
    expect(res.status).toBe(200);
    expect(res.body.currency).toBe('€');
  });
});
