import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'
import { transformWithOxc } from 'vite'
import { money } from '../src/lib/format.ts'

const source = await readFile(new URL('../src/pages/reports.tsx', import.meta.url), 'utf8')
const transformed = (await transformWithOxc(source, 'reports.tsx')).code
const executable = transformed
  .replace(/^import \* as (\w+) from ["']([^"']+)["'];?$/gm, (_, name, path) => `const ${name} = modules[${JSON.stringify(path)}]`)
  .replace(/^import \{([^}]+)\} from ["']([^"']+)["'];?$/gm, (_, names, path) => `const {${names.replace(/\bas\b/g, ':')}} = modules[${JSON.stringify(path)}]`)
  .replace(/export function ReportsPage/, 'function ReportsPage')
  .concat('\nglobalThis.ReportsPage = ReportsPage')

const weekdays = ['Tuesday', 'Friday', 'Monday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday']
const analysis = weekdays.map((day, i) => ({ day, abbr: day.slice(0, 3), total: 21668 - i * 2500, count: 4 }))

function createHarness(translate) {
  const slots = []
  const requests = []
  let index = 0
  let effects = []
  const react = {
    useState(initial) {
      const i = index++
      if (!slots[i]) slots[i] = { value: initial }
      return [slots[i].value, (next) => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next }]
    },
    useRef(initial) {
      const i = index++
      if (!slots[i]) slots[i] = { current: initial }
      return slots[i]
    },
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useEffect: (fn) => { effects.push(fn) },
  }
  const jsx = (type, props, key) => ({ type, props: props || {}, key })
  const components = new Proxy({}, { get: (_, name) => name })
  const modules = new Proxy({
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'chart.js': { Chart: { register() {} } },
    '@/lib/api': { apiFinancialReport: async (params) => {
      requests.push(params)
      return { ok: true, data: {
        totalRevenue: 100000,
        byTableType: {},
        drinksTotal: 0,
        subscriptionsTotal: 0,
        dayOfWeekAnalysis: params.periodType === 'month' ? analysis : null,
      } }
    } },
    '@/lib/format': { money },
    '@/components/settings/settings-context': { useSettings: () => ({ settings: { currency: '€' } }) },
    '@/components/toast': { useToast: () => ({ toast() {} }) },
    '@/lib/i18n': { useI18n: () => ({ t: translate }) },
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  }, { get: (target, path) => target[path] || components })
  const context = { modules }
  vm.runInNewContext(executable, context)

  function render() {
    index = 0
    const tree = context.ReportsPage()
    const pending = effects
    effects = []
    pending.forEach((effect) => effect())
    const nodes = []
    function walk(node) {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) { node.forEach(walk); return }
      nodes.push(node)
      walk(node.props?.children)
    }
    walk(tree)
    return nodes
  }
  return { render, requests }
}

for (const translated of [false, true]) {
  test(`monthly weekday analysis shows all API day names${translated ? ' through translation' : ''} beside their totals`, async () => {
    const translate = (text) => text == null ? text : translated ? `translated:${text}` : text
    const harness = createHarness(translate)
    harness.render()
    await new Promise((resolve) => setImmediate(resolve))
    harness.render().find((node) => node.type === 'Select' && node.props.value === 'day').props.onValueChange('month')
    harness.render().find((node) => node.type === 'Button' && node.props.children.includes(translate('Generate Report'))).props.onClick()
    await new Promise((resolve) => setImmediate(resolve))

    const nodes = harness.render()
    assert.equal(harness.requests.at(-1).periodType, 'month')
    const content = nodes.find((node) => node.type === 'CardContent' && node.props.className === 'space-y-1')
    assert.ok(content, 'Expected weekday analysis')
    const rows = content.props.children
    assert.equal(rows.length, 7)
    assert.deepEqual(Array.from(rows, (row) => row.key), weekdays)
    analysis.forEach((entry, i) => {
      const [label, amount] = rows[i].props.children
      assert.equal(label.props.children, translate(entry.day))
      assert.equal(amount.props.children, `€${(entry.total / 100).toFixed(2)}`)
    })
  })
}
