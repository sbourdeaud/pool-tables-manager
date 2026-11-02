import * as React from 'react'
import { Clock3 } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { useSettings } from '@/components/settings/settings-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/lib/i18n'
import { defaultWeeklyOpeningHours, localizedWeekday, parseWeeklyOpeningHours, WEEKDAYS, type WeeklyOpeningHours } from '@/lib/opening-hours'

export function OpeningHoursSection({ className }: { className?: string }) {
  const { settings, save } = useSettings()
  const { language, t } = useI18n()
  const rawHours = settings.venue_opening_hours
  const [schedule, setSchedule] = React.useState<WeeklyOpeningHours>(() => parseWeeklyOpeningHours(rawHours) || defaultWeeklyOpeningHours())
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setSchedule(parseWeeklyOpeningHours(rawHours) || defaultWeeklyOpeningHours())
  }, [rawHours])

  const valid = schedule.every((day) => !day.isOpen || (day.opensAt !== day.closesAt && Boolean(day.opensAt) && Boolean(day.closesAt)))

  const updateDay = (index: number, update: Partial<WeeklyOpeningHours[number]>) => {
    setSchedule((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, ...update } : day))
  }

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    await save('venue_opening_hours', JSON.stringify(schedule))
    setSaving(false)
  }

  return (
    <SectionCard
      className={className}
      icon={Clock3}
      title={t('Opening Hours')}
      description={t('Set one opening and closing time range for each day of the week.')}
    >
      <div className="space-y-2">
        {schedule.map((day, index) => {
          const weekday = localizedWeekday(index, language)
          const switchId = `opening-hours-${WEEKDAYS[index].toLowerCase()}`
          return (
            <div key={WEEKDAYS[index]} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <Label className="w-28" htmlFor={switchId}>{weekday}</Label>
                <Switch id={switchId} checked={day.isOpen} onCheckedChange={(isOpen) => updateDay(index, { isOpen })} />
                <span className="w-16 text-xs text-muted-foreground">{t(day.isOpen ? 'Open' : 'Closed')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`${weekday} ${t('Opening time')}`}
                  className="w-28"
                  type="time"
                  value={day.opensAt}
                  disabled={!day.isOpen}
                  onChange={(event) => updateDay(index, { opensAt: event.target.value })}
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  aria-label={`${weekday} ${t('Closing time')}`}
                  className="w-28"
                  type="time"
                  value={day.closesAt}
                  disabled={!day.isOpen}
                  onChange={(event) => updateDay(index, { closesAt: event.target.value })}
                />
              </div>
            </div>
          )
        })}
      </div>
      {!valid && <p className="text-xs text-destructive">{t('Opening and closing times must be different.')}</p>}
      <Button type="button" onClick={() => void handleSave()} disabled={saving || !valid}>
        {saving ? t('Saving…') : t('Save')}
      </Button>
    </SectionCard>
  )
}
