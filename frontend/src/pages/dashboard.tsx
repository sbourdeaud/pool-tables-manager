import * as React from 'react'
import { User, Plus, Minus, ArrowLeftRight, Beer, Play, Wrench, Trash2, Bell, Check, X, CheckCircle2, GripVertical, ChevronDown, Search } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  apiAddTabItem,
  apiDeleteTable,
  apiDrinks,
  apiFulfillOrder,
  apiCancelOrder,
  apiPendingOrders,
  apiRemoveTabItem,
  apiSessionDetail,
  apiSessions,
  apiSetTableStatus,
  apiStartSession,
  apiTableTypes,
  apiTables,
  apiTransferSession,
  apiUpdateSession,
  type Drink,
  type PendingOrder,
  type SessionRow,
  type TableRow,
  type TableType,
} from '@/lib/api'
import { buildQrSvg, tableSessionUrl } from '@/lib/qr'
import { CheckoutDialog } from '@/components/checkout-dialog'
import { typeFlag } from '@/components/type-flag'
import { DRINK_CATEGORIES, groupDrinks, type DrinkCategory } from '@/lib/menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { SettlementDialog } from '@/components/settlement-dialog'
import { playNewOrderChime, playPoolBallSound } from '@/lib/audio'
import { chargedHours, elapsedDuration, money, minutesAgo } from '@/lib/format'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const PALETTE = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#e11d48', '#06b6d4']

function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return PALETTE[Math.abs(h) % PALETTE.length]
}


type DialogState =
  | { kind: 'start'; table: TableRow }
  | { kind: 'drink'; session: SessionRow }
  | { kind: 'transfer'; session: SessionRow }
  | { kind: 'checkout'; session: SessionRow }
  | { kind: 'settle'; session: SessionRow }
  | { kind: 'add-player'; session: SessionRow }
  | { kind: 'qr'; tableNumber: number; pin?: string }
  | null

