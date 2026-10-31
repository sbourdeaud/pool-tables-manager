import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Beer, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiCreateDrink, apiDeleteDrink, apiDrinks, apiUpdateDrink, type Drink } from '@/lib/api'
import { money } from '@/lib/format'
import { DRINK_CATEGORIES, categoryLabel } from '@/lib/menu'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'

const VAT_OPTIONS = [
  { value: '20', label: '20% (standard)' },
  { value: '10', label: '10% (consommation sur place)' },
  { value: '0', label: '0% (exempt)' },
]

export function DrinksPage() {
  const { settings } = useSettings()
  const { toast } = useToast()
  const { t } = useI18n()
  const currency = settings.currency || '$'
  const [drinks, setDrinks] = React.useState<Drink[]>([])
  const [loading, setLoading] = React.useState(true)
  const [name, setName] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [vat, setVat] = React.useState('20')
  const [category, setCategory] = React.useState('')
  const [editing, setEditing] = React.useState<{ id: string; name: string; price: string; vat: string; category: string } | null>(null)

  const load = React.useCallback(async () => {
    const result = await apiDrinks(localStorage.getItem('lang') || 'en')
    setDrinks(result.data || [])
    setLoading(false)
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const result = await apiCreateDrink({
      name_en: name.trim(),
      price_cents: Math.round(parseFloat(price || '0') * 100),
      vatRatePercent: parseInt(vat, 10),
      category: category || null,
    })
    if (!result.ok) return toast({ title: t('Failed to add drink'), variant: 'error' })
    toast({ title: t('Drink added') })
    setName('')
    setPrice('')
    setVat('20')
    setCategory('')
    await load()
  }

  const saveEdit = async () => {
    if (!editing) return
    const result = await apiUpdateDrink(editing.id, {
      name_en: editing.name.trim(),
      price_cents: Math.round(parseFloat(editing.price || '0') * 100),
      vatRatePercent: parseInt(editing.vat, 10),
      category: editing.category || null,
    })
    if (!result.ok) return toast({ title: t('Failed to update drink'), variant: 'error' })
    toast({ title: t('Drink updated') })
    setEditing(null)
    await load()
  }

  const remove = async (id: string) => {
    const result = await apiDeleteDrink(id)
    if (!result.ok) return toast({ title: t('Failed to delete drink'), variant: 'error' })
    toast({ title: t('Drink deleted') })
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Admin')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('Drinks Menu')}</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Beer className="h-4 w-4" /> {t('Add drink')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 sm:grid-cols-[1fr_120px_170px_170px_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="drink-name">{t('Drink name')}</Label>
              <Input id="drink-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Beer')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drink-price">{t('Price ({currency})', { currency })}</Label>
              <Input id="drink-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="6.00" required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('VAT')}</Label>
              <Select value={vat} onValueChange={setVat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {t(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('Category')}</Label>
              <Select value={category || 'none'} onValueChange={(v) => setCategory(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('No category')}</SelectItem>
                  {DRINK_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {t(c.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">
              <Plus /> {t('Add Drink')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('Menu')}</CardTitle>
          <CardDescription>{loading ? t('Loading…') : drinks.length === 1 ? t('{count} drink', { count: drinks.length }) : t('{count} drinks', { count: drinks.length })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {drinks.map((d) =>
            editing?.id === d.id ? (
              <div key={d.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_110px_160px_160px_auto] sm:items-center">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <Input type="number" min="0" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                <Select value={editing.vat} onValueChange={(value) => setEditing({ ...editing, vat: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {t(o.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editing.category || 'none'} onValueChange={(value) => setEditing({ ...editing, category: value === 'none' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('No category')}</SelectItem>
                    {DRINK_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {t(c.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void saveEdit()}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {money(d.price_cents, currency)} — {t('VAT {rate}%', { rate: d.vatRatePercent ?? 20 })} ·{' '}
                    <span className="font-medium text-foreground/80">{t(categoryLabel(d.category))}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t('Edit')}
                    onClick={() => setEditing({ id: d.id, name: d.name, price: (d.price_cents / 100).toFixed(2), vat: String(d.vatRatePercent ?? 20), category: d.category || '' })}
                  >
                    <Pencil />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={t('Delete')}>
                        <Trash2 />
                      </Button>
                    }
                    title={t('Delete drink?')}
                    description={t('“{name}” will be removed from the menu. Existing tab items are unaffected.', { name: d.name })}
                    confirmLabel={t('Delete drink')}
                    onConfirm={() => void remove(d.id)}
                  />
                </div>
              </div>
            ),
          )}
        </CardContent>
      </Card>
    </div>
  )
}
