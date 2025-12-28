const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

describe('Local auth flows', () => {
  const agent = request.agent(app);

  beforeEach(() => {
    // reset mock settings
    prisma.state.mockSettings = {};
    // ensure oidc disabled by default
    prisma.state.mockSettings['oidc_enabled'] = 'false';
    jest.clearAllMocks();
  });

  test('GET /api/auth/info shows no local admin initially', async () => {
    const res = await agent.get('/api/auth/info');
    expect(res.status).toBe(200);
    expect(res.body.oidc_enabled).toBe(false);
    expect(res.body.local_admin_setup).toBe(false);
  });

  test('Create local admin, login, rotate, and clear', async () => {
    // create local admin
    const pw = 'testpass123';
    const createRes = await agent.post('/api/auth/local-setup').send({ password: pw });
    expect(createRes.status).toBe(200);
    expect(prisma.state.mockSettings['local_admin_password_hash']).toBeDefined();

    // info should report configured
    const infoRes = await agent.get('/api/auth/info');
    expect(infoRes.body.local_admin_setup).toBe(true);

    // login with admin user (server expects username 'admin')
    const loginRes = await agent.post('/auth/local/login').send({ username: 'admin', password: pw });
    expect(loginRes.status).toBe(200);

    // attempt rotate password
    const newPw = 'newPass456';
    const rotateRes = await agent.post('/api/auth/local-rotate').send({ currentPassword: pw, newPassword: newPw });
    expect(rotateRes.status).toBe(200);

    // logout by destroying session cookie (simulate new agent)
    // create a fresh agent and login with new password
    const agent2 = request.agent(app);
    const login2 = await agent2.post('/auth/local/login').send({ username: 'admin', password: newPw });
    expect(login2.status).toBe(200);

    // now clear local admin
    const clearRes = await agent2.delete('/api/auth/local-clear');
    expect(clearRes.status).toBe(200);
    expect(prisma.state.mockSettings['local_admin_password_hash']).toBeUndefined();
  });
});
