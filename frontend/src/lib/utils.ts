import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function tableBackgroundFileError(file: Pick<File, 'type' | 'size'>): 'type' | 'size' | 'empty' | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'type'
  if (file.size > 5 * 1024 * 1024) return 'size'
  if (file.size === 0) return 'empty'
  return null
}

export function tableBackgroundUrl(background?: string | null): string | null {
  const presets: Record<string, string> = { 'preset-1': 'flag-us.jpg', 'preset-2': 'flag-uk.jpg', 'preset-3': 'flag-eu.jpg', 'preset-4': 'flag-fr.jpg' }
  if (background && Object.prototype.hasOwnProperty.call(presets, background)) return `/table-backgrounds/${presets[background]}`
  const match = /^upload:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(background || '')
  return match ? `/api/table-background-images/${match[1]}` : null
}

export function tableBackgroundStyle(background: string | null | undefined, opacity: number | null | undefined, occupied: boolean) {
  const url = tableBackgroundUrl(background)
  const alpha = typeof opacity === 'number' && Number.isFinite(opacity) ? Math.max(0, Math.min(100, opacity)) / 100 : 0.7
  const [top, bottom] = occupied ? ['153, 27, 27', '69, 10, 10'] : ['4, 120, 87', '2, 44, 34']
  return url ? {
    backgroundColor: '#111827',
    backgroundImage: `linear-gradient(to bottom, rgba(${top}, ${alpha * 0.65}), rgba(${bottom}, ${alpha})), url("${url}")`,
    textShadow: '0 1px 3px #000, 0 0 6px #000, 0 0 10px #000',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : undefined
}
