type Translator = (key: string, vars?: Record<string, string | number>) => string

export function formatWaitTime(minutes: number | null, t: Translator) {
  if (minutes === null) return t('Unavailable')
  if (minutes <= 0) return t('Available now')
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours && remainingMinutes) return t('{hours}h {minutes}m', { hours, minutes: remainingMinutes })
  if (hours) return t('{hours}h', { hours })
  return t('{minutes} min', { minutes })
}
