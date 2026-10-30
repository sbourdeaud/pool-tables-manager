import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { apiPublicTables, type PublicTable } from '@/lib/api'
import { elapsedDuration } from '@/lib/format'
import { applyTheme, getStoredTheme } from '@/lib/theme'
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

const POLL_MS = 5000

export function StatusApp() {
  const [tables, setTables] = React.useState<PublicTable[] | null>(null)
  const [live, setLive] = React.useState(true)
  const [now, setNow] = React.useState(Date.now())
  const [theme, setTheme] = React.useState(getStoredTheme())
  const [typeOrder, setTypeOrder] = React.useState<string[]>([])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  const load = React.useCallback(async () => {
    const result = await apiPublicTables()
    if (result.ok && result.data) {
      setTables(result.data)
      setLive(true)
    } else {
      setLive(false)
    }
  }, [])

  React.useEffect(() => {
    void fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((settings) => {
        try {
          const value = JSON.parse(settings?.table_type_order || '[]')
          if (Array.isArray(value)) setTypeOrder(value.filter((v: unknown): v is string => typeof v === 'string'))
        } catch {
          /* ignore malformed order */
        }
      })
      .catch(() => {})
    void load()
    const poll = window.setInterval(() => void load(), POLL_MS)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
    }
  }, [load])

  const groups = React.useMemo(() => {
    const map = new Map<string, PublicTable[]>()
    for (const tb of tables || []) {
      const key = tb.typeName || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tb)
    }
    const rank = (name: string) => {
      const index = typeOrder.indexOf(name)
      return index === -1 ? Number.MAX_SAFE_INTEGER : index
    }
    return [...map.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
  }, [tables, typeOrder])

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Table Status</h1>
            <p className="text-sm text-muted-foreground">Live availability — updates automatically</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                live ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600',
              )}
            >
              {live ? 'Live' : 'Reconnecting…'}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card shadow-sm"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {tables === null ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No tables configured</p>
        ) : (
          groups.map(([typeName, groupTables]) => (
            <section key={typeName} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: hashColor(typeName) }}>
                  {typeName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {groupTables.length} table{groupTables.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {groupTables
                  .slice()
                  .sort((a, b) => a.number - b.number)
                  .map((tb) => {
                    const status = tb.status || 'available'
                    return (
                      <div
                        key={tb.number}
                        className={cn(
                          'flex min-h-[104px] flex-col justify-between rounded-xl border border-l-4 p-3',
                          status === 'occupied' && 'border-l-red-500/70 bg-gradient-to-b from-red-500/15 to-red-600/10',
                          status === 'maintenance' && 'border-l-gray-400/70 bg-gradient-to-b from-gray-500/15 to-gray-600/10',
                          status === 'available' && 'border-l-emerald-500/70 bg-gradient-to-b from-emerald-500/15 to-emerald-600/10',
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xl font-bold">#{tb.number}</span>
                          <span className="text-[11px] uppercase tracking-wider opacity-75">{status}</span>
                        </div>
                        {status === 'occupied' && (
                          <div className="flex flex-col gap-1 text-[13px] opacity-85">
                            <span>
                              {tb.numberOfPlayers || 1} player{(tb.numberOfPlayers || 1) > 1 ? 's' : ''}
                            </span>
                            <span className="font-semibold tabular-nums">{elapsedDuration(tb.startedAt, now)}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
