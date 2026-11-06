const request = require('supertest');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

jest.mock('../src/prismaClient', () => require('./__mocks__/src/prismaClient'));
const prisma = require('../src/prismaClient');
const app = require('../server');

function swaggerConfig(fetch = jest.fn()) {
  const html = fs.readFileSync(path.join(__dirname, '../public/api-docs.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/i)[1];
  const window = { location: new URL('https://pool.example/api-docs') };
  vm.runInNewContext(script, { window, URL, fetch, SwaggerUIBundle: config => config });
  return window.ui;
}

describe('Swagger UI CSRF', () => {
  test.each(['POST', 'put', 'PATCH', 'DELETE'])('%s obtains a fresh token with safe fetch settings', async method => {
    const fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'first-token' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'new-session-token' }) });
    const config = swaggerConfig(fetch);
    expect(config.withCredentials).toBe(false);
    const req = { url: '/api/settings', method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'stale' } };
    expect(await config.requestInterceptor(req)).toBe(req);
    expect(req.headers).toEqual({ 'Content-Type': 'application/json', 'x-csrf-token': 'first-token' });
    expect(req.credentials).toBe('same-origin');
    expect(req.mode).toBe('same-origin');
    expect(req.redirect).toBe('error');
    await config.requestInterceptor(req);
    expect(req.headers['x-csrf-token']).toBe('new-session-token');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith('/api/csrf-token', {
      credentials: 'same-origin', mode: 'same-origin', cache: 'no-store', redirect: 'error',
    });
  });

  test.each(['GET', 'head', 'OPTIONS', undefined])('%s does not acquire or send a token', async method => {
    const fetch = jest.fn();
    const req = await swaggerConfig(fetch).requestInterceptor({
      url: 'https://pool.example/api/csrf-token', method, headers: { 'X-CSRF-TOKEN': 'stale' },
    });
    expect(req.headers).toEqual({});
    expect(req.credentials).toBe('same-origin');
    expect(fetch).not.toHaveBeenCalled();
  });

  test.each([
    'https://attacker.example/api/settings',
    '//attacker.example/api/settings',
    'https://pool.example.attacker.example/api/settings',
    'http://pool.example/api/settings',
    'https://pool.example:444/api/settings',
  ])('does not leak tokens or cookies to %s', async url => {
    const fetch = jest.fn();
    const req = await swaggerConfig(fetch).requestInterceptor({
      url, method: 'POST', credentials: 'include', headers: { 'x-csrf-token': 'secret' },
    });
    expect(req.headers).toEqual({});
    expect(req.credentials).toBe('omit');
    expect(fetch).not.toHaveBeenCalled();
  });

  test.each([
    { ok: false, status: 403 },
    { ok: true, json: async () => ({}) },
    { ok: true, json: async () => ({ token: '' }) },
    { ok: true, json: async () => ({ token: 123 }) },
    { ok: true, json: async () => { throw new Error('Invalid JSON'); } },
  ])('fails closed on an unusable token response %#', async response => {
    const fetch = jest.fn().mockResolvedValueOnce(response).mockResolvedValueOnce({
      ok: true, json: async () => ({ token: 'recovered' }),
    });
    const config = swaggerConfig(fetch);
    const req = { url: '/auth/local/login', method: 'POST' };
    await expect(config.requestInterceptor(req)).rejects.toThrow();
    expect(req.headers['x-csrf-token']).toBeUndefined();
    expect((await config.requestInterceptor(req)).headers['x-csrf-token']).toBe('recovered');
  });

  test('network failure is not cached', async () => {
    const fetch = jest.fn().mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
      ok: true, json: async () => ({ token: 'recovered' }),
    });
    const config = swaggerConfig(fetch);
    await expect(config.requestInterceptor({ url: '/auth/logout', method: 'POST' })).rejects.toThrow('Network error');
    expect((await config.requestInterceptor({ url: '/auth/logout', method: 'POST' })).headers['x-csrf-token']).toBe('recovered');
  });

  test('Try it out can log out again after session destruction', async () => {
    const agent = request.agent(app);
    const fetch = jest.fn(async url => {
      const res = await agent.get(url);
      return { ok: res.status === 200, status: res.status, json: async () => res.body };
    });
    const config = swaggerConfig(fetch);
    const tokens = [];
    for (let i = 0; i < 2; i++) {
      const req = await config.requestInterceptor({ url: '/auth/logout', method: 'POST' });
      tokens.push(req.headers['x-csrf-token']);
      const res = await agent.post(req.url).set(req.headers);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ redirect: '/' });
    }
    expect(tokens[0]).not.toBe(tokens[1]);
  });

  test('OpenAPI describes token acquisition and POST logout JSON redirect', () => {
    const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/openapi.json'), 'utf8'));
    const token = spec.paths['/api/csrf-token'].get;
    expect(token.security).toEqual([]);
    expect(token.responses['200'].content['application/json'].schema.required).toContain('token');
    expect(token.responses['200'].headers['Cache-Control'].schema.enum).toEqual(['no-store']);
    expect(spec.components.securitySchemes.csrfToken).toMatchObject({ type: 'apiKey', in: 'header', name: 'x-csrf-token' });
    const logout = spec.paths['/auth/logout'];
    expect(logout.get).toBeUndefined();
    expect(logout.post.responses['302']).toBeUndefined();
    expect(logout.post.responses['200'].content['application/json'].schema.required).toContain('redirect');
    expect(logout.post.security).toEqual([{ csrfToken: [] }]);
  });
});

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
