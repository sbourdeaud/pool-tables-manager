import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'
import { transformWithOxc } from 'vite'

const source = await readFile(new URL('../src/components/checkout-dialog.tsx', import.meta.url), 'utf8')
const transformed = (await transformWithOxc(source, 'checkout-dialog.tsx')).code
const executable = transformed
  .replace(/^import \* as (\w+) from ["']([^"']+)["'];?$/gm, (_, name, path) => `const ${name} = modules[${JSON.stringify(path)}]`)
  .replace(/^import \{([^}]+)\} from ["']([^"']+)["'];?$/gm, (_, names, path) => {
    const bindings = names.replace(/\bas\b/g, ':')
    return `const {${bindings}} = modules[${JSON.stringify(path)}]`
  })
  .replace(/export function CheckoutDialog/, 'function CheckoutDialog')
  .concat('\nglobalThis.CheckoutDialog = CheckoutDialog')

function detail(total, status = 'active') {
  return {
    session: { id: 'session-1', status, startedAt: '2026-01-01T00:00:00.000Z' },
    tableCharge: 0,
    items: [{ id: 'item-1', description: 'Drinks', quantity: 1, unitPrice: total, totalCents: total }],
    players: [{ id: 'player-1', playerNumber: 1, shareCents: 0 }, { id: 'player-2', playerNumber: 2, shareCents: 0 }],
  }
}

function createHarness({ checkout, details, posEnabled = true, createCard, getPayment, cancelPayment, reconcilePayment }) {
  const slots = []
  let index = 0
  let dirty = true
  let effects = []
  let tree
  let nextTimer = 1
  const timers = new Map()
  const calls = { checkout: [], detail: [], card: [], payment: [], cancel: [], reconcile: [], end: 0, done: 0, close: 0, toasts: [] }
  const props = { open: true, sessionId: 'session-1', numberOfPlayers: 2, onClose: () => { calls.close += 1 }, onDone: () => { calls.done += 1 } }
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
  const react = {
    useState(initial) {
      const i = index++
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, (next) => {
        const value = typeof next === 'function' ? next(slots[i].value) : next
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true }
      }]
    },
    useRef(initial) {
      const i = index++
      if (!slots[i]) slots[i] = { current: initial }
      return slots[i]
    },
    useMemo(fn, deps) {
      const i = index++
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }
      return slots[i].value
    },
    useEffect(fn, deps) {
      const i = index++
      if (!slots[i] || !same(slots[i].deps, deps)) {
        const previous = slots[i]
        slots[i] = { deps }
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = fn() })
      }
    },
  }
  const jsx = (type, props) => ({ type, props: props || {} })
  const componentModule = new Proxy({}, { get: (_, name) => name })
  const api = {
    apiPaymentConfig: async () => ({ ok: true, data: { card_enabled: true } }),
    apiSessionDetail: async (id) => { calls.detail.push(id); return await details.shift()(id) },
    apiCheckoutSession: async (...args) => { calls.checkout.push(args); return await checkout(...args) },
    apiCreateCardPayment: async (...args) => { calls.card.push(args); return await createCard(...args) },
    apiGetPayment: async (...args) => { calls.payment.push(args[0]); return await getPayment(...args) },
    apiCancelPayment: async (...args) => { calls.cancel.push(args); return await cancelPayment(...args) },
    apiReconcileCardPayment: async (...args) => { calls.reconcile.push(args); return await reconcilePayment(...args) },
    apiEndSession: async () => { calls.end += 1; return { ok: true } },
  }
  const modules = new Proxy({
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    '@/lib/api': api,
    '@/lib/format': { money: (amount) => (amount / 100).toFixed(2) },
    '@/lib/receipts': {},
    '@/components/settings/settings-context': { useSettings: () => ({ settings: { pos_enabled: String(posEnabled), currency: '$' } }) },
    '@/lib/i18n': { useI18n: () => ({ t: (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? `{${key}}`) }) },
    '@/components/toast': { useToast: () => ({ toast: (value) => calls.toasts.push(value) }) },
  }, { get: (target, path) => target[path] || componentModule })
  const context = { modules, window: {
    setInterval(fn) { const id = nextTimer++; timers.set(id, fn); return id },
    clearInterval(id) { timers.delete(id) },
  }, console, crypto: { randomUUID: () => 'card-request-key' } }
  vm.runInNewContext(executable, context)

  async function flush() {
    for (let n = 0; n < 30; n += 1) {
      if (dirty) {
        dirty = false
        index = 0
        tree = context.CheckoutDialog(props)
        const pending = effects
        effects = []
        pending.forEach((effect) => effect())
      }
      await new Promise((resolve) => setImmediate(resolve))
      if (!dirty && effects.length === 0) return
    }
    throw new Error('Dialog did not settle')
  }
  function nodes() {
    const result = []
    function walk(node) {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) { node.forEach(walk); return }
      if (node.type) result.push(node)
      if (node.props) { walk(node.props.children); walk(node.props.trigger) }
    }
    walk(tree)
    return result
  }
  const find = (predicate) => {
    const node = nodes().find(predicate)
    assert.ok(node, 'Expected dialog element')
    return node
  }
  const update = (next) => { Object.assign(props, next); dirty = true }
  const tick = async () => {
    await Promise.all([...timers.values()].map((fn) => fn()))
    await flush()
  }
  return { calls, update, flush, nodes, find, tick }
}

