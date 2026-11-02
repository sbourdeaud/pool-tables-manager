type Translate = (key: string, vars?: Record<string, string | number>) => string

export function lookingForPlayersLabel(count: number, upTo: boolean, t: Translate): string {
  if (count === 1) return t(upTo ? 'Looking for up to {count} player' : 'Looking for {count} player', { count })
  return t(upTo ? 'Looking for up to {count} players' : 'Looking for {count} players', { count })
}
