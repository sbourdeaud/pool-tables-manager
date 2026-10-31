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

  test('GET /api/settings never exposes secrets to unauthenticated callers', async () => {
    prisma.state.mockSettings['currency'] = '€';
    prisma.state.mockSettings['app_name'] = 'Hall';
    prisma.state.mockSettings['local_admin_password_hash'] = '$2a$10$secret';
    prisma.state.mockSettings['oidc_client_secret'] = 'super-secret';
    prisma.state.mockSettings['smtp_pass'] = 'smtp-secret';

    const res = await agent.get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.currency).toBe('€');
    expect(res.body.app_name).toBe('Hall');
    expect(res.body.local_admin_password_hash).toBeUndefined();
    expect(res.body.oidc_client_secret).toBeUndefined();
    expect(res.body.smtp_pass).toBeUndefined();
    expect(res.body.smtp_pass_set).toBeUndefined();
  });

  test('PATCH /api/settings allowed when no auth configured', async () => {
    const res = await agent.patch('/api/settings').send({ currency: '€' });
    expect(res.status).toBe(200);
    expect(res.body.currency).toBe('€');
  });
});
