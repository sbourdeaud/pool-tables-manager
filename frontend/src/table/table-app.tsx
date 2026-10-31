import * as React from 'react'
import { Minus, Plus, Moon, Sun, Loader2, Search } from 'lucide-react'
import { apiDrinks, apiPlaceOrder, apiPublicTable, type Drink, type PublicTableDetail } from '@/lib/api'
import { DRINK_CATEGORIES, groupDrinks, type DrinkCategory } from '@/lib/menu'
import { formatSeconds, money } from '@/lib/format'
import { applyTheme, getStoredTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function useTableNumber(): string | null {
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('table')
  if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery
  const match = window.location.pathname.match(/^\/table(\d+)$/)
  return match ? match[1] : null
}

function useThemeToggle() {
  const [theme, setTheme] = React.useState(getStoredTheme())
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }
  return { theme, toggle }
}

export function TableApp() {
  const tableNumber = useTableNumber()
  const { theme, toggle } = useThemeToggle()
  const [pin, setPin] = React.useState<string | null>(null)
  const [pinError, setPinError] = React.useState('')
  const [detail, setDetail] = React.useState<PublicTableDetail | null>(null)
  const [loadError, setLoadError] = React.useState<'notfound' | 'error' | null>(null)
  const [currency, setCurrency] = React.useState(localStorage.getItem('currency') || '$')
  const [now, setNow] = React.useState(Date.now())

  React.useEffect(() => {
    void fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s?.currency) setCurrency(s.currency)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!tableNumber) return
    const stored = sessionStorage.getItem(`table${tableNumber}_pin`)
    const fromUrl = new URLSearchParams(window.location.search).get('pin')
    setPin(fromUrl || stored || null)
  }, [tableNumber])

  const load = React.useCallback(async () => {
    if (!tableNumber || !pin) return
    const result = await apiPublicTable(tableNumber, pin)
    if (result.ok && result.data) {
      setDetail(result.data)
      setLoadError(null)
      return
    }
    if (result.status === 403) {
      sessionStorage.removeItem(`table${tableNumber}_pin`)
      setPin(null)
      setPinError('Invalid PIN. Please try again.')
      return
    }
    setLoadError(result.status === 404 ? 'notfound' : 'error')
  }, [tableNumber, pin])

  React.useEffect(() => {
    if (!pin) return
    void load()
    // Refresh frequently so staff actions (e.g. fulfilling an order) show up
    // promptly, and immediately when the player returns to the tab.
    const refresh = window.setInterval(() => void load(), 10000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(refresh)
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [load, pin])

  if (!tableNumber) {
    return <Centered>Invalid table URL</Centered>
  }

  let body: React.ReactNode
  if (!pin) {
    body = <PinEntry error={pinError} onSubmit={(entered) => {
      sessionStorage.setItem(`table${tableNumber}_pin`, entered)
      setPinError('')
      setPin(entered)
    }} />
  } else if (loadError === 'notfound') {
    body = <Centered>Table not found</Centered>
  } else if (loadError === 'error') {
    body = <Centered>Error loading table information</Centered>
  } else if (!detail) {
    body = (
      <Centered>
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </Centered>
    )
  } else {
    body = <TableDetail detail={detail} currency={currency} now={now} tableNumber={tableNumber} pin={pin} onOrderPlaced={() => void load()} />
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        className="fixed right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-lg border bg-card shadow-sm"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <div className="mx-auto w-full max-w-xl">{body}</div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

function PinEntry({ error, onSubmit }: { error: string; onSubmit: (pin: string) => void }) {
  const [digits, setDigits] = React.useState(['', '', '', ''])
  const refs = React.useRef<(HTMLInputElement | null)[]>([])

  const setDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 3) refs.current[index + 1]?.focus()
  }

  const submit = () => {
    const pin = digits.join('')
    if (pin.length !== 4) return
    onSubmit(pin)
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div>
          <h1 className="text-lg font-bold">Enter PIN Code</h1>
          <p className="text-sm text-muted-foreground">Please enter the 4-digit PIN to view this table</p>
        </div>
        <div className="flex justify-center gap-2">
          {digits.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                refs.current[index] = el
              }}
              value={digit}
              inputMode="numeric"
              maxLength={1}
              autoFocus={index === 0}
              className="h-14 w-12 text-center text-2xl font-bold"
              onChange={(e) => setDigit(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digit && index > 0) refs.current[index - 1]?.focus()
                if (e.key === 'Enter') submit()
              }}
            />
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={submit}>
          View Table
        </Button>
      </CardContent>
    </Card>
  )
}