function successfulCheckout(...args) {
  return { ok: true, status: 200, data: { receiptNumber: 7, year: 2026, totalTtcCents: 1000, vatCents: 0, discountCents: 0, items: [], payments: args[2] } }
}

async function startCard(harness) {
  harness.find((node) => node.type === 'Button' && String(node.props.children).includes('Card (terminal)')).props.onClick()
  await harness.flush()
}

const ok = (value) => () => Promise.resolve({ ok: true, data: value, status: 200 })

async function enterPayment(harness) {
  harness.find((node) => node.type === 'Input' && node.props.id === 'discount-value').props.onChange({ target: { value: '10' } })
  await harness.flush()
  harness.find((node) => node.type === 'Input' && node.props.value === '4.50').props.onChange({ target: { value: '3.00' } })
  await harness.flush()
  harness.find((node) => node.type === 'Button' && String(node.props.children).includes('Exact')).props.onClick()
  await harness.flush()
}

async function submit(harness) {
  harness.find((node) => node.type === 'ConfirmDialog').props.onConfirm()
  await harness.flush()
}

test('unknown conflicts refresh the tab, preserve inputs and never end the session', async () => {
  const harness = createHarness({
    checkout: async () => ({ ok: false, status: 409, error: 'other_conflict' }),
    details: [ok(detail(1000)), ok(detail(800))],
  })
  await harness.flush()
  await enterPayment(harness)
  await submit(harness)
  assert.equal(harness.calls.end, 0)
  assert.equal(harness.calls.close, 0)
  assert.equal(harness.calls.done, 1)
  assert.deepEqual(harness.calls.detail, ['session-1', 'session-1'])
  assert.equal(harness.calls.toasts[0].variant, 'error')
  assert.match(harness.calls.toasts[0].description, /other_conflict/)
  assert.ok(harness.nodes().some((node) => node.props.role === 'alert'))
  assert.equal(harness.find((node) => node.type === 'Input' && node.props.id === 'discount-value').props.value, '10')
  assert.ok(harness.nodes().some((node) => node.type === 'Input' && node.props.value === '3.00'))
  assert.ok(harness.nodes().some((node) => node.props['aria-label'] === 'Remove payment'))
  assert.ok(harness.nodes().some((node) => node.props.children === 'Payments exceed the total due.'))
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
})

