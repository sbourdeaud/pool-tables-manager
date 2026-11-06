import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as api from '../src/lib/api.ts'

function mockFetch(t, handler) {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    return handler(url, init, calls)
  })
  return calls
}

test('reads do not create a CSRF session', async (t) => {
  const calls = mockFetch(t, () => Response.json({ currency: 'EUR' }))
  assert.equal((await api.apiGet('/api/settings')).ok, true)
  assert.equal((await api.apiGetSettings()).currency, 'EUR')
  assert.deepEqual(calls.map(call => call.url), ['/api/settings', '/api/settings'])
})

test('concurrent first mutations share one same-origin no-store token fetch', async (t) => {
  let release
  const tokenResponse = new Promise(resolve => { release = resolve })
  const calls = mockFetch(t, (url) => url === '/api/csrf-token' ? tokenResponse : Response.json({ success: true }))
  const pending = [api.apiLocalSetup('password123'), api.apiLocalLogin('password123'), api.apiCancelTableLookingForPlayers('1', '0000')]
  assert.equal(calls.length, 1)
  assert.equal(calls[0].init.credentials, 'same-origin')
  assert.equal(calls[0].init.mode, 'same-origin')
  assert.equal(calls[0].init.cache, 'no-store')
  assert.equal(calls[0].init.redirect, 'error')
  release(Response.json({ token: 'csrf-token' }))
  assert.ok((await Promise.all(pending)).every(result => result.ok))
  assert.equal(calls.length, 4)
  for (const call of calls.slice(1)) {
    assert.equal(call.init.headers.get('x-csrf-token'), 'csrf-token')
    assert.equal(call.init.headers.get('Content-Type'), 'application/json')
    assert.equal(call.init.credentials, 'same-origin')
    assert.equal(call.init.mode, 'same-origin')
  }
})

test('tokens are fetched afresh after login/session rotation and logout remains a protected POST', async (t) => {
  let issued = 0
  const calls = mockFetch(t, (url) => url === '/api/csrf-token'
    ? Response.json({ token: `csrf-${++issued}` })
    : Response.json(url === '/auth/logout' ? { redirect: '/' } : { success: true }))
  await api.apiLocalLogin('password123')
  assert.equal(await api.apiPatchSetting('currency', 'EUR'), 'ok')
  assert.equal((await api.apiLogout()).data.redirect, '/')
  const writes = calls.filter(call => call.url !== '/api/csrf-token')
  assert.deepEqual(writes.map(call => call.init.headers.get('x-csrf-token')), ['csrf-1', 'csrf-2', 'csrf-3'])
  assert.deepEqual(writes.map(call => call.init.method), ['POST', 'PATCH', 'POST'])
  assert.equal(writes[2].url, '/auth/logout')
})

test('only the explicit pre-handler CSRF rejection is retried, once, with a fresh token', async (t) => {
  let issued = 0
  let attempts = 0
  const calls = mockFetch(t, (url) => url === '/api/csrf-token'
    ? Response.json({ token: `csrf-${++issued}` })
    : ++attempts === 1 ? Response.json({ error: 'invalid_csrf_token' }, { status: 403 }) : Response.json({ success: true }))
  assert.equal((await api.apiSend('/api/sessions', 'POST', { tableId: 't1' })).ok, true)
  const writes = calls.filter(call => call.url !== '/api/csrf-token')
  assert.equal(writes.length, 2)
  assert.equal(writes[0].init.body, writes[1].init.body)
  assert.equal(issued, 2)
})

test('persistent CSRF rejection does not loop or retry a third time', async (t) => {
  let writes = 0
  mockFetch(t, (url) => url === '/api/csrf-token' ? Response.json({ token: 'csrf' })
    : (writes++, Response.json({ error: 'invalid_csrf_token' }, { status: 403 })))
  const result = await api.apiSend('/api/settings', 'DELETE')
  assert.equal(result.status, 403)
  assert.equal(writes, 2)
})

for (const [status, error] of [[403, 'invalid_pin'], [401, 'unauthorized'], [409, 'conflict'], [500, 'internal']]) {
  test(`${status} ${error} is not retried and 401 still notifies auth`, async (t) => {
    let notifications = 0
    api.setUnauthorizedHandler(() => { notifications++ })
    t.after(() => api.setUnauthorizedHandler(null))
    const calls = mockFetch(t, (url) => url === '/api/csrf-token' ? Response.json({ token: 'csrf' }) : Response.json({ error }, { status }))
    const result = await api.apiSend('/api/public/table/1/order', 'POST', { pin: '0000' })
    assert.equal(result.status, status)
    assert.equal(calls.length, 2)
    assert.equal(notifications, status === 401 ? 1 : 0)
  })
}

test('raw image and backup uploads preserve content types and bytes with the token header', async (t) => {
  const calls = mockFetch(t, (url) => url === '/api/csrf-token' ? Response.json({ token: 'csrf' }) : Response.json({ id: 'image', ok: true }))
  const bytes = new Uint8Array([0, 255, 128, 10])
  const image = new File([bytes], 'table.png', { type: 'image/png' })
  const archive = new File([bytes], 'backup.dump', { type: 'application/octet-stream' })
  assert.equal((await api.apiUploadTableBackgroundImage(image)).ok, true)
  assert.equal((await api.apiImportBackup(archive)).ok, true)
  const writes = calls.filter(call => call.url !== '/api/csrf-token')
  assert.equal(writes[0].init.headers.get('Content-Type'), 'image/png')
  assert.equal(writes[0].init.body, image)
  assert.equal(writes[1].init.headers.get('Content-Type'), 'application/octet-stream')
  assert.deepEqual(new Uint8Array(writes[1].init.body), bytes)
  assert.ok(writes.every(call => call.init.headers.get('x-csrf-token') === 'csrf'))
})

test('header-only mutations do not acquire a JSON content type', async (t) => {
  const calls = mockFetch(t, (url) => url === '/api/csrf-token' ? Response.json({ token: 'csrf' }) : new Response(null, { status: 204 }))
  assert.equal((await api.apiDeleteTableBackgroundImage('image')).ok, true)
  assert.equal(calls[1].init.headers.has('Content-Type'), false)
  assert.equal(calls[1].init.headers.get('x-csrf-token'), 'csrf')
})

test('failed and malformed token fetches fail closed and later attempts can recover', async (t) => {
  let attempt = 0
  const calls = mockFetch(t, (url) => {
    if (url !== '/api/csrf-token') return Response.json({ success: true })
    attempt++
    if (attempt === 1) throw new Error('offline')
    if (attempt === 2) return Response.json({ error: 'cross_origin_request' }, { status: 403 })
    if (attempt === 3) return Response.json({ token: null })
    return Response.json({ token: 'csrf' })
  })
  for (let i = 0; i < 3; i++) assert.equal((await api.apiLocalLogin('password123')).ok, false)
  assert.equal(calls.length, 3)
  assert.equal((await api.apiLocalLogin('password123')).ok, true)
  assert.equal(calls.length, 5)
})
