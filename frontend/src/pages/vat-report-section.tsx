import * as React from 'react'
import { FileDown, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { apiClosures, apiCreateClosure, apiVatReport, vatExportUrl, type ClosurePeriod, type VatReport } from '@/lib/api'
import { money } from '@/lib/format'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const CATEGORY_LABELS: Record<string, string> = {
  table: 'Table time',
  drinks: 'Drinks',
  discount: 'Discounts',
  refund: 'Refunds (credit notes)',
  other: 'Other',
}

export function VatReportSection() {
  const { settings } = useSettings()
  const { toast } = useToast()
  const currency = settings.currency || '$'
  const today = new Date()
  const [form, setForm] = React.useState<Record<string, string>>({
    periodType: 'month',
    year: String(today.getFullYear()),
    month: String(today.getMonth() + 1),
    quarter: String(Math.floor(today.getMonth() / 3) + 1),
    date: today.toISOString().split('T')[0],
  })
  const [report, setReport] = React.useState<VatReport | null>(null)
  const [closures, setClosures] = React.useState<ClosurePeriod[]>([])
  const [loading, setLoading] = React.useState(false)
  const [closing, setClosing] = React.useState(false)

  const params = React.useMemo(() => {
    const p: Record<string, string> = { periodType: form.periodType }
    if (form.periodType === 'day') p.date = form.date
    else if (form.periodType === 'month') {
      p.year = form.year
      p.month = form.month
    } else if (form.periodType === 'quarter') {
      p.year = form.year
      p.quarter = form.quarter
    } else p.year = form.year
    return p
  }, [form])

  const loadClosures = React.useCallback(async () => {
    const result = await apiClosures()
    setClosures(result.data || [])
  }, [])

  React.useEffect(() => {
    void loadClosures()
  }, [loadClosures])

  const generate = async () => {
    setLoading(true)
    const result = await apiVatReport(params)
    setLoading(false)
    if (!result.ok || !result.data) {
      toast({ title: 'Failed to load VAT report', description: result.error || `Error ${result.status}`, variant: 'error' })
      setReport(null)
      return
    }
    setReport(result.data)
  }

  React.useEffect(() => {
    void generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const closePeriod = async () => {
    setClosing(true)
    const result = await apiCreateClosure(params)
    setClosing(false)
    if (result.ok) {
      toast({ title: 'VAT period closed', description: result.data?.periodKey })
      await Promise.all([generate(), loadClosures()])
      return
    }
    if (result.status === 409) {
      toast({ title: 'Period already closed', variant: 'error' })
      await Promise.all([generate(), loadClosures()])
      return
    }
    toast({ title: 'Failed to close period', description: result.error || `Error ${result.status}`, variant: 'error' })
  }

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))
  const rates = report ? Object.keys(report.byRate).sort((a, b) => Number(a) - Number(b)) : []

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="space-y-1.5">
              <Label>Period type</Label>
              <Select value={form.periodType} onValueChange={(v) => setField('periodType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.periodType === 'day' && (
              <div className="space-y-1.5">
                <Label htmlFor="vat-date">Date</Label>
                <Input id="vat-date" type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
              </div>
            )}
            {form.periodType !== 'day' && (
              <div className="space-y-1.5">
                <Label htmlFor="vat-year">Year</Label>
                <Input id="vat-year" type="number" min="2020" max="2099" value={form.year} onChange={(e) => setField('year', e.target.value)} />
              </div>
            )}
            {form.periodType === 'month' && (
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select value={form.month} onValueChange={(v) => setField('month', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.periodType === 'quarter' && (
              <div className="space-y-1.5">
                <Label>Quarter</Label>
                <Select value={form.quarter} onValueChange={(v) => setField('quarter', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (Jan–Mar)</SelectItem>
                    <SelectItem value="2">Q2 (Apr–Jun)</SelectItem>
                    <SelectItem value="3">Q3 (Jul–Sep)</SelectItem>
                    <SelectItem value="4">Q4 (Oct–Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => void generate()} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Load VAT report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                VAT (TVA) — {report.periodKey}
                <span
                  className={
                    report.closed
                      ? 'rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground'
                      : 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600'
                  }
                >
                  {report.closed ? `Closed ${report.closedAt ? new Date(report.closedAt).toLocaleDateString() : ''}` : 'Open'}
                </span>
              </CardTitle>
              <CardDescription>
                {new Date(report.fromDate).toLocaleDateString()} – {new Date(report.toDate).toLocaleDateString()} · {report.lineCount} ledger line
                {report.lineCount === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Total (TTC)" value={money(report.grandTotalTtcCents, currency)} emphasis />
                <Metric label="VAT (TVA)" value={money(report.grandVatCents, currency)} />
                <Metric label="Total (HT)" value={money(report.grandHtCents, currency)} />
              </div>

              <div className="space-y-2">
                <Label className="block">By VAT rate</Label>
                {rates.length > 0 && (
                  <div className="grid grid-cols-4 items-center gap-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span>Rate</span>
                    <span className="text-right">TTC</span>
                    <span className="text-right">VAT</span>
                    <span className="text-right">HT</span>
                  </div>
                )}
                {rates.length === 0 && <p className="text-sm text-muted-foreground">No VAT-rated sales in this period.</p>}
                {rates.map((rate) => {
                  const bucket = report.byRate[rate]
                  return (
                    <div key={rate} className="grid grid-cols-4 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                      <span className="font-semibold">VAT {rate}%</span>
                      <span className="text-right tabular-nums">{money(bucket.totalTtcCents, currency)}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{money(bucket.vatCents, currency)}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{money(bucket.htCents, currency)}</span>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-2">
                <Label className="block">By category (TTC)</Label>
                {Object.entries(report.byCategory).map(([category, cents]) => (
                  <div key={category} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <span>{CATEGORY_LABELS[category] || category}</span>
                    <span className="font-semibold tabular-nums">{money(cents, currency)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" asChild>
                  <a href={vatExportUrl(params)} download>
                    <FileDown /> Export CSV ledger
                  </a>
                </Button>
                {!report.closed && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" disabled={closing}>
                        <Lock /> {closing ? 'Closing…' : 'Close period'}
                      </Button>
                    }
                    title={`Close VAT period ${report.periodKey}?`}
                    description="Once closed, this period's sales history can no longer be cleared from Settings → Danger Zone. Use this after the VAT declaration has been filed."
                    confirmLabel="Close period"
                    onConfirm={() => void closePeriod()}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Closed periods</CardTitle>
              <CardDescription>Periods locked for accounting — their history is protected from deletion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {closures.length === 0 && <p className="text-sm text-muted-foreground">No periods closed yet.</p>}
              {closures.map((c) => (
                <div key={c.id || c.periodKey} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold">
                      {c.periodKey} <span className="font-normal text-muted-foreground">({c.periodType})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.fromDate).toLocaleDateString()} – {new Date(c.toDate).toLocaleDateString()}
                      {c.closedBy ? ` · by ${c.closedBy}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{money(c.totalTtcCents, currency)}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      VAT {money(c.totalVatCents, currency)} · HT {money(c.totalHtCents, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? 'rounded-lg bg-accent/60 px-4 py-3' : 'rounded-lg border bg-muted/30 px-4 py-3'}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-extrabold tabular-nums">{value}</p>
    </div>
  )
}
