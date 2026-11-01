import * as React from 'react'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiInvoices, type InvoiceRecord } from '@/lib/api'
import { money } from '@/lib/format'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { useI18n } from '@/lib/i18n'

interface InvoiceFilters {
  from: string
  to: string
}

function dateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function initialFilters(): InvoiceFilters {
  const now = new Date()
  return {
    from: dateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: dateInputValue(now),
  }
}

export function InvoicesSection() {
  const { settings } = useSettings()
  const { toast } = useToast()
  const { t } = useI18n()
  const currency = settings.currency || '$'
  const [filters, setFilters] = React.useState<InvoiceFilters>(initialFilters)
  const [invoices, setInvoices] = React.useState<InvoiceRecord[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async (range: InvoiceFilters) => {
    setLoading(true)
    const result = await apiInvoices(range)
    setLoading(false)
    if (!result.ok || !result.data) {
      toast({ title: t('Failed to load invoices'), description: result.error || `Error ${result.status}`, variant: 'error' })
      return
    }
    setInvoices(result.data)
    setSelectedId(null)
  }, [t, toast])

  React.useEffect(() => {
    void load(filters)
  }, [load])

  const selected = invoices.find((invoice) => invoice.id === selectedId) || null

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    void load(filters)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[9.25rem_9.25rem_auto]">
            <div className="grid grid-rows-[1rem_2.25rem] gap-1.5">
              <Label className="h-4 leading-4" htmlFor="invoices-from">{t('From')}</Label>
              <Input id="invoices-from" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
            </div>
            <div className="grid grid-rows-[1rem_2.25rem] gap-1.5">
              <Label className="h-4 leading-4" htmlFor="invoices-to">{t('To')}</Label>
              <Input id="invoices-to" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
            </div>
            <Button className="w-fit self-end" type="submit" disabled={loading}>{loading ? t('Loading…') : t('Apply')}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> {t('Invoices')}
          </CardTitle>
          <CardDescription>{t('Browse invoices issued at checkout.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">{t('Showing {count} invoices', { count: invoices.length })}</p>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('Loading…')}</p>
          ) : invoices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('No invoices found for this period.')}</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => {
                const isSelected = selectedId === invoice.id
                return (
                  <button
                    key={invoice.id}
                    type="button"
                    aria-expanded={isSelected}
                    onClick={() => setSelectedId(isSelected ? null : invoice.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-3 text-left transition-colors hover:bg-accent/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{t('Invoice #{number}/{year}', { number: invoice.receiptNumber, year: invoice.year })}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {new Date(invoice.createdAt).toLocaleString()}
                        {invoice.tableNumber != null ? ` · ${t('Table #{number}', { number: invoice.tableNumber })}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-sm font-bold">
                      {money(invoice.totalTtcCents, currency)}
                      {isSelected ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('Invoice details')} — {t('Invoice #{number}/{year}', { number: selected.receiptNumber, year: selected.year })}</CardTitle>
            <CardDescription>
              {new Date(selected.createdAt).toLocaleString()}
              {selected.tableNumber != null ? ` · ${t('Table #{number}', { number: selected.tableNumber })}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{t('Session started')}</p>
                <p className="font-medium">{selected.sessionStartedAt ? new Date(selected.sessionStartedAt).toLocaleString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Session ended')}</p>
                <p className="font-medium">{selected.sessionEndedAt ? new Date(selected.sessionEndedAt).toLocaleString() : '—'}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">{t('Item')}</th>
                    <th className="px-2 py-2 text-right">{t('Qty')}</th>
                    <th className="px-2 py-2 text-right">{t('Unit Price')}</th>
                    <th className="px-2 py-2 text-right">{t('VAT')}</th>
                    <th className="px-2 py-2 text-right">{t('Line Total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map((item, index) => (
                    <tr key={`${item.description}-${index}`} className="border-b last:border-0">
                      <td className="px-2 py-2">{item.description}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{money(item.unitPrice, currency)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{item.vatRatePercent ?? 20}%</td>
                      <td className="px-2 py-2 text-right tabular-nums">{money(item.totalCents, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto grid max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <span>{t('Subtotal (TTC)')}</span><span className="text-right tabular-nums">{money(selected.items.reduce((sum, item) => sum + item.totalCents, 0), currency)}</span>
              {selected.discountCents > 0 && <><span>{t('Discount')}</span><span className="text-right tabular-nums">-{money(selected.discountCents, currency)}</span></>}
              <span>{t('Total (HT)')}</span><span className="text-right tabular-nums">{money(selected.subtotalHtCents, currency)}</span>
              <span>{t('VAT')}</span><span className="text-right tabular-nums">{money(selected.vatCents, currency)}</span>
              <span className="font-bold">{t('Total (TTC)')}</span><span className="text-right font-bold tabular-nums">{money(selected.totalTtcCents, currency)}</span>
            </div>
            {selected.payments && selected.payments.length > 0 && (
              <div className="border-t pt-3">
                <h3 className="mb-2 text-sm font-semibold">{t('Payments')}</h3>
                <div className="space-y-1">
                  {selected.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between text-sm">
                      <span>{t(payment.method)}</span><span className="tabular-nums">{money(payment.amountCents, payment.currency || currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
