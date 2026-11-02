const NEAR_HOUR_BOUNDARY_MINUTES = 15
const DEFAULT_SESSION_MINUTES = 60
const MAX_SESSION_HISTORY_MINUTES = 24 * 60

function milliseconds(value) {
  const result = new Date(value).getTime()
  return Number.isFinite(result) ? result : null
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function averageSessionMinutesByType(tables, history) {
  const typeByTableId = new Map(tables.map((table) => [table.id, table.tableTypeId]))
  const durationsByType = new Map()

  for (const session of history) {
    const tableTypeId = typeByTableId.get(session.tableId)
    const startedAt = milliseconds(session.startedAt)
    const endedAt = milliseconds(session.endedAt)
    if (!tableTypeId || startedAt === null || endedAt === null) continue
    const duration = (endedAt - startedAt) / 60000
    if (duration <= 0 || duration > MAX_SESSION_HISTORY_MINUTES) continue
    const durations = durationsByType.get(tableTypeId) || []
    durations.push(duration)
    durationsByType.set(tableTypeId, durations)
  }

  return new Map([...durationsByType].map(([typeId, durations]) => [typeId, mean(durations)]))
}

function activeTableEtaMinutes(session, averageSessionMinutes, nowMs) {
  const startedAt = milliseconds(session.startedAt)
  if (startedAt === null) return DEFAULT_SESSION_MINUTES
  const elapsed = Math.max(0, (nowMs - startedAt) / 60000)
  const minutesToHour = 60 - (elapsed % 60)
  if (minutesToHour <= NEAR_HOUR_BOUNDARY_MINUTES) return minutesToHour
  if (averageSessionMinutes !== null && averageSessionMinutes > elapsed) return averageSessionMinutes - elapsed
  return minutesToHour
}

function estimateWaitlistEntries({ entries, tables, activeSessions, sessionHistory, now = new Date() }) {
  const nowMs = milliseconds(now) ?? Date.now()
  const averageDurations = averageSessionMinutesByType(tables, sessionHistory)
  const activeByTable = new Map(activeSessions.map((session) => [session.tableId, session]))
  const entriesByType = new Map()

  for (const entry of entries) {
    const queue = entriesByType.get(entry.tableTypeId) || []
    queue.push(entry)
    entriesByType.set(entry.tableTypeId, queue)
  }

  const estimates = []
  for (const [tableTypeId, queue] of entriesByType) {
    const averageDuration = averageDurations.get(tableTypeId) ?? null
    const slots = tables
      .filter((table) => table.tableTypeId === tableTypeId && table.status !== 'maintenance')
      .map((table) => {
        const activeSession = activeByTable.get(table.id)
        if (activeSession) return activeTableEtaMinutes(activeSession, averageDuration, nowMs)
        if (table.status === 'occupied') return averageDuration ?? DEFAULT_SESSION_MINUTES
        return 0
      })
      .sort((a, b) => a - b)

    queue.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    queue.forEach((entry, index) => {
      const createdAt = milliseconds(entry.createdAt)
      const expectedWaitMinutes = slots.length ? Math.max(0, Math.ceil(slots[0])) : null
      estimates.push({
        ...entry,
        position: index + 1,
        elapsedMinutes: createdAt === null ? 0 : Math.max(0, Math.floor((nowMs - createdAt) / 60000)),
        expectedWaitMinutes,
      })
      if (slots.length) {
        const nextStart = slots.shift()
        slots.push(nextStart + Math.max(1, averageDuration ?? DEFAULT_SESSION_MINUTES))
        slots.sort((a, b) => a - b)
      }
    })
  }

  estimates.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  const availableEstimates = estimates.filter((entry) => entry.expectedWaitMinutes !== null)
  return {
    entries: estimates,
    queueDepth: estimates.length,
    averageWaitMinutes: availableEstimates.length
      ? Math.round(availableEstimates.reduce((sum, entry) => sum + entry.expectedWaitMinutes, 0) / availableEstimates.length)
      : null,
  }
}

module.exports = { estimateWaitlistEntries }
