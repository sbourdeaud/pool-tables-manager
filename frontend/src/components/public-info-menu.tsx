import * as React from 'react'
import { Menu as MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MonthCalendar } from '@/components/month-calendar'
import { apiDrinks, apiPublicVenueEvents, type Drink, type SettingsMap, type VenueEvent } from '@/lib/api'
import { groupDrinks } from '@/lib/menu'
import { money } from '@/lib/format'
import { calendarDateValue, calendarMonthValue, formatCalendarDate } from '@/lib/venue-calendar'
import { localizedWeekday, parseWeeklyOpeningHours } from '@/lib/opening-hours'
import { useI18n } from '@/lib/i18n'

export function PublicInfoMenu({ settings, settingsLoading, settingsError }: { settings: SettingsMap | null; settingsLoading: boolean; settingsError: boolean }) {
  const { language, t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [tab, setTab] = React.useState<'hours' | 'drinks' | 'events'>('hours')
  const [drinks, setDrinks] = React.useState<Drink[]>([])
  const [drinksLoading, setDrinksLoading] = React.useState(false)
  const [drinksError, setDrinksError] = React.useState(false)
  const [calendarMonth, setCalendarMonth] = React.useState(calendarMonthValue())
  const [selectedDate, setSelectedDate] = React.useState(calendarDateValue(new Date()))
  const [events, setEvents] = React.useState<VenueEvent[]>([])
  const [eventsLoading, setEventsLoading] = React.useState(false)
  const [eventsError, setEventsError] = React.useState(false)

  React.useEffect(() => {
    if (!open || tab !== 'drinks') return
    let active = true
    setDrinksLoading(true)
    setDrinksError(false)
    void apiDrinks(language)
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) setDrinks(result.data)
        else setDrinksError(true)
      })
      .finally(() => {
        if (active) setDrinksLoading(false)
      })
    return () => { active = false }
  }, [language, open, tab])

  React.useEffect(() => {
    if (!open || tab !== 'events') return
    let active = true
    setEventsLoading(true)
    setEventsError(false)
    void apiPublicVenueEvents(calendarMonth, language)
      .then((result) => {
        if (!active) return
        if (result.ok && result.data) setEvents(result.data)
        else setEventsError(true)
      })
      .finally(() => {
        if (active) setEventsLoading(false)
      })
    return () => { active = false }
  }, [calendarMonth, language, open, tab])

  const eventCounts = React.useMemo(() => events.reduce<Record<string, number>>((counts, event) => {
    counts[event.eventDate] = (counts[event.eventDate] || 0) + 1
    return counts
  }, {}), [events])
  const selectedEvents = React.useMemo(() => events.filter((event) => event.eventDate === selectedDate), [events, selectedDate])
  const hours = parseWeeklyOpeningHours(settings?.venue_opening_hours)
  const venueAddress = settings?.venue_address?.trim()
  const venuePhone = settings?.venue_phone?.trim()
  const groups = React.useMemo(() => groupDrinks(drinks), [drinks])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MenuIcon className="h-4 w-4" /> {t('Menu')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Menu')}</DialogTitle>
          <DialogDescription>{t('Public venue information and available drinks.')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as 'hours' | 'drinks' | 'events')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="hours">{t('Opening Hours')}</TabsTrigger>
              <TabsTrigger value="drinks">{t('Drinks Menu')}</TabsTrigger>
              <TabsTrigger value="events">{t('Events')}</TabsTrigger>
            </TabsList>
            <TabsContent value="hours" className="pt-4">
              {settingsLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('Loading…')}</p>
              ) : settingsError ? (
                <p className="py-4 text-center text-sm text-destructive">{t('Unable to load opening hours.')}</p>
              ) : (
                <div className="space-y-4">
                  {(venueAddress || venuePhone) && (
                    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                      {venueAddress && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{t('Venue address')}</p>
                          <p className="text-sm">{venueAddress}</p>
                        </div>
                      )}
                      {venuePhone && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">{t('Phone number')}</p>
                          <a className="text-sm underline underline-offset-4" href={`tel:${encodeURIComponent(venuePhone)}`}>{venuePhone}</a>
                        </div>
                      )}
                    </div>
                  )}
                  {hours ? (
                    <div className="space-y-2">
                      {hours.map((day, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 border-b pb-2 last:border-0">
                          <span className="font-medium">{localizedWeekday(index, language)}</span>
                          <span className={day.isOpen ? 'tabular-nums' : 'text-muted-foreground'}>
                            {day.isOpen ? `${day.opensAt} – ${day.closesAt}` : t('Closed')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">{t('Opening hours are not configured.')}</p>
                  )}
                </div>
              )}
            </TabsContent>
            <TabsContent value="drinks" className="pt-4">
              {drinksLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('Loading…')}</p>
              ) : drinksError ? (
                <p className="py-4 text-center text-sm text-destructive">{t('Unable to load drinks.')}</p>
              ) : groups.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('No drinks configured.')}</p>
              ) : (
                <div className="space-y-5">
                  {groups.map((group) => {
                    const Icon = group.icon
                    return (
                      <section key={group.value} className="space-y-2">
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4" /> {t(group.label)}
                        </h3>
                        <div className="space-y-2">
                          {group.drinks.map((drink) => (
                            <div key={drink.id} className="flex items-center justify-between gap-4 rounded-md bg-muted/40 px-3 py-2 text-sm">
                              <span>{drink.name}</span>
                              <span className="shrink-0 font-medium tabular-nums">{money(drink.price_cents, settings?.currency || '$')}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
            </TabsContent>
            <TabsContent value="events" className="space-y-3 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="public-events-month">{t('Month')}</Label>
                <Input
                  id="public-events-month"
                  type="month"
                  value={calendarMonth}
                  onChange={(event) => {
                    const month = event.target.value
                    if (month.length !== 7 || month[4] !== '-') return
                    setCalendarMonth(month)
                    setSelectedDate(`${month}-01`)
                  }}
                />
              </div>
              <MonthCalendar
                month={calendarMonth}
                selectedDate={selectedDate}
                eventCounts={eventCounts}
                language={language}
                onSelect={(date) => {
                  setCalendarMonth(date.slice(0, 7))
                  setSelectedDate(date)
                }}
              />
              {eventsLoading ? (
                <p className="py-3 text-center text-sm text-muted-foreground">{t('Loading events…')}</p>
              ) : eventsError ? (
                <p className="py-3 text-center text-sm text-destructive">{t('Unable to load events.')}</p>
              ) : selectedEvents.length === 0 ? (
                <p className="py-3 text-center text-sm text-muted-foreground">{t('No events scheduled for this date.')}</p>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">{formatCalendarDate(selectedDate, language)}</h3>
                  {selectedEvents.map((event) => (
                    <article key={event.id} className="space-y-1 rounded-lg border bg-muted/20 p-3">
                      <h4 className="text-sm font-semibold">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">{event.allDay ? t('All day (during opening hours)') : `${event.startTime}–${event.endTime}`}</p>
                      {event.description && <p className="whitespace-pre-wrap text-sm">{event.description}</p>}
                      <p className="text-xs text-muted-foreground">{event.tableTypes.map((type) => type.name).join(', ')}</p>
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
