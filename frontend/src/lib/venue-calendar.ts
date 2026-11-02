export function calendarDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function calendarMonthValue(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function calendarMonthDates(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const firstOfMonth = new Date(year, monthNumber - 1, 1)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => calendarDateValue(new Date(year, monthNumber - 1, 1 - mondayOffset + index)))
}

export function formatCalendarDate(value: string, language: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(language, options)
}
