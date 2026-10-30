import { Coffee, CircleEllipsis, Snowflake, Wine, type LucideIcon } from 'lucide-react'
import type { Drink } from '@/lib/api'

export type DrinkCategory = 'cold' | 'warm' | 'alcoholic' | 'other'

export const DRINK_CATEGORIES: { value: DrinkCategory; label: string; short: string; icon: LucideIcon }[] = [
  { value: 'cold', label: 'Cold drinks', short: 'Cold', icon: Snowflake },
  { value: 'warm', label: 'Hot drinks', short: 'Hot', icon: Coffee },
  { value: 'alcoholic', label: 'Alcoholic drinks', short: 'Alcoholic', icon: Wine },
  { value: 'other', label: 'Other', short: 'Other', icon: CircleEllipsis },
]

export function normalizeCategory(value?: string | null): DrinkCategory {
  return DRINK_CATEGORIES.some((c) => c.value === value) ? (value as DrinkCategory) : 'other'
}

export function categoryLabel(value?: string | null): string {
  const category = DRINK_CATEGORIES.find((c) => c.value === normalizeCategory(value))
  return category ? category.label : 'Other'
}

/** Group a drink list into ordered category buckets (empty buckets omitted). */
export function groupDrinks(drinks: Drink[]) {
  return DRINK_CATEGORIES.map((category) => ({
    ...category,
    drinks: drinks.filter((d) => normalizeCategory(d.category) === category.value),
  })).filter((group) => group.drinks.length > 0)
}
