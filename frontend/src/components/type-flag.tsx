import * as React from 'react'

// Flag icons for well-known table types, ported verbatim from the classic UI.
// Matching is by exact type name (same rule the classic app used).
const FLAGS: Record<string, React.ReactNode> = {
  American: (
    <svg width="24" height="16" viewBox="0 0 30 20" aria-hidden="true" className="shrink-0 rounded-[2px]">
      <rect width="30" height="20" fill="#B22234" />
      <rect y="1.54" width="30" height="1.54" fill="white" />
      <rect y="4.62" width="30" height="1.54" fill="white" />
      <rect y="7.69" width="30" height="1.54" fill="white" />
      <rect y="10.77" width="30" height="1.54" fill="white" />
      <rect y="13.85" width="30" height="1.54" fill="white" />
      <rect y="16.92" width="30" height="1.54" fill="white" />
      <rect width="12" height="10.77" fill="#3C3B6E" />
    </svg>
  ),
  Pool: (
    <svg width="24" height="16" viewBox="0 0 30 20" aria-hidden="true" className="shrink-0 rounded-[2px]">
      <rect width="30" height="20" fill="#003399" />
      <g transform="translate(15,10)">
        {[
          [0, -3.33], [2.31, -2.39], [2.85, -0.19], [1.76, 2.08], [-0.54, 3.27], [-2.77, 2.39],
          [-3.68, 0.19], [-2.59, -2.08], [-0.29, -3.27], [2.08, -2.59], [3.27, -0.54], [2.39, 2.77],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="0.77" fill="#FFCC00" />
        ))}
      </g>
    </svg>
  ),
  Snooker: (
    <svg width="24" height="16" viewBox="0 0 30 20" aria-hidden="true" className="shrink-0 rounded-[2px]">
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0 L30 20 M0 20 L30 0" stroke="white" strokeWidth="2.5" />
      <path d="M0 0 L30 20 M0 20 L30 0" stroke="#C8102E" strokeWidth="1.5" />
      <path d="M15 0 L15 20 M0 10 L30 10" stroke="white" strokeWidth="4" />
      <path d="M15 0 L15 20 M0 10 L30 10" stroke="#C8102E" strokeWidth="2.4" />
    </svg>
  ),
  French: (
    <svg width="24" height="16" viewBox="0 0 30 20" aria-hidden="true" className="shrink-0 rounded-[2px]">
      <rect width="10" height="20" fill="#002395" />
      <rect x="10" width="10" height="20" fill="white" />
      <rect x="20" width="10" height="20" fill="#ED2939" />
    </svg>
  ),
}

export function typeFlag(name?: string | null): React.ReactNode | null {
  if (!name) return null
  return FLAGS[name] || null
}