test('inactive sessions and refresh failures block checkout while retaining work and allow refresh retry', async () => {
  const harness = createHarness({
    checkout: async () => ({ ok: false, status: 409, error: 'session_not_active' }),
    details: [ok(detail(1000)), ok(detail(1000, 'ended')), () => Promise.resolve({ ok: false, status: 500 }), ok(detail(1000))],
  })
  await harness.flush()
  await enterPayment(harness)
  await submit(harness)
  assert.match(harness.calls.toasts[0].description, /no longer active/)
  assert.equal(harness.calls.end, 0)
  assert.equal(harness.calls.close, 0)
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
  harness.find((node) => node.type === 'Button' && node.props.children === 'Retry refresh').props.onClick()
  await harness.flush()
  assert.ok(harness.nodes().some((node) => node.props.children === 'Could not refresh the session. Retry refresh before attempting checkout.'))
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
  harness.find((node) => node.type === 'Button' && node.props.children === 'Retry refresh').props.onClick()
  await harness.flush()
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, false)
  assert.equal(harness.find((node) => node.type === 'Input' && node.props.id === 'discount-value').props.value, '10')
  assert.ok(harness.nodes().some((node) => node.type === 'Input' && node.props.value === '3.00'))
  assert.ok(harness.nodes().some((node) => node.props['aria-label'] === 'Remove payment'))
})

test('a conflict without an error code remains visible and retryable after an active refresh', async () => {
  const harness = createHarness({
    checkout: async () => ({ ok: false, status: 409 }),
    details: [ok(detail(1000)), ok(detail(1000))],
    posEnabled: false,
  })
  await harness.flush()
  await submit(harness)
  assert.match(harness.calls.toasts[0].description, /HTTP 409/)
  assert.equal(harness.calls.toasts[0].variant, 'error')
  assert.equal(harness.calls.close, 0)
  assert.equal(harness.calls.end, 0)
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, false)
})

test('a late conflict cannot change another open checkout', async () => {
  let resolveCheckout
  const pending = new Promise((resolve) => { resolveCheckout = resolve })
  const harness = createHarness({ checkout: () => pending, details: [ok(detail(1000)), ok(detail(1200))], posEnabled: false })
  await harness.flush()
  harness.find((node) => node.type === 'ConfirmDialog').props.onConfirm()
  await harness.flush()
  harness.update({ sessionId: 'session-2' })
  await harness.flush()
  resolveCheckout({ ok: false, status: 409, error: 'session_not_active' })
  await harness.flush()
  assert.deepEqual(harness.calls.detail, ['session-1', 'session-2'])
  assert.equal(harness.calls.done, 1)
  assert.equal(harness.calls.end, 0)
  assert.equal(harness.calls.close, 0)
  assert.equal(harness.calls.toasts.length, 0)
  assert.ok(!harness.nodes().some((node) => node.props.role === 'alert'))
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, false)
})

test('successful checkout requires a receipt and ordinary failures stay open', async () => {
  let response = { ok: false, status: 400, error: 'payment_mismatch' }
  const harness = createHarness({ checkout: async () => response, details: [ok(detail(1000))], posEnabled: false })
  await harness.flush()
  await submit(harness)
  assert.equal(harness.calls.toasts[0].description, 'payment_mismatch')
  assert.equal(harness.calls.done, 0)
  assert.equal(harness.calls.close, 0)
  response = { ok: true, status: 200, data: { receiptNumber: 7, year: 2026, totalTtcCents: 1000, vatCents: 0, discountCents: 0, items: [] } }
  await submit(harness)
  assert.equal(harness.calls.done, 1)
  assert.equal(harness.calls.toasts[1].title, 'Invoice created')
  assert.equal(harness.calls.end, 0)
})

test('an immediately captured card is attached once and can be checked out', async () => {
  const harness = createHarness({
    checkout: async (...args) => successfulCheckout(...args),
    details: [ok(detail(1000))],
    createCard: async () => ({ ok: true, status: 201, data: { paymentId: 'card-1', status: 'captured', provider: 'fake' } }),
  })
  await harness.flush()
  await startCard(harness)
  assert.equal(harness.calls.payment.length, 0)
  assert.ok(harness.nodes().some((node) => node.props.children === 'Fully paid'))
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, false)
  await submit(harness)
  assert.deepEqual(Array.from(harness.calls.checkout[0][2], (payment) => ({ ...payment })), [{ method: 'card', amountCents: 1000, paymentId: 'card-1' }])
})

