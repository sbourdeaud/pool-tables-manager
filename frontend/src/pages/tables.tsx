import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Check, CircleDot, Pencil, Play, Plus, Trash2, Wrench, X } from 'lucide-react'
import {
  apiAddTables,
  apiCreateTableType,
  apiDeleteTable,
  apiDeleteTableType,
  apiSetTableStatus,
  apiStartSession,
  apiTableTypes,
  apiTables,
  apiUpdateTableNumber,
  apiUpdateTableType,
  type TableRow,
  type TableType,
} from '@/lib/api'
import { money } from '@/lib/format'
import { playPoolBallSound } from '@/lib/audio'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface TypeForm {
  name: string
  hourly: string
  vat: string
  maxHours: string
}

const EMPTY_FORM: TypeForm = { name: '', hourly: '', vat: '20', maxHours: '' }

export function TablesPage() {
  const { settings, save: saveSetting } = useSettings()
  const { toast } = useToast()
  const { t } = useI18n()
  const currency = settings.currency || '$'
  const [types, setTypes] = React.useState<TableType[]>([])
  const [tables, setTables] = React.useState<TableRow[]>([])
  const [form, setForm] = React.useState<TypeForm>(EMPTY_FORM)
  const [editing, setEditing] = React.useState<{ id: string; form: TypeForm } | null>(null)
  const [quantities, setQuantities] = React.useState<Record<string, number>>({})
  const [editingNumber, setEditingNumber] = React.useState<{ id: string; value: string } | null>(null)

  const load = React.useCallback(async () => {
    const [typesRes, tablesRes] = await Promise.all([apiTableTypes(), apiTables()])
    setTypes(typesRes.data || [])
    setTables(tablesRes.data || [])
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const typeOrder = React.useMemo<string[]>(() => {
    try {
      const value = JSON.parse(settings.table_type_order || '[]')
      return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }, [settings.table_type_order])

  const orderedTypes = React.useMemo(() => {
    const rank = (name: string) => {
      const index = typeOrder.indexOf(name)
      return index === -1 ? Number.MAX_SAFE_INTEGER : index
    }
    return types.slice().sort((a, b) => rank(a.name_en) - rank(b.name_en))
  }, [types, typeOrder])

  const moveType = (name: string, direction: -1 | 1) => {
    const names = orderedTypes.map((t) => t.name_en)
    const index = names.indexOf(name)
    const target = index + direction
    if (index === -1 || target < 0 || target >= names.length) return
    const next = names.slice()
    next.splice(target, 0, next.splice(index, 1)[0])
    const allNames = types.map((t) => t.name_en)
    const merged = [...next, ...allNames.filter((n) => !next.includes(n))]
    void saveSetting('table_type_order', JSON.stringify(merged))
  }

  const createType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const result = await apiCreateTableType({
      name_en: form.name.trim(),
      base_hourly_cents: Math.round(parseFloat(form.hourly || '0') * 100),
      vatRatePercent: parseInt(form.vat, 10),
      maxUsedHours: form.maxHours ? parseInt(form.maxHours, 10) : null,
    })
    if (!result.ok) return toast({ title: t('Failed to add table type'), variant: 'error' })
    toast({ title: t('Table type added') })
    setForm(EMPTY_FORM)
    await load()
  }

  const saveType = async () => {
    if (!editing) return
    const result = await apiUpdateTableType(editing.id, {
      name_en: editing.form.name.trim(),
      base_hourly_cents: Math.round(parseFloat(editing.form.hourly || '0') * 100),
      vatRatePercent: parseInt(editing.form.vat, 10),
      maxUsedHours: editing.form.maxHours ? parseInt(editing.form.maxHours, 10) : null,
    })
    if (!result.ok) return toast({ title: t('Failed to update table type'), variant: 'error' })
    toast({ title: t('Table type updated') })
    setEditing(null)
    await load()
  }

  const removeType = async (id: string) => {
    const result = await apiDeleteTableType(id)
    if (!result.ok) {
      return toast({ title: t('Cannot delete table type'), description: result.status === 409 ? t('Tables exist for this type.') : result.error, variant: 'error' })
    }
    toast({ title: t('Table type deleted') })
    await load()
  }

  const addTables = async (typeId: string) => {
    const quantity = quantities[typeId] || 1
    const result = await apiAddTables(typeId, quantity)
    if (!result.ok) return toast({ title: t('Failed to add tables'), variant: 'error' })
    toast({ title: quantity === 1 ? t('{count} table added', { count: quantity }) : t('{count} tables added', { count: quantity }) })
    setQuantities((q) => ({ ...q, [typeId]: 1 }))
    await load()
  }

  const saveTableNumber = async (id: string) => {
    if (!editingNumber) return
    const next = parseInt(editingNumber.value, 10)
    if (!Number.isFinite(next) || next < 1) {
      return toast({ title: t('Enter a valid table number (1 or more)'), variant: 'error' })
    }
    const result = await apiUpdateTableNumber(id, next)
    if (!result.ok) {
      return toast({
        title: result.status === 409 ? t('Number already in use') : t('Failed to update table number'),
        description: result.status === 409 ? t('Another table already has this number.') : result.error,
        variant: 'error',
      })
    }
    setEditingNumber(null)
    toast({ title: t('Table renumbered to #{number}', { number: next }) })
    await load()
  }

  const quickStart = async (table: TableRow) => {
    const result = await apiStartSession(table.id, 1, 0)
    if (!result.ok) return toast({ title: t('Failed to start session'), variant: 'error' })
    playPoolBallSound()
    toast({ title: t('Session started on table #{number}', { number: table.number }) })
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Admin')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('Table Types & Inventory')}</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> {t('Add table type')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createType} className="grid gap-4 sm:grid-cols-[1fr_150px_150px_120px_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">{t('Name')}</Label>
              <Input id="type-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('American')} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-hourly">{t('Hourly rate ({currency})', { currency })}</Label>
              <Input id="type-hourly" type="number" min="0" step="0.01" value={form.hourly} onChange={(e) => setForm({ ...form, hourly: e.target.value })} placeholder="12.00" required />
            </div>
            <div className="space-y-1.5">
              <Label>{t('VAT')}</Label>
              <Select value={form.vat} onValueChange={(vat) => setForm({ ...form, vat })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-max">{t('Max hours')}</Label>
              <Input id="type-max" type="number" min="0" step="1" value={form.maxHours} onChange={(e) => setForm({ ...form, maxHours: e.target.value })} placeholder={t('optional')} />
            </div>
            <Button type="submit">{t('Add Table Type')}</Button>
          </form>
        </CardContent>
      </Card>

      {orderedTypes.map((type, index) => {
        const typeTables = tables.filter((t) => t.tableTypeId === type.id).sort((a, b) => a.number - b.number)
        const isEditing = editing?.id === type.id
        return (
          <Card key={type.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CircleDot className="h-4 w-4" /> {type.name_en}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t('{amount}/h · VAT {rate}%', { amount: money(type.base_hourly_cents, currency), rate: type.vatRatePercent ?? 20 })}
                      {type.maxUsedHours ? t(' · maintenance every {hours}h', { hours: type.maxUsedHours }) : ''}
                    </span>
                  </CardTitle>
                  <CardDescription>{typeTables.length === 1 ? t('{count} table', { count: typeTables.length }) : t('{count} tables', { count: typeTables.length })}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={t('Move up')} disabled={index === 0} onClick={() => moveType(type.name_en, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t('Move down')}
                    disabled={index === orderedTypes.length - 1}
                    onClick={() => moveType(type.name_en, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t('Edit type')}
                    onClick={() =>
                      setEditing({
                        id: type.id,
                        form: {
                          name: type.name_en,
                          hourly: (type.base_hourly_cents / 100).toFixed(2),
                          vat: String(type.vatRatePercent ?? 20),
                          maxHours: type.maxUsedHours ? String(type.maxUsedHours) : '',
                        },
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={t('Delete type')}>
                        <Trash2 />
                      </Button>
                    }
                    title={t('Delete table type?')}
                    description={t('This only works if no tables exist for this type.')}
                    confirmLabel={t('Delete type')}
                    onConfirm={() => void removeType(type.id)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing && editing && (
                <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px_120px_110px_auto] sm:items-center">
                  <Input value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} />
                  <Input type="number" min="0" step="0.01" value={editing.form.hourly} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, hourly: e.target.value } })} />
                  <Select value={editing.form.vat} onValueChange={(vat) => setEditing({ ...editing, form: { ...editing.form, vat } })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" min="0" step="1" placeholder={t('Max h')} value={editing.form.maxHours} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, maxHours: e.target.value } })} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void saveType()}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`qty-${type.id}`}>{t('Quantity')}</Label>
                  <Input
                    id={`qty-${type.id}`}
                    type="number"
                    min="1"
                    className="w-24"
                    value={quantities[type.id] ?? 1}
                    onChange={(e) => setQuantities((q) => ({ ...q, [type.id]: Math.max(1, parseInt(e.target.value || '1', 10)) }))}
                  />
                </div>
                <Button variant="outline" onClick={() => void addTables(type.id)}>
                  <Plus /> {t('Add Tables')}
                </Button>
              </div>

              <div className="space-y-2">
                {typeTables.length === 0 && <p className="text-sm text-muted-foreground">{t('No tables of this type yet.')}</p>}
                {typeTables.map((tb) => (
                  <div key={tb.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                    {editingNumber?.id === tb.id ? (
                      <span className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          autoFocus
                          aria-label={t('Table number')}
                          className="h-7 w-20"
                          value={editingNumber.value}
                          onChange={(e) => setEditingNumber({ id: tb.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveTableNumber(tb.id)
                            if (e.key === 'Escape') setEditingNumber(null)
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t('Save table number')} onClick={() => void saveTableNumber(tb.id)}>
                          <Check />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t('Cancel')} onClick={() => setEditingNumber(null)}>
                          <X />
                        </Button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-bold">
                        #{tb.number}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground"
                          aria-label={t('Change table number {number}', { number: tb.number })}
                          title={t('Change table number')}
                          onClick={() => setEditingNumber({ id: tb.id, value: String(tb.number) })}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </span>
                    )}
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs font-semibold capitalize',
                        tb.status === 'maintenance' ? 'bg-amber-500/15 text-amber-600' : 'bg-accent text-accent-foreground',
                      )}
                    >
                      {tb.status === 'maintenance' ? t('Maintenance') : tb.status === 'occupied' ? t('Occupied') : t('Available')}
                    </span>
                    <div className="ml-auto flex gap-1">
                      {tb.status !== 'maintenance' && (
                        <Button size="sm" variant="outline" onClick={() => void quickStart(tb)}>
                          <Play /> {t('Start')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void apiSetTableStatus(tb.id, tb.status === 'maintenance' ? 'available' : 'maintenance').then(load)}
                      >
                        <Wrench /> {tb.status === 'maintenance' ? t('Set available') : t('Maintenance')}
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="outline" className="text-destructive">
                            <Trash2 /> {t('Delete')}
                          </Button>
                        }
                        title={t('Delete table #{number}?', { number: tb.number })}
                        description={t('The table will be removed from the venue.')}
                        confirmLabel={t('Delete table')}
                        onConfirm={() => void apiDeleteTable(tb.id).then(load)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
