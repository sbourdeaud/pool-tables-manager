const request = require('supertest');
const oidc = require('openid-client');
const { restoreStatefulMocks } = require('./helpers/authBypass');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
jest.mock('../src/backup', () => ({
  createBackupService: () => ({ importFrom: async buffer => ({ ok: true, sizeBytes: buffer.length }) })
}));
const prisma = require('../src/prismaClient');
const app = require('../server');

async function tokenFor(agent) {
  const res = await agent.get('/api/csrf-token');
  expect(res.status).toBe(200);
  return res.body.token;
}

beforeEach(() => {
  jest.resetAllMocks();
  restoreStatefulMocks(prisma);
  prisma.state.mockSettings = {};
});

afterEach(() => jest.restoreAllMocks());

test('GET issues a stable session-bound token without authentication, database access, caching, or CORS access', async () => {
  const agent = request.agent(app);
  const first = await agent.get('/api/csrf-token');
  expect(first.status).toBe(200);
  expect(first.body.token).toMatch(/^[a-f0-9]{256}$/);
  expect(first.headers['cache-control']).toBe('no-store');
  expect(first.headers['access-control-allow-origin']).toBeUndefined();
  expect(first.headers.vary).toContain('Origin');
  expect(first.headers.vary).toContain('Sec-Fetch-Site');
  expect(first.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(first.headers['set-cookie'][0]).toContain('SameSite=Lax');
  expect(await tokenFor(agent)).toBe(first.body.token);
  expect(await tokenFor(request.agent(app))).not.toBe(first.body.token);
  expect(prisma.setting.findMany).not.toHaveBeenCalled();
});

test.each([
  ['Origin', 'https://attacker.example'],
  ['Origin', 'null'],
  ['Sec-Fetch-Site', 'cross-site'],
  ['Sec-Fetch-Site', 'same-site'],
])('token issuance rejects %s: %s without initializing a session', async (header, value) => {
  const res = await request(app).get('/api/csrf-token').set(header, value);
  expect(res.status).toBe(403);
  expect(res.body.error).toBe('cross_origin_request');
  expect(res.headers['cache-control']).toBe('no-store');
  expect(res.headers['access-control-allow-origin']).toBeUndefined();
  expect(res.headers['set-cookie']).toBeUndefined();
});

test('token issuance accepts same-origin fetches behind a TLS reverse proxy', async () => {
  const res = await request(app).get('/api/csrf-token')
    .set('Host', 'pool.example').set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://pool.example').set('Sec-Fetch-Site', 'same-origin');
  expect(res.status).toBe(200);
});

const mutations = [
  ['post', '/api/auth/local-setup'],
  ['post', '/auth/local/login'],
  ['post', '/api/auth/local-rotate'],
  ['delete', '/api/auth/local-clear'],
  ['post', '/auth/logout'],
  ['patch', '/api/settings'],
  ['put', '/api/table-types/type-1'],
  ['post', '/api/admin/backup/import'],
  ['post', '/api/table-background-images'],
  ['delete', '/api/table-background-images/image-1'],
  ['post', '/api/public/table/1/order'],
  ['post', '/api/public/table/1/looking-for-players'],
  ['post', '/api/public/table/1/looking-for-players/cancel'],
  ['post', '/api/public/table/1/looking-for-players/fulfill'],
];

test.each(mutations)('%s %s rejects missing, incorrect, and foreign-session tokens before handlers', async (method, url) => {
  const agent = request.agent(app);
  const foreign = await tokenFor(request.agent(app));
  const own = await tokenFor(agent);
  for (const token of [undefined, 'wrong-token', foreign]) {
    const req = agent[method](url);
    if (token) req.set('x-csrf-token', token);
    const res = await req.send({ pin: '0000', password: 'password123' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('invalid_csrf_token');
  }
  const noSession = await request(app)[method](url).set('x-csrf-token', own).send({});
  expect(noSession.status).toBe(403);
  expect(noSession.body.error).toBe('invalid_csrf_token');
  expect(prisma.setting.findMany).not.toHaveBeenCalled();
  expect(prisma.setting.upsert).not.toHaveBeenCalled();
  expect(prisma.session.updateMany).not.toHaveBeenCalled();
});

test('tokens in query strings and JSON bodies are not accepted instead of the header', async () => {
  const agent = request.agent(app);
  const token = await tokenFor(agent);
  const res = await agent.patch('/api/settings').query({ _csrf: token }).send({ _csrf: token, csrfToken: token });
  expect(res.status).toBe(403);
  expect(prisma.setting.upsert).not.toHaveBeenCalled();
});

test('local setup and login require tokens, login rotates the session, and logout cannot be forged by GET', async () => {
  const agent = request.agent(app);
  const initial = await tokenFor(agent);
  const setup = await agent.post('/api/auth/local-setup').set('x-csrf-token', initial).send({ password: 'password123' });
  expect(setup.status).toBe(200);
  const login = await agent.post('/auth/local/login').set('x-csrf-token', initial).send({ username: 'admin', password: 'password123' });
  expect(login.status).toBe(200);
  const stale = await agent.patch('/api/settings').set('x-csrf-token', initial).send({ currency: 'EUR' });
  expect(stale.status).toBe(403);
  const current = await tokenFor(agent);
  expect(current).not.toBe(initial);
  const patch = await agent.patch('/api/settings').set('x-csrf-token', current).send({ currency: 'EUR' });
  expect(patch.status).toBe(200);
  expect((await agent.get('/auth/logout')).status).toBe(405);
  expect((await agent.get('/api/auth/info')).body.authenticated).toBe(true);
  expect((await agent.post('/auth/logout')).status).toBe(403);
  expect((await agent.get('/api/auth/info')).body.authenticated).toBe(true);
  const logout = await agent.post('/auth/logout').set('x-csrf-token', current);
  expect(logout.status).toBe(200);
  expect(logout.body).toEqual({ redirect: '/' });
  expect((await agent.get('/api/auth/info')).body.authenticated).toBe(false);
  expect((await agent.patch('/api/settings').set('x-csrf-token', current).send({ currency: 'USD' })).status).toBe(403);
  expect(await tokenFor(agent)).not.toBe(current);
});

test('raw backup uploads keep their bytes and require a header token', async () => {
  const agent = request.agent(app);
  const bytes = Buffer.from([0, 255, 10, 13, 128]);
  const rejected = await agent.post('/api/admin/backup/import').set('Content-Type', 'application/octet-stream').send(bytes);
  expect(rejected.status).toBe(403);
  const token = await tokenFor(agent);
  const accepted = await agent.post('/api/admin/backup/import').set('x-csrf-token', token).set('Content-Type', 'application/octet-stream').send(bytes);
  expect(accepted.status).toBe(200);
  expect(accepted.body.sizeBytes).toBe(bytes.length);
});

test('public PIN-authorized writes require CSRF before PIN checks and still succeed with both', async () => {
  const agent = request.agent(app);
  const token = await tokenFor(agent);
  prisma.poolTable.findMany.mockResolvedValue([{ id: 'table-1' }]);
  prisma.session.findMany.mockResolvedValue([{ id: 'session-1', pin: '0000', status: 'active' }]);
  prisma.session.updateMany.mockResolvedValue({ count: 1 });
  const denied = await agent.post('/api/public/table/1/looking-for-players').set('x-csrf-token', token).send({ pin: '9999', count: 2, upTo: false });
  expect(denied.status).toBe(403);
  expect(denied.body.error).not.toBe('invalid_csrf_token');
  const allowed = await agent.post('/api/public/table/1/looking-for-players').set('x-csrf-token', token).send({ pin: '0000', count: 2, upTo: false });
  expect(allowed.status).toBe(200);
  expect(prisma.session.updateMany).toHaveBeenCalledTimes(1);
});

test('OIDC GET redirects and state/PKCE callback work without CSRF headers and rotate the session', async () => {
  prisma.state.mockSettings = { oidc_enabled: 'true', oidc_issuer: 'https://identity.example', oidc_client_id: 'csrf-test', oidc_redirect_uri: 'http://pool.example/auth/callback' };
  jest.spyOn(oidc, 'discovery').mockResolvedValue({});
  jest.spyOn(oidc, 'randomPKCECodeVerifier').mockReturnValue('verifier');
  jest.spyOn(oidc, 'calculatePKCECodeChallenge').mockResolvedValue('challenge');
  jest.spyOn(oidc, 'randomState').mockReturnValue('expected-state');
  jest.spyOn(oidc, 'buildAuthorizationUrl').mockReturnValue(new URL('https://identity.example/authorize'));
  const grant = jest.spyOn(oidc, 'authorizationCodeGrant').mockImplementation(async (config, url, checks) => {
    expect(checks).toEqual({ pkceCodeVerifier: 'verifier', expectedState: 'expected-state' });
    if (url.searchParams.get('state') !== checks.expectedState) throw new Error('invalid state');
    return { access_token: 'access', id_token: 'id-token', claims: () => ({ sub: 'user-1' }) };
  });
  jest.spyOn(oidc, 'fetchUserInfo').mockResolvedValue({ sub: 'user-1' });
  const agent = request.agent(app);
  const initial = await tokenFor(agent);
  expect((await agent.get('/auth/login')).headers.location).toBe('https://identity.example/authorize');
  jest.spyOn(console, 'error').mockImplementation(() => {});
  expect((await agent.get('/auth/callback?code=code&state=wrong')).status).toBe(500);
  expect((await agent.get('/api/auth/info')).body.authenticated).toBe(false);
  const callback = await agent.get('/auth/callback?code=code&state=expected-state');
  expect(callback.status).toBe(302);
  expect(callback.headers.location).toBe('/');
  expect(grant).toHaveBeenCalledTimes(2);
  expect((await agent.get('/api/auth/info')).body.authenticated).toBe(true);
  const current = await tokenFor(agent);
  expect(current).not.toBe(initial);
  const endSession = jest.spyOn(oidc, 'buildEndSessionUrl').mockReturnValue(new URL('https://identity.example/logout'));
  const logout = await agent.post('/auth/logout').set('x-csrf-token', current);
  expect(logout.body).toEqual({ redirect: 'https://identity.example/logout' });
  expect(endSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id_token_hint: 'id-token' }));
});

test.each([
  ['post', '/api/webhooks/stripe/extra'],
  ['put', '/api/webhooks/stripe'],
  ['post', '/auth/callback'],
  ['post', '/api/public/table/1/order'],
])('no broad webhook, OIDC or public exemption for %s %s', async (method, url) => {
  const res = await request(app)[method](url).send({});
  expect(res.status).toBe(403);
  expect(res.body.error).toBe('invalid_csrf_token');
});