test('uncertain creation responses and pending states poll until capture without duplicate payments', async () => {
  let status = 'pending'
  const harness = createHarness({
    checkout: async (...args) => successfulCheckout(...args),
    details: [ok(detail(1000))],
    createCard: async () => ({ ok: false, status: 502, error: 'reader_timeout', data: { paymentId: 'card-1' } }),
    getPayment: async () => ({ ok: true, status: 200, data: { id: 'card-1', status, amountCents: 1000, method: 'card', currency: '$' } }),
  })
  await harness.flush()
  await startCard(harness)
  assert.ok(harness.calls.payment.length >= 1)
  assert.ok(harness.calls.payment.every((id) => id === 'card-1'))
  assert.match(JSON.stringify(harness.nodes().map((node) => node.props.children)), /Checking card payment status…|Present card on the terminal…/)
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
  status = 'captured'
  await harness.tick()
  const completedPolls = harness.calls.payment.length
  await harness.tick()
  assert.equal(harness.calls.payment.length, completedPolls)
  assert.ok(harness.nodes().some((node) => node.props.children === 'Fully paid'))
  await submit(harness)
  assert.deepEqual(Array.from(harness.calls.checkout[0][2], (payment) => ({ ...payment })), [{ method: 'card', amountCents: 1000, paymentId: 'card-1' }])
})

test('a lost creation response retries with the same idempotency key', async () => {
  let attempts = 0
  const harness = createHarness({
    checkout: async (...args) => successfulCheckout(...args),
    details: [ok(detail(1000))],
    createCard: async () => {
      attempts += 1
      return attempts === 1
        ? { ok: false, status: 0, error: 'network error' }
        : { ok: true, status: 200, data: { paymentId: 'card-1', status: 'captured', provider: 'fake', duplicate: true } }
    },
  })
  await harness.flush()
  await startCard(harness)
  await startCard(harness)
  assert.equal(harness.calls.card.length, 2)
  assert.equal(harness.calls.card[0][2], 'card-request-key')
  assert.equal(harness.calls.card[1][2], 'card-request-key')
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, false)
})

test('reconciliation is explicit, serializes operations, and attaches a captured reservation once', async () => {
  let resolveReconcile
  let resolveOldPoll
  let pollCount = 0
  const pendingReconcile = new Promise((resolve) => { resolveReconcile = resolve })
  const oldPoll = new Promise((resolve) => { resolveOldPoll = resolve })
  const harness = createHarness({
    checkout: async (...args) => successfulCheckout(...args),
    details: [ok(detail(1000))],
    createCard: async () => ({ ok: false, status: 502, error: 'reader_timeout', data: { paymentId: 'card-1' } }),
    getPayment: async () => { pollCount += 1; return pollCount === 1 ? oldPoll : { ok: true, status: 200, data: { id: 'card-1', status: 'unknown', amountCents: 1000 } } },
    reconcilePayment: () => pendingReconcile,
  })
  await harness.flush()
  await startCard(harness)
  assert.equal(harness.calls.card[0][2], 'card-request-key')
  assert.equal(harness.calls.reconcile.length, 0)
  const button = harness.find((node) => node.type === 'Button' && node.props['aria-label'] === 'Reconcile card payment')
  button.props.onClick()
  button.props.onClick()
  await harness.flush()
  assert.deepEqual(harness.calls.reconcile, [['card-1', undefined]])
  assert.equal(harness.find((node) => node.type === 'Button' && node.props['aria-label'] === 'Reconcile card payment').props.disabled, true)
  assert.equal(harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.children, 'Reconciling card payment…')
  assert.equal(harness.find((node) => node.props['aria-label'] === 'Cancel card payment').props.disabled, true)
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
  resolveReconcile({ ok: true, status: 200, data: { id: 'card-1', status: 'captured', amountCents: 1000 } })
  await harness.flush()
  resolveOldPoll({ ok: true, status: 200, data: { id: 'card-1', status: 'pending', amountCents: 1000 } })
  await harness.flush()
  assert.equal(harness.calls.card.length, 1)
  assert.ok(harness.nodes().some((node) => node.props.children === 'Fully paid'))
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, false)
  await submit(harness)
  assert.deepEqual(Array.from(harness.calls.checkout[0][2], (payment) => ({ ...payment })), [{ method: 'card', amountCents: 1000, paymentId: 'card-1' }])
})

