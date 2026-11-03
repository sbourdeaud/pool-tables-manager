import * as React from 'react'
import { cn } from '@/lib/utils'

export type TableTypeIconId = 'american' | 'english_pool' | 'snooker' | 'carom' | 'pyramid'

export const TABLE_TYPE_ICON_OPTIONS: { id: TableTypeIconId; label: string }[] = [
  { id: 'american', label: 'American' },
  { id: 'english_pool', label: 'English Pool' },
  { id: 'snooker', label: 'Snooker' },
  { id: 'carom', label: 'Carom' },
  { id: 'pyramid', label: 'Pyramid' },
]

const ICON_IDS = new Set<string>(TABLE_TYPE_ICON_OPTIONS.map((option) => option.id))

export function normalizeTableTypeIcon(icon?: string | null): TableTypeIconId {
  return icon && ICON_IDS.has(icon) ? (icon as TableTypeIconId) : 'american'
}

export function tableTypeIconForName(name?: string | null): TableTypeIconId {
  const value = (name || '').toLowerCase()
  if (value.includes('snooker')) return 'snooker'
  if (value.includes('pyramid')) return 'pyramid'
  if (value.includes('carom') || value.includes('carambole') || value.includes('french') || value.includes('français') || value.includes('francais')) return 'carom'
  if (value.includes('english') || value === 'pool') return 'english_pool'
  return 'american'
}

function Ball({ cx, cy, r, fill, stroke = '#2c241c' }: { cx: number; cy: number; r: number; fill: string; stroke?: string }) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="0.8" />
}

function NumberedBall({ cx, cy, r, number }: { cx: number; cy: number; r: number; number: string }) {
  return (
    <g>
      <Ball cx={cx} cy={cy} r={r} fill="#151515" />
      <circle cx={cx} cy={cy} r={r * 0.52} fill="#f7f3e8" />
      <text x={cx} y={cy + r * 0.2} textAnchor="middle" fontSize={r * 0.72} fontWeight="700" fill="#151515" fontFamily="Arial, sans-serif">
        {number}
      </text>
    </g>
  )
}

function TableBase({ felt, ring }: { felt: string; ring: string }) {
  return (
    <>
      <circle cx="32" cy="32" r="30" fill={ring} />
      <circle cx="32" cy="32" r="25" fill={felt} />
      <ellipse cx="24" cy="21" rx="14" ry="9" fill="#ffffff" opacity="0.08" />
    </>
  )
}

const AmericanIcon = (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
    <TableBase felt="#168849" ring="#6b4423" />
    <NumberedBall cx={23} cy={24} r={8} number="8" />
    <g>
      <circle cx="42" cy="23" r="7.2" fill="#f5c842" stroke="#2c241c" strokeWidth="0.8" />
      <path d="M36.5 22.4c3.4-2.2 7.9-2.1 11.2.5" stroke="#fff7db" strokeWidth="2.2" fill="none" />
      <circle cx="42" cy="23" r="2.7" fill="#fff7db" />
      <text x="42" y="24.2" textAnchor="middle" fontSize="3.2" fontWeight="700" fill="#2c241c" fontFamily="Arial, sans-serif">9</text>
    </g>
    <Ball cx={30} cy={43} r={7.6} fill="#f8f4e9" />
    <circle cx="27.3" cy="40.8" r="1.3" fill="#d7cdb8" opacity="0.8" />
  </svg>
)

const EnglishPoolIcon = (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
    <TableBase felt="#426b8a" ring="#2d4359" />
    <Ball cx={22} cy={20} r={6} fill="#d52b2b" />
    <Ball cx={42} cy={20} r={6} fill="#f2c230" />
    <Ball cx={17} cy={32} r={6} fill="#d52b2b" />
    <NumberedBall cx={32} cy={30} r={6.5} number="8" />
    <Ball cx={27} cy={44} r={6} fill="#f2c230" />
    <Ball cx={45} cy={41} r={5.7} fill="#f8f4e9" />
  </svg>
)

const SnookerIcon = (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
    <TableBase felt="#7d7d38" ring="#8d6a2d" />
    <Ball cx={32} cy={20} r={3.1} fill="#f2c230" />
    <Ball cx={24} cy={23.5} r={2.9} fill="#1d7a3a" />
    <Ball cx={40} cy={23.5} r={2.9} fill="#7a4a24" />
    <Ball cx={32} cy={26.5} r={2.9} fill="#2463b6" />
    {[0, 1, 2, 3, 4].flatMap((row) =>
      Array.from({ length: row + 1 }, (_, col) => {
        const y = 31 + row * 4.7
        const x = 32 + (col - row / 2) * 5.1
        return <Ball key={`${row}-${col}`} cx={x} cy={y} r={2.35} fill="#c92727" />
      }),
    )}
    <Ball cx={32} cy={55.5} r={2.2} fill="#f8f4e9" />
  </svg>
)

const CaromIcon = (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
    <TableBase felt="#1550a3" ring="#1d3d77" />
    <Ball cx={24} cy={27} r={8} fill="#dc2828" />
    <Ball cx={43} cy={27} r={8} fill="#f4bd24" />
    <Ball cx={33} cy={45} r={7.7} fill="#f8f4e9" />
    <circle cx="30.8" cy="43" r="1.2" fill="#d8cdb7" />
    <circle cx="35.2" cy="47" r="1.1" fill="#d8cdb7" />
  </svg>
)

const PyramidIcon = (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="h-full w-full">
    <TableBase felt="#147a3e" ring="#6b4423" />
    {[0, 1, 2, 3, 4].flatMap((row) =>
      Array.from({ length: row + 1 }, (_, col) => {
        const y = 19 + row * 4.9
        const x = 32 + (col - row / 2) * 5.3
        return <Ball key={`${row}-${col}`} cx={x} cy={y} r={2.5} fill="#f7f1dc" />
      }),
    )}
    <Ball cx={32} cy={47} r={5.8} fill="#a11624" />
  </svg>
)

const ICONS: Record<TableTypeIconId, React.ReactNode> = {
  american: AmericanIcon,
  english_pool: EnglishPoolIcon,
  snooker: SnookerIcon,
  carom: CaromIcon,
  pyramid: PyramidIcon,
}

export function TableTypeIcon({ icon, className }: { icon?: string | null; className?: string }) {
  return <span className={cn('inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full', className)}>{ICONS[normalizeTableTypeIcon(icon)]}</span>
}

export function TableIconPicker({
  value,
  onChange,
  disabled,
  getLabel,
}: {
  value?: string | null
  onChange: (icon: TableTypeIconId) => void
  disabled?: boolean
  getLabel?: (label: string) => string
}) {
  const selected = normalizeTableTypeIcon(value)
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {TABLE_TYPE_ICON_OPTIONS.map((option) => {
        const active = option.id === selected
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex min-w-[96px] flex-col items-center gap-1.5 rounded-lg border bg-card p-2 text-xs font-semibold transition-colors',
              active ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'hover:bg-accent disabled:opacity-50',
            )}
          >
            <TableTypeIcon icon={option.id} className="h-9 w-9" />
            <span>{getLabel ? getLabel(option.label) : option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
