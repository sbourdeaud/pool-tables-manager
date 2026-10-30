export function money(cents: number | null | undefined, currency: string): string {
  return currency + ((cents ?? 0) / 100).toFixed(2)
}

/** Elapsed duration from an ISO start timestamp, formatted H:MM:SS. */
export function elapsedDuration(startedAt?: string | null, now = Date.now()): string {
  if (!startedAt) return '0:00:00'
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return '0:00:00'
  return formatSeconds(Math.max(0, Math.floor((now - start) / 1000)))
}

export function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Hours charged for table time (rounded up), as used by the legacy UI. */
export function chargedHours(startedAt?: string | null, now = Date.now()): number {
  if (!startedAt) return 1
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return 1
  return Math.max(1, Math.ceil((now - start) / 3600000))
}

export function minutesAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  return mins === 0 ? 'just now' : mins + ' min ago'
}
