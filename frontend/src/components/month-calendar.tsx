import { cn } from '@/lib/utils'
import { calendarMonthDates } from '@/lib/venue-calendar'

export function MonthCalendar({
  month,
  selectedDate,
  eventCounts,
  language,
  onSelect,
}: {
  month: string
  selectedDate: string
  eventCounts: Record<string, number>
  language: string
  onSelect: (date: string) => void
}) {
  const dates = calendarMonthDates(month)
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const monday = new Date(2024, 0, 1 + index)
    return monday.toLocaleDateString(language, { weekday: 'short' })
  })

  return (
    <div className="space-y-2" aria-label="Calendar">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {weekdayLabels.map((label, index) => <div key={index} className="py-1">{label}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const count = eventCounts[date] || 0
          const isSelected = date === selectedDate
          const isInMonth = date.startsWith(`${month}-`)
          return (
            <button
              key={date}
              type="button"
              aria-label={date}
              aria-pressed={isSelected}
              onClick={() => onSelect(date)}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-sm transition-colors hover:bg-accent',
                isSelected && 'border-primary bg-accent text-accent-foreground',
                !isInMonth && 'text-muted-foreground/60',
              )}
            >
              <span>{Number(date.slice(-2))}</span>
              {count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label={`${count} events`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
