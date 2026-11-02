import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react'
import { MonthCalendar } from '@/components/month-calendar'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/toast'
import { useI18n } from '@/lib/i18n'
import { apiCreateVenueEvent, apiDeleteVenueEvent, apiTableTypes, apiUpdateVenueEvent, apiVenueEvents, type TableType, type VenueEvent, type VenueEventInput } from '@/lib/api'
import { calendarDateValue, calendarMonthValue, formatCalendarDate } from '@/lib/venue-calendar'

function emptyEventForm(eventDate: string): VenueEventInput {
  return { title: '', description: '', eventDate, allDay: true, startTime: '', endTime: '', tableTypeIds: [] }
}

export function VenueCalendarPage() {
  const { toast } = useToast()
  const { language, t } = useI18n()
  const today = calendarDateValue(new Date())
  const [month, setMonth] = React.useState(calendarMonthValue())
  const [selectedDate, setSelectedDate] = React.useState(today)
  const [events, setEvents] = React.useState<VenueEvent[]>([])
  const [tableTypes, setTableTypes] = React.useState<TableType[]>([])
  const [form, setForm] = React.useState<VenueEventInput>(() => emptyEventForm(today))
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const eventLoadSequence = React.useRef(0)

  const loadEvents = React.useCallback(async () => {
    const requestSequence = ++eventLoadSequence.current
    setLoading(true)
    const result = await apiVenueEvents(month)
    if (requestSequence !== eventLoadSequence.current) return
    if (result.ok && result.data) setEvents(result.data)
    else toast({ title: t('Failed to load events'), description: result.error || `Error ${result.status}`, variant: 'error' })
    setLoading(false)
  }, [month, t, toast])

  React.useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  React.useEffect(() => {
    let active = true
    void apiTableTypes().then((result) => {
      if (!active) return
      if (result.ok && result.data) setTableTypes(result.data)
      else toast({ title: t('Failed to load table types'), variant: 'error' })
    })
    return () => { active = false }
  }, [t, toast])

  const eventCounts = React.useMemo(() => events.reduce<Record<string, number>>((counts, event) => {
    counts[event.eventDate] = (counts[event.eventDate] || 0) + 1
    return counts
  }, {}), [events])
  const selectedEvents = React.useMemo(() => events.filter((event) => event.eventDate === selectedDate), [events, selectedDate])

  const selectDate = (date: string) => {
    setMonth(date.slice(0, 7))
    setSelectedDate(date)
    setEditingId(null)
    setForm(emptyEventForm(date))
  }

  const changeMonth = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return
    const firstDate = `${value}-01`
    setMonth(value)
    setSelectedDate(firstDate)
    setEditingId(null)
    setForm(emptyEventForm(firstDate))
  }

  const editEvent = (event: VenueEvent) => {
    setSelectedDate(event.eventDate)
    setEditingId(event.id)
    setForm({
      title: event.title,
      description: event.description || '',
      eventDate: event.eventDate,
      allDay: event.allDay,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      tableTypeIds: event.tableTypeIds,
    })
  }

  const toggleType = (typeId: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      tableTypeIds: checked
        ? [...current.tableTypeIds, typeId]
        : current.tableTypeIds.filter((id) => id !== typeId),
    }))
  }

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.tableTypeIds.length) return
    setSaving(true)
    const body = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      startTime: form.allDay ? null : form.startTime,
      endTime: form.allDay ? null : form.endTime,
    }
    const result = editingId ? await apiUpdateVenueEvent(editingId, body) : await apiCreateVenueEvent(body)
    setSaving(false)
    if (!result.ok) {
      toast({ title: editingId ? t('Failed to update event') : t('Failed to create event'), description: result.error || `Error ${result.status}`, variant: 'error' })
      return
    }
    toast({ title: editingId ? t('Event updated') : t('Event created') })
    setEditingId(null)
    setForm(emptyEventForm(selectedDate))
    await loadEvents()
  }

  const deleteEvent = async (id: string) => {
    const result = await apiDeleteVenueEvent(id)
    if (!result.ok) {
      toast({ title: t('Failed to delete event'), description: result.error || `Error ${result.status}`, variant: 'error' })
      return
    }
    toast({ title: t('Event deleted') })
    await loadEvents()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Admin')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('Venue Calendar')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('Schedule events and select the affected table types.')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" />{t('Calendar')}</CardTitle>
            <div className="max-w-48 space-y-1.5">
              <Label htmlFor="venue-calendar-month">{t('Month')}</Label>
              <Input id="venue-calendar-month" type="month" value={month} onChange={(event) => changeMonth(event.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            <MonthCalendar month={month} selectedDate={selectedDate} eventCounts={eventCounts} language={language} onSelect={selectDate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{formatCalendarDate(selectedDate, language)}</CardTitle>
            <CardDescription>{loading ? t('Loading events…') : t('{count} events', { count: selectedEvents.length })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!loading && selectedEvents.length === 0 && <p className="py-4 text-sm text-muted-foreground">{t('No events scheduled for this date.')}</p>}
            {selectedEvents.map((event) => (
              <div key={event.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.allDay ? t('All day (during opening hours)') : `${event.startTime}–${event.endTime}`}</p>
                  {event.description && <p className="whitespace-pre-wrap text-sm">{event.description}</p>}
                  <p className="text-xs text-muted-foreground">{event.tableTypes.map((type) => type.name).join(', ')}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" aria-label={t('Edit event')} onClick={() => editEvent(event)}><Pencil /></Button>
                  <ConfirmDialog
                    trigger={<Button size="icon" variant="ghost" className="text-destructive" aria-label={t('Delete event')}><Trash2 /></Button>}
                    title={t('Delete event?')}
                    description={t('This event will be removed from the calendar.')}
                    confirmLabel={t('Delete event')}
                    onConfirm={() => void deleteEvent(event.id)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {t(editingId ? 'Edit event' : 'Add event')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveEvent} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event-title">{t('Title')}</Label>
                <Input id="event-title" value={form.title} maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-date">{t('Date')}</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={form.eventDate}
                  onChange={(event) => {
                    const eventDate = event.target.value
                    setForm({ ...form, eventDate })
                    if (eventDate) {
                      setSelectedDate(eventDate)
                      setMonth(eventDate.slice(0, 7))
                    }
                  }}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-description">{t('Description')}</Label>
              <textarea
                id="event-description"
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.description}
                maxLength={2000}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="flex items-start gap-3">
              <Switch id="event-all-day" checked={form.allDay} onCheckedChange={(allDay) => setForm({ ...form, allDay })} />
              <div className="space-y-1">
                <Label htmlFor="event-all-day">{t('All-day event')}</Label>
                <p className="text-xs text-muted-foreground">{t('All-day events follow venue opening hours.')}</p>
              </div>
            </div>
            {!form.allDay && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="event-start-time">{t('Start time')}</Label>
                  <Input id="event-start-time" type="time" value={form.startTime || ''} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-end-time">{t('End time')}</Label>
                  <Input id="event-end-time" type="time" value={form.endTime || ''} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required />
                </div>
              </div>
            )}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('Affected table types')}</legend>
              {tableTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('Create a table type before scheduling an event.')}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tableTypes.map((type) => (
                    <label key={type.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <input type="checkbox" className="accent-primary" checked={form.tableTypeIds.includes(type.id)} onChange={(event) => toggleType(type.id, event.target.checked)} />
                      {type.name_en}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !form.title.trim() || form.tableTypeIds.length === 0 || (!form.allDay && (!form.startTime || !form.endTime || form.endTime <= form.startTime))}>
                {saving ? t('Saving…') : t(editingId ? 'Save event' : 'Add event')}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyEventForm(selectedDate)) }}>{t('Cancel edit')}</Button>}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
