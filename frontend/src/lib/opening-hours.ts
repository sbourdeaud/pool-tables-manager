export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export interface OpeningHoursDay {
  isOpen: boolean
  opensAt: string
  closesAt: string
}

export type WeeklyOpeningHours = OpeningHoursDay[]

const VALID_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export function defaultWeeklyOpeningHours(): WeeklyOpeningHours {
  return WEEKDAYS.map(() => ({ isOpen: false, opensAt: '09:00', closesAt: '17:00' }))
}

export function parseWeeklyOpeningHours(value?: string): WeeklyOpeningHours | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || parsed.length !== WEEKDAYS.length) return null
    const days = parsed.map((item) => {
      if (!item || typeof item !== 'object') return null
      const day = item as Record<string, unknown>
      if (typeof day.isOpen !== 'boolean' || typeof day.opensAt !== 'string' || typeof day.closesAt !== 'string') return null
      if (!VALID_TIME.test(day.opensAt) || !VALID_TIME.test(day.closesAt)) return null
      return { isOpen: day.isOpen, opensAt: day.opensAt, closesAt: day.closesAt }
    })
    return days.every((day) => day !== null) ? days as WeeklyOpeningHours : null
  } catch {
    return null
  }
}

export function localizedWeekday(index: number, language: string) {
  const date = new Date(Date.UTC(2024, 0, index + 1))
  return new Intl.DateTimeFormat(language, { weekday: 'long', timeZone: 'UTC' }).format(date)
}
