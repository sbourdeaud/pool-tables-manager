// Only stable releases may advance latest, and an older release may never roll it back.
const stable = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

export function shouldUpdateLatest(tag, requested, current = '') {
  if (!requested || !stable.test(tag)) return false
  if (!current) return true
  if (!stable.test(current)) throw new Error(`Cannot compare existing latest version: ${current}`)
  const candidate = tag.slice(1).split('.').map(BigInt)
  const previous = current.slice(1).split('.').map(BigInt)
  for (let i = 0; i < candidate.length; i++) {
    if (candidate[i] !== previous[i]) return candidate[i] > previous[i]
  }
  return true // Allow retrying publication of the same release.
}
