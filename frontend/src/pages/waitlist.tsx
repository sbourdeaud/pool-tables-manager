import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, UserPlus, X } from 'lucide-react'
import { apiCancelWaitlistEntry, apiCreateWaitlistEntry, apiSeatWaitlistEntry, apiTableTypes, apiWaitlist, type TableType, type WaitlistResponse } from '@/lib/api'
import { elapsedDuration } from '@/lib/format'
import { formatWaitTime } from '@/lib/waitlist-format'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'

export function WaitlistPage() {
  const { toast } = useToast()
  const { t } = useI18n()
  const requestedTypeId = React.useMemo(() => new URLSearchParams(window.location.search).get('type') || '', [])
  const [tableTypes, setTableTypes] = React.useState<TableType[]>([])
  const [typeId, setTypeId] = React.useState('')
  const [patronName, setPatronName] = React.useState('')
  const [partySize, setPartySize] = React.useState('1')
  const [waitlist, setWaitlist] = React.useState<WaitlistResponse>({ entries: [], queueDepth: 0, averageWaitMinutes: null })
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [now, setNow] = React.useState(Date.now())

  const load = React.useCallback(async (silent = false) => {
    const [typesResult, queueResult] = await Promise.all([apiTableTypes(), apiWaitlist()])
    if (typesResult.ok && typesResult.data) {
      const loadedTypes = typesResult.data
      setTableTypes(loadedTypes)
      setTypeId((current) => loadedTypes.some((type) => type.id === current) ? current : loadedTypes.find((type) => type.id === requestedTypeId)?.id || loadedTypes[0]?.id || '')
    } else if (!silent) {
      toast({ title: t('Failed to load pool types'), variant: 'error' })
    }
    if (queueResult.ok && queueResult.data) {
      setWaitlist(queueResult.data)
    } else if (!silent) {
      toast({ title: t('Failed to load waitlist'), description: queueResult.error || `Error ${queueResult.status}`, variant: 'error' })
    }
    setLoading(false)
  }, [requestedTypeId, t, toast])

  React.useEffect(() => {
    void load()
    const poll = window.setInterval(() => void load(true), 30000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
    }
  }, [load])

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!patronName.trim() || !typeId) return
    setSaving(true)
    const result = await apiCreateWaitlistEntry({ patronName: patronName.trim(), partySize: Number(partySize), tableTypeId: typeId })
    setSaving(false)
    if (!result.ok) {
      toast({ title: t('Failed to add party'), description: result.error, variant: 'error' })
      return
    }
    toast({ title: t('Party added to waitlist') })
    setPatronName('')
    setPartySize('1')
    await load(true)
  }

  const remove = async (entryId: string, seat: boolean) => {
    const result = seat ? await apiSeatWaitlistEntry(entryId) : await apiCancelWaitlistEntry(entryId)
    if (!result.ok) {
      toast({ title: seat ? t('Failed to seat party') : t('Failed to remove party'), variant: 'error' })
      return
    }
    toast({ title: seat ? t('Party marked as seated') : t('Party removed from waitlist') })
    await load(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Admin')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('Waiting List')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('Track parties waiting for a table by pool type.')}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" /> {t('Add party')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 sm:grid-cols-[minmax(12rem,1fr)_minmax(10rem,14rem)_8rem_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="waitlist-name">{t('Patron name')}</Label>
              <Input id="waitlist-name" value={patronName} maxLength={100} onChange={(event) => setPatronName(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waitlist-type">{t('Pool type')}</Label>
              <Select value={typeId || undefined} onValueChange={setTypeId} disabled={tableTypes.length === 0}>
                <SelectTrigger id="waitlist-type"><SelectValue placeholder={t('Select pool type')} /></SelectTrigger>
                <SelectContent>
                  {tableTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="waitlist-size">{t('Party size')}</Label>
              <Input id="waitlist-size" type="number" min="1" max="50" step="1" value={partySize} onChange={(event) => setPartySize(event.target.value)} required />
            </div>
            <Button type="submit" disabled={saving || !patronName.trim() || !typeId}>
              <UserPlus /> {saving ? t('Adding…') : t('Add to queue')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('Current queue')}</CardTitle>
          <CardDescription>
            {loading ? t('Loading…') : t('{count} parties waiting · average estimated wait {wait}', { count: waitlist.queueDepth, wait: formatWaitTime(waitlist.averageWaitMinutes, t) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!loading && waitlist.entries.length === 0 && <p className="py-4 text-sm text-muted-foreground">{t('No one is waiting.')}</p>}
          {waitlist.entries.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{entry.patronName} · {t('Party of {count}', { count: entry.partySize })}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.tableTypeName} · {t('Queue #{position}', { position: entry.position || 1 })} · {t('Waiting {time}', { time: elapsedDuration(entry.createdAt, now) })}
                </p>
                <p className="mt-1 text-xs font-medium">{t('Expected wait')}: {formatWaitTime(entry.expectedWaitMinutes ?? null, t)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={() => void remove(entry.id, true)}>
                  <Check /> {t('Mark seated')}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(entry.id, false)} aria-label={t('Remove party')}>
                  <X /> {t('Remove')}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