test('unresolved reconciliation remains blocked, accepts a verified provider reference and resumes polling', async () => {
  let status = 'unknown'
  let attempts = 0
  const harness = createHarness({
    checkout: async (...args) => successfulCheckout(...args),
    details: [ok(detail(1000))],
    createCard: async () => ({ ok: true, status: 200, data: { paymentId: 'card-1', status: 'pending', duplicate: true } }),
    getPayment: async () => ({ ok: true, status: 200, data: { id: 'card-1', status, amountCents: 1000 } }),
    reconcilePayment: async () => {
      attempts += 1
      if (attempts === 1) return { ok: false, status: 409, error: 'payment_reconciliation_required' }
      status = 'presenting'
      return { ok: false, status: 409, error: 'payment_reconciliation_required', data: { id: 'card-1', status, amountCents: 1000 } }
    },
  })
  await harness.flush()
  await startCard(harness)
  harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.onClick()
  await harness.flush()
  assert.ok(harness.nodes().some((node) => node.props.role === 'alert' && String(node.props.children).includes('payment_reconciliation_required')))
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
  harness.find((node) => node.props['aria-label'] === 'Provider reference').props.onChange({ target: { value: ' pi_verified ' } })
  await harness.flush()
  harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.onClick()
  await harness.flush()
  assert.deepEqual(harness.calls.reconcile, [['card-1', undefined], ['card-1', 'pi_verified']])
  assert.equal(harness.calls.card.length, 1)
  assert.ok(harness.nodes().some((node) => String(node.props.children).includes('Check the terminal; payment status is still unresolved.')))
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
  status = 'captured'
  await harness.tick()
  await submit(harness)
  assert.deepEqual(Array.from(harness.calls.checkout[0][2], (payment) => ({ ...payment })), [{ method: 'card', amountCents: 1000, paymentId: 'card-1' }])
})

test('canceled reconciliation releases the reservation and ignores late results from another dialog', async () => {
  let resolveReconcile
  const pending = new Promise((resolve) => { resolveReconcile = resolve })
  let attempt = 0
  const harness = createHarness({
    details: [ok(detail(1000)), ok(detail(1200))],
    createCard: async () => ({ ok: false, status: 502, data: { paymentId: 'card-1' } }),
    getPayment: async () => ({ ok: true, status: 200, data: { id: 'card-1', status: 'unknown', amountCents: 1000 } }),
    reconcilePayment: async () => ++attempt === 1 ? { ok: true, status: 200, data: { id: 'card-1', status: 'canceled', amountCents: 1000 } } : pending,
  })
  await harness.flush()
  await startCard(harness)
  harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.onClick()
  await harness.flush()
  assert.ok(harness.nodes().some((node) => node.type === 'Button' && String(node.props.children).includes('Card (terminal)')))
  assert.ok(harness.calls.toasts.some((toast) => toast.title === 'Card payment canceled'))
  await startCard(harness)
  harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.onClick()
  await harness.flush()
  harness.update({ sessionId: 'session-2' })
  await harness.flush()
  resolveReconcile({ ok: true, status: 200, data: { id: 'card-1', status: 'captured', amountCents: 1000 } })
  await harness.flush()
  assert.ok(!harness.nodes().some((node) => node.props.children === 'Fully paid'))
  assert.equal(harness.calls.toasts.filter((toast) => toast.title === 'Card payment captured').length, 0)
})

