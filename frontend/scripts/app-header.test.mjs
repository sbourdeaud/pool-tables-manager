import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'
import { transformWithOxc } from 'vite'

const source = await readFile(new URL('../src/components/app-header.tsx', import.meta.url), 'utf8')
const transformed = (await transformWithOxc(source, 'app-header.tsx')).code
const executable = transformed
  .replace(/^import \* as (\w+) from ["']([^"']+)["'];?$/gm, (_, name, path) => `const ${name} = modules[${JSON.stringify(path)}]`)
  .replace(/^import \{([^}]+)\} from ["']([^"']+)["'];?$/gm, (_, names, path) => `const {${names.replace(/\bas\b/g, ':')}} = modules[${JSON.stringify(path)}]`)
  .replace(/export function AppHeader/, 'function AppHeader')
  .concat('\nglobalThis.AppHeader = AppHeader')

function createHarness(logout) {
  const slots = []
  let index = 0
  const calls = { logout: 0, toasts: [], translations: [], redirects: [] }
  const location = {
    origin: 'https://app.example',
    set href(value) { calls.redirects.push(value) },
  }
  const react = {
    useState(initial) {
      const i = index++
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, (value) => { slots[i].value = value }]
    },
    useRef(initial) {
      const i = index++
      if (!slots[i]) slots[i] = { current: initial }
      return slots[i]
    },
  }
  const jsx = (type, props) => ({ type, props: props || {} })
  const components = new Proxy({}, { get: (_, name) => name })
  const modules = new Proxy({
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/lib/api': { apiLogout: () => { calls.logout += 1; return logout() } },
    '@/lib/theme': { getStoredTheme: () => 'light' },
    '@/components/settings/settings-context': { useSettings: () => ({ settings: {} }) },
    '@/components/toast': { useToast: () => ({ toast: (value) => calls.toasts.push(value) }) },
    '@/lib/i18n': { LanguageSelect: 'LanguageSelect', useI18n: () => ({ t: (text) => {
      calls.translations.push(text)
      return `translated:${text}`
    } }) },
  }, { get: (target, path) => target[path] || components })
  const context = { modules, window: { location }, URL }
  vm.runInNewContext(executable, context)

  function button() {
    index = 0
    const tree = context.AppHeader()
    function walk(node) {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) return node.map(walk).find(Boolean)
      if (node.props?.['aria-label'] === 'translated:Log out') return node
      return walk(node.props?.children)
    }
    const result = walk(tree)
    assert.ok(result, 'Expected logout button')
    return result.props
  }
  return { calls, button }
}

function assertFailure(harness, description = 'You are still signed in. Please try again.') {
  assert.equal(harness.calls.redirects.length, 0)
  assert.equal(harness.calls.toasts.length, 1)
  const toast = harness.calls.toasts[0]
  assert.equal(toast.variant, 'error')
  assert.equal(toast.title, 'translated:Failed to log out')
  assert.equal(toast.description, `translated:${description}`)
  assert.ok(harness.calls.translations.includes(description))
  assert.equal(harness.button().disabled, false)
}

for (const result of [
  { ok: false, status: 403, error: 'invalid_csrf_token', data: { redirect: '/' } },
  { ok: false, status: 500 },
  { ok: false, status: 0, error: 'Failed to fetch' },
]) {
  test(`logout failure (${result.status}) shows translated signed-in feedback without navigating`, async () => {
    const harness = createHarness(async () => result)
    await harness.button().onClick()
    assertFailure(harness)
  })
}

test('pending logout is disabled, suppresses duplicate submissions, and can be retried after rejection', async () => {
  let reject
  const pending = new Promise((_, rejectPromise) => { reject = rejectPromise })
  const harness = createHarness(() => harness.calls.logout === 1 ? pending : Promise.resolve({ ok: true, data: { redirect: '/' } }))
  const button = harness.button()
  assert.equal(button.disabled, false)
  const first = button.onClick()
  const duplicate = button.onClick()
  assert.equal(harness.button().disabled, true)
  assert.equal(harness.button()['aria-busy'], true)
  assert.equal(harness.calls.logout, 1)
  assert.equal(harness.calls.redirects.length, 0)
  reject(new Error('Network unavailable'))
  await Promise.all([first, duplicate])
  assertFailure(harness)
  assert.equal(harness.button()['aria-busy'], false)
  await harness.button().onClick()
  assert.equal(harness.calls.logout, 2)
  assert.deepEqual(harness.calls.redirects, ['https://app.example/'])
})

for (const redirect of ['/', '/login?logged_out=1', 'https://idp.example/end-session?id_token_hint=token', 'http://localhost:8080/logout']) {
  test(`successful logout follows the server HTTP(S) redirect: ${redirect}`, async () => {
    const harness = createHarness(async () => ({ ok: true, data: { redirect } }))
    await harness.button().onClick()
    assert.deepEqual(harness.calls.redirects, [new URL(redirect, 'https://app.example').href])
    assert.equal(harness.calls.toasts.length, 0)
  })
}

for (const redirect of [undefined, null, '', ' ', 42, 'javascript:alert(1)', 'data:text/html,unsafe', 'file:///tmp/logout', 'https://', 'https://' + 'user' + '@' + 'idp.example/logout', 'https://' + ':password' + '@' + 'idp.example/logout']) {
  test(`missing or unsafe logout redirect is rejected: ${JSON.stringify(redirect)}`, async () => {
    const harness = createHarness(async () => ({ ok: true, data: { redirect } }))
    await harness.button().onClick()
    assertFailure(harness, 'Could not complete logout. Please try again.')
  })
}

test('a successful response without data does not navigate', async () => {
  const harness = createHarness(async () => ({ ok: true }))
  await harness.button().onClick()
  assertFailure(harness, 'Could not complete logout. Please try again.')
})
