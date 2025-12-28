const request = require('supertest');
const { setupAuthBypass, restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Patrons', () => {
  const agent = request.agent(app);
  beforeEach(() => {
    prisma.state.users = [];
    jest.resetAllMocks();
    restoreStatefulMocks(prisma);
    setupAuthBypass(prisma);
  });

  test('POST /api/patrons creates a patron', async () => {
    const res = await agent.post('/api/patrons').send({ name: 'Bob', email: 'b@b.com' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Bob');
  });

  test('GET /api/patrons returns list (requires auth but passes when no auth configured)', async () => {
    const res = await agent.get('/api/patrons');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
