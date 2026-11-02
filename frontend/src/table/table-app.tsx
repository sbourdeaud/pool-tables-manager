import * as React from 'react'
import { Minus, Plus, Moon, Sun, Loader2, Search, BookOpen, Check, Users, X } from 'lucide-react'
import { apiCancelTableLookingForPlayers, apiDrinks, apiFulfillTableLookingForPlayers, apiPlaceOrder, apiPublicTable, apiPublicTables, apiSetTableLookingForPlayers, type Drink, type PublicTableDetail } from '@/lib/api'
import { DRINK_CATEGORIES, groupDrinks, type DrinkCategory } from '@/lib/menu'
import { formatSeconds, money } from '@/lib/format'
import { applyTheme, getStoredTheme } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { LanguageSelect, useI18n } from '@/lib/i18n'
import { TableRulesDialog } from '@/components/table-rules-dialog'
import { rulesForTableType } from '@/lib/table-rules'
import { lookingForPlayersLabel } from '@/lib/player-search'

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
  const { t } = useI18n()
  const [pin, setPin] = React.useState<string | null>(null)
  const [pinError, setPinError] = React.useState('')
  const [detail, setDetail] = React.useState<PublicTableDetail | null>(null)
  const [loadError, setLoadError] = React.useState<'notfound' | 'error' | null>(null)
  const [currency, setCurrency] = React.useState(localStorage.getItem('currency') || '$')
  const [now, setNow] = React.useState(Date.now())
  const [tableTypeName, setTableTypeName] = React.useState<string | null>(null)
  const [rulesOpen, setRulesOpen] = React.useState(false)
  const rules = tableTypeName ? rulesForTableType(tableTypeName) : null

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
    let active = true
    void apiPublicTables().then((result) => {
      if (!active || !result.ok || !result.data) return
      const table = result.data.find((candidate) => candidate.number === Number(tableNumber))
      setTableTypeName(table?.typeName || null)
    })
    return () => { active = false }
  }, [tableNumber])

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
    return <Centered>{t('Invalid table URL')}</Centered>
  }

  let body: React.ReactNode
  if (!pin) {
    body = <PinEntry error={pinError} onSubmit={(entered) => {
      sessionStorage.setItem(`table${tableNumber}_pin`, entered)
      setPinError('')
      setPin(entered)
    }} />
  } else if (loadError === 'notfound') {
    body = <Centered>{t('Table not found')}</Centered>
  } else if (loadError === 'error') {
    body = <Centered>{t('Error loading table information')}</Centered>
  } else if (!detail) {
    body = (
      <Centered>
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </Centered>
    )
  } else {
    body = <TableDetail detail={detail} currency={currency} now={now} tableNumber={tableNumber} pin={pin} onChanged={() => void load()} />
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="fixed right-3 top-3 z-20 flex items-center gap-2">
        {tableTypeName && rules && (
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => setRulesOpen(true)}
            aria-label={t('Show rules for {type}', { type: t(rules[0].label) })}
            title={t('Rules')}
          >
            <BookOpen className="h-4 w-4" />
          </Button>
        )}
        <div className="rounded-lg border bg-card px-1 shadow-sm">
          <LanguageSelect className="h-9" />
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={t('Toggle theme')}
          title={t('Toggle theme')}
          className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card shadow-sm"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
      <div className="mx-auto w-full max-w-xl">{body}</div>
      <TableRulesDialog open={rulesOpen} tableType={tableTypeName} onClose={() => setRulesOpen(false)} />
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
  const { t } = useI18n()
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
          <h1 className="text-lg font-bold">{t('Enter PIN Code')}</h1>
          <p className="text-sm text-muted-foreground">{t('Please enter the 4-digit PIN to view this table')}</p>
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
          {t('View Table')}
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
  onChanged,
}: {
  detail: PublicTableDetail
  currency: string
  now: number
  tableNumber: string
  pin: string
  onChanged: () => void
}) {
  const { t } = useI18n()
  const [drinks, setDrinks] = React.useState<Drink[]>([])
  const [basket, setBasket] = React.useState<Record<string, number>>({})
  const [placing, setPlacing] = React.useState(false)
  const [message, setMessage] = React.useState<{ text: string; error?: boolean } | null>(null)
  const [playerMessage, setPlayerMessage] = React.useState<{ text: string; error?: boolean } | null>(null)
  const [activeCategory, setActiveCategory] = React.useState<'all' | DrinkCategory>('all')
  const [search, setSearch] = React.useState('')
  const [searchDialogOpen, setSearchDialogOpen] = React.useState(false)
  const [fulfillDialogOpen, setFulfillDialogOpen] = React.useState(false)
  const [searchCount, setSearchCount] = React.useState('2')
  const [searchUpTo, setSearchUpTo] = React.useState(false)
  const [subscribersJoined, setSubscribersJoined] = React.useState('0')
  const [nonSubscribersJoined, setNonSubscribersJoined] = React.useState('1')
  const [playerActionBusy, setPlayerActionBusy] = React.useState(false)
  const groups = React.useMemo(() => groupDrinks(drinks), [drinks])
  const showSearch = drinks.length > 8

  React.useEffect(() => {
    void apiDrinks(localStorage.getItem('lang') || 'en').then((r) => setDrinks(r.data || []))
  }, [])

  // Order feedback ("Order sent!", errors) is transient: hide it after a few
  // seconds so it does not linger across the automatic refreshes.
  React.useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [message])

  React.useEffect(() => {
    if (!playerMessage) return
    const timer = window.setTimeout(() => setPlayerMessage(null), 5000)
    return () => window.clearTimeout(timer)
  }, [playerMessage])

  const session = detail.session
  if (!session) {
    return (
      <Card>
        <CardContent className="space-y-1 p-6 text-center">
          <h1 className="text-2xl font-bold">{detail.table.name || 'Table #' + detail.table.number}</h1>
          {detail.table.type && <p className="text-sm text-muted-foreground">{detail.table.type}</p>}
          <p className="pt-4 text-sm text-muted-foreground">{t('No active session')}</p>
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
      setMessage({ text: t('Order sent! A staff member will bring it shortly.') })
      onChanged()
    } else {
      setMessage({ text: t('Could not place order. Please try again or ask staff for help.'), error: true })
    }
  }

  const openSearchDialog = () => {
    setPlayerMessage(null)
    setSearchCount(String(session.lookingForPlayersCount || 2))
    setSearchUpTo(Boolean(session.lookingForPlayersUpTo))
    setSearchDialogOpen(true)
  }

  const requestPlayers = async () => {
    const count = Number(searchCount)
    if (!Number.isInteger(count) || count < 1 || count > 50) {
      setPlayerMessage({ text: t('Enter a valid number of players'), error: true })
      return
    }
    setPlayerActionBusy(true)
    const result = await apiSetTableLookingForPlayers(tableNumber, pin, count, searchUpTo)
    setPlayerActionBusy(false)
    if (!result.ok) {
      setPlayerMessage({ text: t('Failed to update player request'), error: true })
      return
    }
    setSearchDialogOpen(false)
    setPlayerMessage({ text: t('Player request updated') })
    onChanged()
  }

  const cancelPlayerRequest = async () => {
    setPlayerActionBusy(true)
    const result = await apiCancelTableLookingForPlayers(tableNumber, pin)
    setPlayerActionBusy(false)
    if (!result.ok) {
      setPlayerMessage({ text: t('Failed to cancel player request'), error: true })
      return
    }
    setPlayerMessage({ text: t('Player request canceled') })
    onChanged()
  }

  const fulfillPlayerRequest = async () => {
    const subscribers = Number(subscribersJoined)
    const nonSubscribers = Number(nonSubscribersJoined)
    const total = subscribers + nonSubscribers
    if (!Number.isInteger(subscribers) || !Number.isInteger(nonSubscribers) || total < 1 || total > 50) {
      setPlayerMessage({ text: t('Enter a valid number of players'), error: true })
      return
    }
    setPlayerActionBusy(true)
    const result = await apiFulfillTableLookingForPlayers(tableNumber, pin, subscribers, nonSubscribers)
    setPlayerActionBusy(false)
    if (!result.ok) {
      setPlayerMessage({ text: t('Failed to confirm players'), error: true })
      return
    }
    setFulfillDialogOpen(false)
    setPlayerMessage({ text: t('Players added to the table') })
    onChanged()
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
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('Started')}</p>
              <p className="text-base font-semibold">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('Duration')}</p>
              <p className="font-mono text-base font-semibold tabular-nums">{formatSeconds(elapsedSeconds)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('Players')}</p>
              <p className="text-base font-semibold">{session.numberOfPlayers || 1}</p>
            </div>
          </div>

          {session.lookingForPlayersCount ? (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
              <p className="text-sm font-semibold">
                {lookingForPlayersLabel(session.lookingForPlayersCount, Boolean(session.lookingForPlayersUpTo), t)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { setPlayerMessage(null); setSubscribersJoined('0'); setNonSubscribersJoined(String(session.lookingForPlayersCount || 1)); setFulfillDialogOpen(true) }} disabled={playerActionBusy}>
                  <Check /> {t('Mark as fulfilled')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void cancelPlayerRequest()} disabled={playerActionBusy}>
                  <X /> {t('Cancel request')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={openSearchDialog}>
              <Users /> {t('Looking for players?')}
            </Button>
          )}
          {playerMessage && <p className={cn('text-sm', playerMessage.error ? 'text-destructive' : 'text-emerald-600')}>{playerMessage.text}</p>}

          {(detail.tableCharge || 0) > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">{t('Table Time')}</p>
              <Row label={t('Table Time')} sub={`${Math.max(1, Math.ceil(elapsedSeconds / 3600))}h charged`} value={money(detail.tableCharge, currency)} />
            </div>
          )}

          {detail.items && detail.items.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">{t('Items')}</p>
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
            <span className="text-sm font-semibold">{t('Total Due')}</span>
            <span className="text-xl font-extrabold">{money(detail.totalCents, currency)}</span>
          </div>

          {detail.pendingOrders && detail.pendingOrders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">{t('Your Orders (Pending)')}</p>
              {detail.pendingOrders.map((order, index) => (
                <div key={index} className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p className="font-semibold text-amber-600">{t('Being prepared — {amount}', { amount: money(order.totalCents, currency) })}</p>
                  <p>{order.items.map((i) => `${i.quantity} × ${i.description}`).join(', ')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5 pb-0">
          <p className="text-sm font-semibold text-muted-foreground">{t('Order Drinks')}</p>
          {drinks.length === 0 && <p className="text-sm text-muted-foreground">{t('Menu unavailable.')}</p>}

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
                      {value === 'all' ? t('All') : t(DRINK_CATEGORIES.find((c) => c.value === value)?.short || '')}
                    </button>
                  )
                })}
              </div>

              {showSearch && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder={t('Search the menu…')}
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
                        <Icon className="h-3.5 w-3.5" /> {t(group.label)} ({groupDrinksFiltered.length})
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
                <p className="py-3 text-center text-sm text-muted-foreground">{t('Nothing matches that search.')}</p>
              )}
            </>
          )}

          {message && <p className={cn('text-sm', message.error ? 'text-destructive' : 'text-emerald-600')}>{message.text}</p>}

          <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-between gap-3 rounded-b-xl border-t bg-card/95 px-5 py-3 backdrop-blur">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t('Your order')}</p>
              <p className="text-base font-extrabold tabular-nums">{money(basketTotal, currency)}</p>
            </div>
            <Button disabled={placing || basketTotal <= 0} onClick={() => void placeOrder()}>
              {placing ? t('Placing…') : t('Place Order')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Looking for players?')}</DialogTitle>
            <DialogDescription>{t('Tell other players how many are needed.')}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="player-search-count">{t('How many players are you looking for?')}</Label>
              <Input
                id="player-search-count"
                type="number"
                min="1"
                max="50"
                value={searchCount}
                onChange={(event) => setSearchCount(event.target.value)}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary" checked={searchUpTo} onChange={(event) => setSearchUpTo(event.target.checked)} />
              {t('Up to this number')}
            </label>
            {playerMessage && <p className={cn('text-sm', playerMessage.error ? 'text-destructive' : 'text-emerald-600')}>{playerMessage.text}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSearchDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={() => void requestPlayers()} disabled={playerActionBusy}>
              <Users /> {playerActionBusy ? t('Saving…') : t('Request players')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fulfillDialogOpen} onOpenChange={setFulfillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Players found')}</DialogTitle>
            <DialogDescription>{lookingForPlayersLabel(session.lookingForPlayersCount || 1, Boolean(session.lookingForPlayersUpTo), t)}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="players-subscribers-joined">{t('Subscribers (free table time)')}</Label>
              <Input
                id="players-subscribers-joined"
                type="number"
                min="0"
                max="50"
                value={subscribersJoined}
                onChange={(event) => setSubscribersJoined(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="players-non-subscribers-joined">{t('Non-subscribers')}</Label>
              <Input
                id="players-non-subscribers-joined"
                type="number"
                min="0"
                max="50"
                value={nonSubscribersJoined}
                onChange={(event) => setNonSubscribersJoined(event.target.value)}
              />
            </div>
            {playerMessage && <p className={cn('text-sm sm:col-span-2', playerMessage.error ? 'text-destructive' : 'text-emerald-600')}>{playerMessage.text}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={() => void fulfillPlayerRequest()} disabled={playerActionBusy || !Number.isInteger(Number(subscribersJoined)) || !Number.isInteger(Number(nonSubscribersJoined)) || Number(subscribersJoined) + Number(nonSubscribersJoined) < 1 || Number(subscribersJoined) + Number(nonSubscribersJoined) > 50}>
              <Check /> {playerActionBusy ? t('Saving…') : t('Confirm players')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