test('reconciliation API targets the reservation and sends only an optional provider reference', async () => {
  const apiSource = await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8')
  const code = (await transformWithOxc(apiSource, 'api.ts')).code.replace(/export /g, '')
  const requests = []
  const context = { fetch: async (url, init) => { requests.push({ url, init }); return { ok: true, status: 200, json: async () => ({ id: 'card-1', status: 'captured' }) } } }
  vm.runInNewContext(`${code}\nglobalThis.reconcile = apiReconcileCardPayment`, context)
  await context.reconcile('card/1')
  await context.reconcile('card/1', 'pi_verified')
  assert.equal(requests[0].url, '/api/payments/card%2F1/reconcile')
  assert.equal(requests[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(requests[0].init.body), {})
  assert.deepEqual(JSON.parse(requests[1].init.body), { providerRef: 'pi_verified' })
})

test('network errors and pending reconciliation keep checkout blocked and allow retry', async () => {
  let attempt = 0
  const harness = createHarness({
    details: [ok(detail(1000))],
    createCard: async () => ({ ok: false, status: 502, data: { paymentId: 'card-1' } }),
    getPayment: async () => ({ ok: true, status: 200, data: { id: 'card-1', status: 'unknown', amountCents: 1000 } }),
    reconcilePayment: async () => {
      if (++attempt === 1) return { ok: false, status: 0, error: 'connection lost' }
      return { ok: false, status: 409, error: 'payment_reconciliation_required', data: { id: 'card-1', status: 'pending', amountCents: 1000 } }
    },
  })
  await harness.flush()
  await startCard(harness)
  harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.onClick()
  await harness.flush()
  assert.ok(harness.nodes().some((node) => node.props.role === 'alert' && String(node.props.children).includes('connection lost')))
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
  harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.onClick()
  await harness.flush()
  assert.equal(harness.calls.reconcile.length, 2)
  assert.equal(harness.calls.card.length, 1)
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
  assert.ok(harness.nodes().some((node) => node.props.role === 'alert' && String(node.props.children).includes('payment_reconciliation_required')))
})

test('cancel and reconciliation cannot overlap or be submitted twice', async () => {
  let resolveCancel
  const pending = new Promise((resolve) => { resolveCancel = resolve })
  const harness = createHarness({
    details: [ok(detail(1000))],
    createCard: async () => ({ ok: false, status: 502, data: { paymentId: 'card-1' } }),
    getPayment: async () => ({ ok: true, status: 200, data: { id: 'card-1', status: 'unknown', amountCents: 1000 } }),
    cancelPayment: () => pending,
  })
  await harness.flush()
  await startCard(harness)
  const cancel = harness.find((node) => node.props['aria-label'] === 'Cancel card payment')
  const reconcile = harness.find((node) => node.props['aria-label'] === 'Reconcile card payment')
  cancel.props.onClick()
  cancel.props.onClick()
  reconcile.props.onClick()
  await harness.flush()
  assert.equal(harness.calls.cancel.length, 1)
  assert.equal(harness.calls.reconcile.length, 0)
  assert.equal(harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.disabled, true)
  assert.match(String(harness.find((node) => node.props['aria-label'] === 'Cancel card payment').props.children), /Canceling card payment/)
  resolveCancel({ ok: false, status: 409, error: 'payment_reconciliation_required' })
  await harness.flush()
  assert.equal(harness.find((node) => node.props['aria-label'] === 'Reconcile card payment').props.disabled, false)
  assert.equal(harness.find((node) => node.type === 'ConfirmDialog').props.trigger.props.disabled, true)
})

test('a definitively rejected reservation releases the payment block', async () => {
  const harness = createHarness({
    details: [ok(detail(1000))],
    createCard: async () => ({ ok: false, status: 502, data: { paymentId: 'card-1' } }),
    getPayment: async () => ({ ok: true, status: 200, data: { id: 'card-1', status: 'creation_rejected', amountCents: 1000 } }),
  })
  await harness.flush()
  await startCard(harness)
  assert.ok(harness.nodes().some((node) => node.type === 'Button' && String(node.props.children).includes('Card (terminal)')))
  assert.ok(harness.calls.toasts.some((toast) => toast.title === 'Card payment failed'))
  assert.equal(harness.calls.reconcile.length, 0)
})