export function DashboardPage() {
  const { settings, save: saveSetting } = useSettings()
  const { toast } = useToast()
  const currency = settings.currency || localStorage.getItem('currency') || '$'
  const [types, setTypes] = React.useState<TableType[]>([])
  const [tables, setTables] = React.useState<TableRow[]>([])
  const [sessions, setSessions] = React.useState<SessionRow[]>([])
  const [totals, setTotals] = React.useState<Record<string, number>>({})
  const [orders, setOrders] = React.useState<PendingOrder[]>([])
  const [now, setNow] = React.useState(Date.now())
  const [loading, setLoading] = React.useState(true)
  const [dialog, setDialog] = React.useState<DialogState>(null)
  const seenOrders = React.useRef<Set<string> | null>(null)

  const load = React.useCallback(async () => {
    const [tablesRes, typesRes, sessionsRes] = await Promise.all([apiTables(), apiTableTypes(), apiSessions()])
    const active = (sessionsRes.data || []).filter((s) => s.status === 'active')
    if (tablesRes.ok && tablesRes.data) setTables(tablesRes.data)
    if (typesRes.ok && typesRes.data) setTypes(typesRes.data)
    if (sessionsRes.ok && sessionsRes.data) setSessions(sessionsRes.data)
    const details = await Promise.all(active.map((s) => apiSessionDetail(s.id)))
    const nextTotals: Record<string, number> = {}
    details.forEach((d, i) => {
      if (d.ok && d.data) nextTotals[active[i].id] = d.data.totalCents || 0
    })
    setTotals(nextTotals)
    setLoading(false)
  }, [])

  const loadOrders = React.useCallback(async () => {
    const result = await apiPendingOrders()
    if (!result.ok || !result.data) return
    const ids = new Set(result.data.map((o) => o.id))
    if (seenOrders.current === null) {
      seenOrders.current = ids
    } else {
      const hasNew = [...ids].some((id) => !seenOrders.current!.has(id))
      seenOrders.current = ids
      if (hasNew) playNewOrderChime()
    }
    setOrders(result.data)
  }, [])

  React.useEffect(() => {
    void load()
    void loadOrders()
  }, [load, loadOrders])

  React.useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    const refresh = window.setInterval(() => void load(), 15000)
    const pollOrders = window.setInterval(() => void loadOrders(), 10000)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(refresh)
      window.clearInterval(pollOrders)
    }
  }, [load, loadOrders])

  const activeSessionFor = (tableId: string) => sessions.find((s) => s.tableId === tableId && s.status === 'active')

  const finishAction = async (message: string) => {
    toast({ title: message })
    setDialog(null)
    await load()
  }

  const renderTile = (tb: TableRow, type: TableType) => {
    const session = activeSessionFor(tb.id)
    return (
      <TableTile
        key={tb.id}
        table={tb}
        type={type}
        session={session}
        totalCents={session ? totals[session.id] : undefined}
        now={now}
        currency={currency}
        onStart={() => setDialog({ kind: 'start', table: tb })}
        onAddDrink={(s) => setDialog({ kind: 'drink', session: s })}
        onTransfer={(s) => setDialog({ kind: 'transfer', session: s })}
        onQr={(pin) => setDialog({ kind: 'qr', tableNumber: tb.number, pin })}
        onCheckout={(s) => setDialog({ kind: 'checkout', session: s })}
        onSettle={(s) => setDialog({ kind: 'settle', session: s })}
        onAddPlayer={(s) => setDialog({ kind: 'add-player', session: s })}
        onMaintenance={async () => {
          const result = await apiSetTableStatus(tb.id, 'maintenance')
          if (!result.ok) toast({ title: 'Failed to update table', variant: 'error' })
          await load()
        }}
        onDelete={async () => {
          const result = await apiDeleteTable(tb.id)
          if (!result.ok) toast({ title: 'Failed to delete table', variant: 'error' })
          await load()
        }}
      />
    )
  }

  const typeOrder = React.useMemo<string[]>(() => {
    try {
      const value = JSON.parse(settings.table_type_order || '[]')
      return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }, [settings.table_type_order])

  const groups = React.useMemo(() => {
    const rank = (name: string) => {
      const index = typeOrder.indexOf(name)
      return index === -1 ? Number.MAX_SAFE_INTEGER : index
    }
    return types
      .map((type) => ({
        type,
        tables: tables
          .filter((tb) => tb.tableTypeId === type.id && tb.status !== 'maintenance')
          .sort((a, b) => a.number - b.number),
      }))
      .filter((g) => g.tables.length > 0)
      .sort((a, b) => rank(a.type.name_en) - rank(b.type.name_en))
  }, [types, tables, typeOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const names = groups.map((g) => g.type.name_en)
    const from = names.indexOf(String(active.id))
    const to = names.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    const next = names.slice()
    next.splice(to, 0, next.splice(from, 1)[0])
    const allNames = types.map((t) => t.name_en)
    const merged = [...next, ...allNames.filter((n) => !next.includes(n))]
    void saveSetting('table_type_order', JSON.stringify(merged))
  }

  const layout = settings.dashboard_layout === 'tabs' ? 'tabs' : 'sections'
  const [collapsedTypes, setCollapsedTypes] = React.useState<string[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem('dashboard_collapsed_types') || '[]')
      return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  })
  const [activeTab, setActiveTab] = React.useState('')
  React.useEffect(() => {
    if (groups.length > 0 && !groups.some((g) => g.type.name_en === activeTab)) {
      setActiveTab(groups[0].type.name_en)
    }
  }, [groups, activeTab])
  const toggleCollapsed = (name: string) => {
    setCollapsedTypes((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
      localStorage.setItem('dashboard_collapsed_types', JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live view of sessions, tabs and pending drink orders.
          </p>
        </div>
      </div>

      {orders.length > 0 && (
        <PendingOrdersPanel
          orders={orders}
          currency={currency}
          onChanged={loadOrders}
        />
      )}

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="h-40 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No tables configured yet. Add table types and tables under Admin → Table Types & Inventory.
          </CardContent>
        </Card>
      ) : layout === 'tabs' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToHorizontalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={groups.map((g) => g.type.name_en)} strategy={horizontalListSortingStrategy}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="group-data-[orientation=horizontal]/tabs:h-auto h-auto w-full justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-lg bg-muted/40 p-1">
                {groups.map(({ type, tables: groupTables }) => (
                  <SortableTabTrigger
                    key={type.id}
                    id={type.name_en}
                    name={type.name_en}
                    count={groupTables.length}
                    occupied={groupTables.filter((tb) => activeSessionFor(tb.id)).length}
                  />
                ))}
              </TabsList>
              {groups.map(({ type, tables: groupTables }) => (
                <TabsContent key={type.id} value={type.name_en} className="mt-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{groupTables.map((tb) => renderTile(tb, type))}</div>
                </TabsContent>
              ))}
            </Tabs>
          </SortableContext>
        </DndContext>
      ) : (
        <>
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1" role="navigation" aria-label="Table types">
            {groups.map(({ type, tables: groupTables }) => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  if (collapsedTypes.includes(type.name_en)) toggleCollapsed(type.name_en)
                  document.getElementById(`type-${type.name_en.replace(/\s+/g, '-')}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-semibold shadow-sm transition-colors hover:bg-accent"
                title={`Jump to ${type.name_en}`}
              >
                {flagChip(type.name_en)}
                {type.name_en}
                <span className="text-muted-foreground">{groupTables.length}</span>
              </button>
            ))}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
            <SortableContext items={groups.map((g) => g.type.name_en)} strategy={verticalListSortingStrategy}>
              {groups.map(({ type, tables: groupTables }) => {
                const collapsed = collapsedTypes.includes(type.name_en)
                return (
                  <SortableTypeSection key={type.id} id={type.name_en} name={type.name_en}>
                    {(handle) => (
                      <>
                        <div id={`type-${type.name_en.replace(/\s+/g, '-')}`} className="flex scroll-mt-20 items-center gap-3">
                          {handle}
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white"
                            style={{ background: hashColor(type.name_en) }}
                          >
                            {flagChip(type.name_en)}
                            {type.name_en}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {groupTables.length} table{groupTables.length === 1 ? '' : 's'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-7 w-7"
                            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
                            onClick={() => toggleCollapsed(type.name_en)}
                          >
                            <ChevronDown className={cn('h-4 w-4 transition-transform', collapsed && '-rotate-90')} />
                          </Button>
                        </div>
                        <Collapsible open={!collapsed}>
                          <CollapsibleContent>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{groupTables.map((tb) => renderTile(tb, type))}</div>
                          </CollapsibleContent>
                        </Collapsible>
                      </>
                    )}
                  </SortableTypeSection>
                )
              })}
            </SortableContext>
          </DndContext>
        </>
      )}

      <StartSessionDialog
        state={dialog}
        onClose={() => setDialog(null)}
        onStarted={() => void finishAction('Session started')}
      />
      <AddDrinkDialog
        state={dialog}
        currency={currency}
        onClose={() => setDialog(null)}
        onDone={() => void finishAction('Items added to tab')}
      />
      <TransferDialog
        state={dialog}
        tables={tables}
        sessions={sessions}
        onClose={() => setDialog(null)}
        onDone={() => void finishAction('Session transferred')}
      />
      <QrDialog state={dialog} onClose={() => setDialog(null)} />
      <CheckoutDialog
        open={dialog?.kind === 'checkout'}
        sessionId={dialog?.kind === 'checkout' ? dialog.session.id : null}
        numberOfPlayers={dialog?.kind === 'checkout' ? dialog.session.numberOfPlayers || 1 : 1}
        onClose={() => setDialog(null)}
        onDone={() => void load()}
      />
      <AddPlayerDialog
        state={dialog}
        onClose={() => setDialog(null)}
        onDone={() => { setDialog(null); void load() }}
      />
      <SettlementDialog
        open={dialog?.kind === 'settle'}
        sessionId={dialog?.kind === 'settle' ? dialog.session.id : null}
        numberOfPlayers={dialog?.kind === 'settle' ? dialog.session.numberOfPlayers || 1 : 1}
        onClose={() => setDialog(null)}
        onDone={() => void load()}
      />
    </div>
  )
}

function SortableTypeSection({ id, name, children }: { id: string; name: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { name } })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
    position: isDragging ? 'relative' : undefined,
  }
  return (
    <section ref={setNodeRef} style={style} className="space-y-3">
      {children(
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder table type"
          title="Drag to reorder"
          className="cursor-grab touch-none rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>,
      )}
    </section>
  )
}

function flagChip(name?: string | null) {
  const flag = typeFlag(name)
  if (!flag) return null
  return (
    <span className="flex h-[15px] w-[22px] items-center justify-center overflow-hidden rounded-[3px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]">
      {flag}
    </span>
  )
}

function SortableTabTrigger({ id, name, count, occupied }: { id: string; name: string; count: number; occupied: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.8 : undefined }}
      className="flex shrink-0 items-center"
    >
      <TabsTrigger value={name} className="gap-1.5 data-[state=active]:shadow-sm">
        {flagChip(name)}
        {name}
        <span className="text-xs font-normal text-muted-foreground">{count}</span>
        {occupied > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-label={`${occupied} occupied`} />}
      </TabsTrigger>
      {/* Drag listeners live on a separate grip: attaching them to the trigger
          swallows the tab click. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${name}`}
        title="Drag to reorder"
        className="ml-0.5 cursor-grab touch-none rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function PendingOrdersPanel({ orders, currency, onChanged }: { orders: PendingOrder[]; currency: string; onChanged: () => Promise<void> }) {
  const { toast } = useToast()

  const act = async (order: PendingOrder, fulfill: boolean) => {
    const result = fulfill ? await apiFulfillOrder(order.id) : await apiCancelOrder(order.id)
    if (!result.ok) toast({ title: 'Failed to update order', variant: 'error' })
    await onChanged()
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/[0.06]">
      <CardContent className="space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Bell className="h-4 w-4 text-amber-600" /> Pending Orders ({orders.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div key={order.id} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Table #{order.tableNumber ?? '?'}</span>
                <span className="text-xs font-normal text-muted-foreground">{minutesAgo(order.createdAt)}</span>
              </div>
              <p className="text-sm">{order.items.map((i) => `${i.quantity} × ${i.description}`).join(', ')}</p>
              <p className="text-xs text-muted-foreground">{money(order.totalCents, currency)}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={() => void act(order, true)}>
                  <Check /> Fulfilled
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => void act(order, false)}>
                  <X /> Cancel
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface TableTileProps {
  table: TableRow
  type: TableType
  session?: SessionRow
  totalCents?: number
  now: number
  currency: string
  onStart: () => void
  onAddDrink: (session: SessionRow) => void
  onTransfer: (session: SessionRow) => void
  onCheckout: (session: SessionRow) => void
  onSettle: (session: SessionRow) => void
  onQr: (pin?: string) => void
  onAddPlayer: (session: SessionRow) => void
  onMaintenance: () => Promise<void>
  onDelete: () => Promise<void>
}

function TableTile(props: TableTileProps) {
  const { table, session, totalCents, now, currency, type } = props
  const occupied = Boolean(session)
  const start = session?.startedAt
  const maintenanceDue =
    type.maxUsedHours != null && type.maxUsedHours > 0 && ((table.usedSinceMaintenanceSeconds || 0) + (start ? (now - new Date(start).getTime()) / 1000 : 0)) >= type.maxUsedHours * 3600

  const qrSvg = occupied ? buildQrSvg(tableSessionUrl(table.number, session!.pin), 4, 2) : ''

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 border-l-4 p-4',
        occupied
          ? 'border-l-red-500/70 bg-gradient-to-b from-red-500/10 to-red-600/[0.06]'
          : 'border-l-emerald-500/70 bg-gradient-to-b from-emerald-500/10 to-emerald-600/[0.06]',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-extrabold">
          #{table.number}
          {session?.pin && <span className="ml-2 font-mono text-sm font-bold opacity-70">({session.pin})</span>}
        </div>
        <span className="rounded-md bg-background/70 px-2 py-1 text-xs font-semibold capitalize">{occupied ? 'occupied' : table.status}</span>
      </div>

      {maintenanceDue && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1.5 text-xs font-bold text-amber-600">
          Maintenance due — {(((table.usedSinceMaintenanceSeconds || 0) + (start ? (now - new Date(start).getTime()) / 1000 : 0)) / 3600).toFixed(1)}h / {type.maxUsedHours}h used
        </div>
      )}

      {session ? (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4" />
            <span>
              {session.numberOfPlayers || 1} player{(session.numberOfPlayers || 1) > 1 ? 's' : ''}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => props.onSettle(session)} aria-label="Settle player">
                <Minus />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => props.onAddPlayer(session)} aria-label="Add player">
                <Plus />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono font-semibold tabular-nums">{elapsedDuration(start, now)}</span>
            <span className="text-xs text-muted-foreground">({chargedHours(start, now)}h charged)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Open tab</span>
            <span className="text-sm font-bold">{totalCents != null ? money(totalCents, currency) : '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Show QR code"
              onClick={() => props.onQr(session.pin)}
              className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white p-1 shadow-sm transition-transform hover:scale-105 [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-[11px] leading-tight text-muted-foreground">Scan to track your time &amp; tab</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => props.onAddDrink(session)}>
              <Beer /> Drink
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => props.onTransfer(session)}>
              <ArrowLeftRight /> Transfer
            </Button>
            <Button size="sm" className="flex-1" onClick={() => props.onCheckout(session)}>
              <CheckCircle2 /> Checkout
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Available</p>
          <Button className="mt-auto w-full" onClick={props.onStart}>
            <Play /> Start Session
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => void props.onMaintenance()}>
              <Wrench /> Maintenance
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => void props.onDelete()}>
              <Trash2 /> Delete
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

function AddPlayerDialog({ state, onClose, onDone }: { state: DialogState; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast()
  const open = state?.kind === 'add-player'
  const session = state?.kind === 'add-player' ? state.session : null
  const [busy, setBusy] = React.useState(false)

  const add = async (isSubscriber: boolean) => {
    if (!session) return
    setBusy(true)
    const numberOfPlayers = (session.numberOfPlayers || 1) + 1
    const subscriberCount = (session.subscriberCount || 0) + (isSubscriber ? 1 : 0)
    const result = await apiUpdateSession(session.id, { numberOfPlayers, subscriberCount })
    setBusy(false)
    if (!result.ok) {
      return toast({ title: 'Failed to add player', description: result.error || `Error ${result.status}`, variant: 'error' })
    }
    toast({ title: isSubscriber ? 'Subscriber added' : 'Non-subscriber added' })
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add player</DialogTitle>
          <DialogDescription>
            {session
              ? `The session now has ${(session.numberOfPlayers || 1)} player${(session.numberOfPlayers || 1) === 1 ? '' : 's'}. Is the new player a subscriber?`
              : 'Is the new player a subscriber?'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Button className="w-full justify-start" disabled={busy} onClick={() => void add(true)}>
            <User /> Subscriber — free table time
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled={busy} onClick={() => void add(false)}>
            <User /> Non-subscriber — pays their share
          </Button>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StartSessionDialog({ state, onClose, onStarted }: { state: DialogState; onClose: () => void; onStarted: () => void }) {
  const [subs, setSubs] = React.useState(0)
  const [nonsubs, setNonsubs] = React.useState(1)
  const [busy, setBusy] = React.useState(false)
  const open = state?.kind === 'start'
  const table = state?.kind === 'start' ? state.table : null

  React.useEffect(() => {
    if (open) {
      setSubs(0)
      setNonsubs(1)
    }
  }, [open])

  const start = async () => {
    if (!table) return
    if (subs + nonsubs < 1) return
    setBusy(true)
    const result = await apiStartSession(table.id, subs + nonsubs, subs)
    setBusy(false)
    if (result.ok) {
      playPoolBallSound()
      onStarted()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Session — Table #{table?.number}</DialogTitle>
          <DialogDescription>How many players are playing?</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Counter label="Subscribers (free table time)" value={subs} onChange={setSubs} />
          <Counter label="Non-subscribers" value={nonsubs} min={0} onChange={setNonsubs} />
          <p className={`text-xs ${subs + nonsubs === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {subs + nonsubs === 0 ? 'Add at least one player to start the session.' : `Total players: ${subs + nonsubs}`}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void start()} disabled={busy || subs + nonsubs < 1}>
            <Play /> {busy ? 'Starting…' : 'Start Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Counter({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="space-y-2">
      <Label className="block">{label}</Label>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Decrease">
          <Minus />
        </Button>
        <span className="w-10 text-center text-2xl font-bold tabular-nums">{value}</span>
        <Button variant="outline" size="icon" onClick={() => onChange(Math.min(50, value + 1))} aria-label="Increase">
          <Plus />
        </Button>
      </div>
    </div>
  )
}

function AddDrinkDialog({ state, currency, onClose, onDone }: { state: DialogState; currency: string; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast()
  const open = state?.kind === 'drink'
  const session = state?.kind === 'drink' ? state.session : null
  const [drinks, setDrinks] = React.useState<Drink[]>([])
  const [items, setItems] = React.useState<{ id: string; description: string; quantity: number; unitPrice: number }[]>([])
  const [basket, setBasket] = React.useState<Record<string, number>>({})
  const [busy, setBusy] = React.useState(false)
  const [activeCategory, setActiveCategory] = React.useState<'all' | DrinkCategory>('all')
  const [search, setSearch] = React.useState('')
  const menuGroups = React.useMemo(() => groupDrinks(drinks), [drinks])
  const visibleGroups = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return menuGroups
      .filter((group) => activeCategory === 'all' || group.value === activeCategory)
      .map((group) => ({ ...group, drinks: group.drinks.filter((d) => d.name.toLowerCase().includes(term)) }))
      .filter((group) => group.drinks.length > 0)
  }, [menuGroups, activeCategory, search])

  React.useEffect(() => {
    if (!open || !session) return
    setBasket({})
    setSearch('')
    setActiveCategory('all')
    void apiDrinks(localStorage.getItem('lang') || 'en').then((r) => setDrinks(r.data || []))
    void apiSessionDetail(session.id).then((r) => setItems((r.data?.items || []).map((i) => ({ id: i.id, description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))))
  }, [open, session])

  const removeItem = async (itemId: string) => {
    if (!session) return
    const result = await apiRemoveTabItem(session.id, itemId)
    if (result.ok) {
      setItems((current) => current.filter((i) => i.id !== itemId))
    } else {
      toast({ title: 'Failed to remove item', variant: 'error' })
    }
  }

  const place = async () => {
    if (!session) return
    const lines = drinks.filter((d) => (basket[d.id] || 0) > 0)
    if (lines.length === 0) return
    setBusy(true)
    for (const d of lines) {
      const result = await apiAddTabItem(session.id, {
        description: d.name,
        quantity: basket[d.id],
        unitPrice: d.price_cents,
        vatRatePercent: d.vatRatePercent,
      })
      if (!result.ok) {
        toast({ title: 'Failed to add item', description: d.name, variant: 'error' })
        setBusy(false)
        return
      }
    }
    setBusy(false)
    onDone()
  }

  const basketTotal = drinks.reduce((sum, d) => sum + (basket[d.id] || 0) * d.price_cents, 0)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Drinks</DialogTitle>
          <DialogDescription>Add items to the open tab.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {items.length > 0 && (
            <div className="space-y-2">
              <Label className="block">On this tab</Label>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <span>
                    {item.quantity} × {item.description}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{money(item.quantity * item.unitPrice, currency)}</span>
                    <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => void removeItem(item.id)} aria-label="Remove">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <Label className="block">Menu</Label>
            {drinks.length === 0 && <p className="text-sm text-muted-foreground">No drinks configured.</p>}
            {drinks.length > 0 && (
              <>
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {(['all', ...DRINK_CATEGORIES.map((c) => c.value)] as const).map((value) => {
                    const group = menuGroups.find((g) => g.value === value)
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
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search the menu…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </>
            )}
            {drinks.length > 0 && visibleGroups.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">Nothing matches that search.</p>}
            {visibleGroups.map((group) => (
              <div key={group.value} className="space-y-2">
                <p className="flex items-center gap-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <group.icon className="h-3.5 w-3.5" /> {group.label}
                </p>
                {group.drinks.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{money(d.price_cents, currency)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setBasket((b) => ({ ...b, [d.id]: Math.max(0, (b[d.id] || 0) - 1) }))}
                        aria-label="Decrease"
                      >
                        <Minus />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{basket[d.id] || 0}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setBasket((b) => ({ ...b, [d.id]: Math.min(50, (b[d.id] || 0) + 1) }))}
                        aria-label="Increase"
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <span className="mr-auto self-center text-sm font-semibold">{money(basketTotal, currency)}</span>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => void place()} disabled={busy || basketTotal <= 0}>
            {busy ? 'Adding…' : 'Add to tab'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TransferDialog({ state, tables, sessions, onClose, onDone }: { state: DialogState; tables: TableRow[]; sessions: SessionRow[]; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast()
  const open = state?.kind === 'transfer'
  const session = state?.kind === 'transfer' ? state.session : null
  const [busy, setBusy] = React.useState(false)

  const occupied = new Set(sessions.filter((s) => s.status === 'active').map((s) => s.tableId))
  const candidates = tables
    .filter((tb) => tb.id !== session?.tableId && tb.status !== 'maintenance' && !occupied.has(tb.id))
    .sort((a, b) => a.number - b.number)

  const transfer = async (tableId: string) => {
    if (!session) return
    setBusy(true)
    const result = await apiTransferSession(session.id, tableId)
    setBusy(false)
    if (result.ok) onDone()
    else toast({ title: 'Failed to transfer', variant: 'error' })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer to Table</DialogTitle>
          <DialogDescription>Choose an available table for this session.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          {candidates.length === 0 && <p className="text-sm text-muted-foreground">No other tables are available.</p>}
          {candidates.map((tb) => (
            <Button key={tb.id} variant="outline" className="w-full justify-start" disabled={busy} onClick={() => void transfer(tb.id)}>
              Table #{tb.number}
            </Button>
          ))}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QrDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  const open = state?.kind === 'qr'
  const tableNumber = state?.kind === 'qr' ? state.tableNumber : 0
  const pin = state?.kind === 'qr' ? state.pin : undefined
  const url = tableNumber ? tableSessionUrl(tableNumber, pin) : ''
  const svg = open ? buildQrSvg(url, 6, 4) : ''

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan to View Tab — Table #{tableNumber}</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center gap-3">
          <div className="h-64 w-64 rounded-lg bg-white p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