function TableDetail({
  detail,
  currency,
  now,
  tableNumber,
  pin,
  onOrderPlaced,
}: {
  detail: PublicTableDetail
  currency: string
  now: number
  tableNumber: string
  pin: string
  onOrderPlaced: () => void
}) {
  const [drinks, setDrinks] = React.useState<Drink[]>([])
  const [basket, setBasket] = React.useState<Record<string, number>>({})
  const [placing, setPlacing] = React.useState(false)
  const [message, setMessage] = React.useState<{ text: string; error?: boolean } | null>(null)
  const [activeCategory, setActiveCategory] = React.useState<'all' | DrinkCategory>('all')
  const [search, setSearch] = React.useState('')
  const groups = React.useMemo(() => groupDrinks(drinks), [drinks])
  const showSearch = drinks.length > 8

  React.useEffect(() => {
    void apiDrinks(localStorage.getItem('lang') || 'en').then((r) => setDrinks(r.data || []))
  }, [])

  const session = detail.session
  if (!session) {
    return (
      <Card>
        <CardContent className="space-y-1 p-6 text-center">
          <h1 className="text-2xl font-bold">{detail.table.name || 'Table #' + detail.table.number}</h1>
          {detail.table.type && <p className="text-sm text-muted-foreground">{detail.table.type}</p>}
          <p className="pt-4 text-sm text-muted-foreground">No active session</p>
        </CardContent>
      </Card>
    )
  }

  const start = new Date(session.startedAt)
  const elapsedSeconds = Math.max(0, Math.floor((now - start.getTime()) / 1000))
  const basketTotal = drinks.reduce((sum, d) => sum + (basket[d.id] || 0) * d.price_cents, 0)

  const placeOrder = async () => {
    const items = drinks.filter((d) => (basket[d.id] || 0) > 0).map((d) => ({ drinkId: d.id, quantity: basket[d.id] }))
    if (items.length === 0) return
    setPlacing(true)
    setMessage(null)
    const result = await apiPlaceOrder(tableNumber, pin, items)
    setPlacing(false)
    if (result.ok) {
      setBasket({})
      setMessage({ text: 'Order sent! A staff member will bring it shortly.' })
      onOrderPlaced()
    } else {
      setMessage({ text: 'Could not place order. Please try again or ask staff for help.', error: true })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="border-b pb-4 text-center">
            <h1 className="text-2xl font-bold">{detail.table.name || 'Table #' + detail.table.number}</h1>
            {detail.table.type && <p className="text-sm text-muted-foreground">{detail.table.type}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Started</p>
              <p className="text-base font-semibold">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Duration</p>
              <p className="font-mono text-base font-semibold tabular-nums">{formatSeconds(elapsedSeconds)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Players</p>
              <p className="text-base font-semibold">{session.numberOfPlayers || 1}</p>
            </div>
          </div>

          {(detail.tableCharge || 0) > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">Table Time</p>
              <Row label="Table Time" sub={`${Math.max(1, Math.ceil(elapsedSeconds / 3600))}h charged`} value={money(detail.tableCharge, currency)} />
            </div>
          )}

          {detail.items && detail.items.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">Items</p>
              <div className="space-y-2">
                {detail.items.map((item, index) => (
                  <Row
                    key={index}
                    label={item.description}
                    sub={`${item.quantity} × ${money(item.unitPrice, currency)}`}
                    value={money(item.totalCents, currency)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-accent/60 px-4 py-3">
            <span className="text-sm font-semibold">Total Due</span>
            <span className="text-xl font-extrabold">{money(detail.totalCents, currency)}</span>
          </div>

          {detail.pendingOrders && detail.pendingOrders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Your Orders (Pending)</p>
              {detail.pendingOrders.map((order, index) => (
                <div key={index} className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="font-semibold text-amber-600">Being prepared — {money(order.totalCents, currency)}</p>
                  <p>{order.items.map((i) => `${i.quantity} × ${i.description}`).join(', ')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5 pb-0">
          <p className="text-sm font-semibold text-muted-foreground">Order Drinks</p>
          {drinks.length === 0 && <p className="text-sm text-muted-foreground">Menu unavailable.</p>}

          {drinks.length > 0 && (
            <>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {(['all', ...DRINK_CATEGORIES.map((c) => c.value)] as const).map((value) => {
                  const group = groups.find((g) => g.value === value)
                  if (value !== 'all' && !group) return null
                  const active = activeCategory === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setActiveCategory(value)}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {value === 'all' ? 'All' : DRINK_CATEGORIES.find((c) => c.value === value)?.short}
                    </button>
                  )
                })}
              </div>

              {showSearch && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search the menu…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              )}

              {groups
                .filter((g) => activeCategory === 'all' || g.value === activeCategory)
                .map((group) => {
                  const groupDrinksFiltered = group.drinks.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()))
                  if (groupDrinksFiltered.length === 0) return null
                  const Icon = group.icon
                  return (
                    <div key={group.value} className="space-y-2">
                      <p className="flex items-center gap-1.5 pt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" /> {group.label} ({groupDrinksFiltered.length})
                      </p>
                      {groupDrinksFiltered.map((d) => (
                        <div key={d.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{d.name}</p>
                            <p className="text-xs text-muted-foreground">{money(d.price_cents, currency)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setBasket((b) => ({ ...b, [d.id]: Math.max(0, (b[d.id] || 0) - 1) }))}
                              aria-label="Decrease"
                            >
                              <Minus />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold tabular-nums">{basket[d.id] || 0}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setBasket((b) => ({ ...b, [d.id]: Math.min(50, (b[d.id] || 0) + 1) }))}
                              aria-label="Increase"
                            >
                              <Plus />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}

              {groups.every((g) => g.drinks.every((d) => !d.name.toLowerCase().includes(search.trim().toLowerCase()))) && (
                <p className="py-3 text-center text-sm text-muted-foreground">Nothing matches that search.</p>
              )}
            </>
          )}

          {message && <p className={cn('text-sm', message.error ? 'text-destructive' : 'text-emerald-600')}>{message.text}</p>}

          <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-between gap-3 rounded-b-xl border-t bg-card/95 px-5 py-3 backdrop-blur">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Your order</p>
              <p className="text-base font-extrabold tabular-nums">{money(basketTotal, currency)}</p>
            </div>
            <Button disabled={placing || basketTotal <= 0} onClick={() => void placeOrder()}>
              {placing ? 'Placing…' : 'Place Order'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
