export interface TableRuleOption {
  id: string
  label: string
  rack: string
  fouls: string
  win: string
  scoring: string
  source: string
  sourceUrl: string
}

const WPA_RULES_URL = 'https://wpapool.com/rules/#rulesofplay'

const AMERICAN_8_BALL: TableRuleOption = {
  id: 'american-8-ball',
  label: '8-Ball',
  rack: 'Rack 15 balls in a triangle: the 8-ball in the center, with one solid and one stripe in the two rear corners.',
  fouls: 'A scratch, wrong first contact, or no rail after contact is a foul; the opponent gets cue-ball-in-hand.',
  win: 'Pocket all balls in your group, then legally pocket the 8-ball in the called pocket.',
  scoring: 'A rack is won by legally pocketing the 8-ball after clearing your group; matches are races to a set rack count.',
  source: 'WPA Rules of Play',
  sourceUrl: WPA_RULES_URL,
}

const AMERICAN_9_BALL: TableRuleOption = {
  id: 'american-9-ball',
  label: '9-Ball',
  rack: 'Rack balls 1–9 in a diamond, with the 1-ball at the apex and the 9-ball in the center.',
  fouls: 'Wrong first contact, a scratch, or no rail after contact is a foul; the opponent gets cue-ball-in-hand.',
  win: 'Pocket the 9-ball on a legal shot; combinations can win before the other balls are cleared.',
  scoring: 'Each rack is one game in the match; the first player to the agreed race length wins.',
  source: 'WPA Rules of Play',
  sourceUrl: WPA_RULES_URL,
}

const RULES_BY_TYPE: Record<string, TableRuleOption[]> = {
  'english-pool': [{
    id: 'english-8-ball',
    label: 'English 8-Ball',
    rack: 'Rack seven reds, seven yellows, and the black; place the black on its spot and the apex ball on the rack-line marker.',
    fouls: 'English pool standard fouls include an in-off, wrong first contact, a push/double hit, or an illegal shot. The opponent gets one visit with cue-ball-in-hand anywhere; some black-ball fouls lose the frame.',
    win: 'Pot all reds or yellows in your group, then pot the black on a separate legal shot. Potting it early or on a foul loses the frame.',
    scoring: 'A frame is won by legally potting the black after clearing your group; matches count frames won.',
    source: 'EPA International Eightball Rules v2d (December 2025)',
    sourceUrl: 'https://www.epa.org.uk/rules/international_2d.php',
  }],
  carom: [{
    id: 'carom-libre',
    label: 'Carom Billiards',
    rack: 'Libre uses three balls: two cue balls and one red object ball, placed on the marked starting positions.',
    fouls: 'No point is scored unless the cue ball contacts both other balls. A ball leaving the table is penalized under FFB rules.',
    win: 'Score caroms to reach the agreed target; the turn passes after a missed carom.',
    scoring: 'Each successful carom scores one point. Libre has no cushion-count requirement.',
    source: 'French Federation of Billiards — Carom, Series Games (Libre)',
    sourceUrl: 'https://www.ffbillard.com/pages/carambole-jeux-de-series-49.html',
  }],
  snooker: [{
    id: 'snooker',
    label: 'Snooker',
    rack: 'Rack 15 reds in a triangle; place the six colours on their spots, with yellow, green, and brown on the baulk line.',
    fouls: 'Wrong first contact, potting the cue ball, or potting a ball not on is a foul; the opponent receives at least four penalty points.',
    win: 'Score more points than your opponent. After the reds are cleared, pot the colours in order.',
    scoring: 'Red 1, yellow 2, green 3, brown 4, blue 5, pink 6, and black 7 points.',
    source: 'WPBSA Rules of Snooker and English Billiards',
    sourceUrl: 'https://www.wpbsa.com/rules/',
  }],
}

export function rulesForTableType(tableTypeName: string): TableRuleOption[] | null {
  const normalized = tableTypeName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  if (normalized.includes('american') || normalized.includes('americaine')) {
    const eightBall = /\b8\b|eight/.test(normalized)
    const nineBall = /\b9\b|nine/.test(normalized)
    if (eightBall && !nineBall) return [AMERICAN_8_BALL]
    if (nineBall && !eightBall) return [AMERICAN_9_BALL]
    return [AMERICAN_8_BALL, AMERICAN_9_BALL]
  }
  if (normalized.includes('snooker')) return RULES_BY_TYPE.snooker
  if (/\b(french|francaise|carom|carambole)\b/.test(normalized)) return RULES_BY_TYPE.carom
  if (normalized === 'pool' || normalized.includes('english pool') || normalized.includes('english 8')) return RULES_BY_TYPE['english-pool']
  return null
}
