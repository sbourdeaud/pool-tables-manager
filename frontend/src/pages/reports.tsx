import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type Chart,
} from 'chart.js'
import { Line, Pie } from 'react-chartjs-2'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { ArrowLeft, BarChart3, FileDown, Loader2, Mail, Sheet } from 'lucide-react'
import { apiEmailReport, apiFinancialReport, type FinancialReport } from '@/lib/api'
import { money } from '@/lib/format'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VatReportSection } from '@/pages/vat-report-section'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

type Translate = (key: string, vars?: Record<string, string | number>) => string

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CHART_COLORS = ['#10b981', '#2563eb', '#f59e0b', '#7c3aed', '#e11d48', '#06b6d4', '#84cc16']

function mondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().split('T')[0]
}

function periodLabel(form: Record<string, string>, t: Translate): string {
  const { periodType, year, month, quarter, date, weekDate } = form
  if (periodType === 'day') return new Date(date).toLocaleDateString()
  if (periodType === 'week') return t('Week of {date}', { date: new Date(weekDate).toLocaleDateString() })
  if (periodType === 'month') return `${t(MONTHS[parseInt(month, 10) - 1])} ${year}`
  if (periodType === 'quarter') return t('Q{quarter} {year}', { quarter, year })
  return year
}

export function ReportsPage() {
  const { settings } = useSettings()
  const { toast } = useToast()
  const { t } = useI18n()
  const currency = settings.currency || '$'
  const today = new Date()
  const [form, setForm] = React.useState<Record<string, string>>({
    periodType: 'day',
    date: today.toISOString().split('T')[0],
    weekDate: mondayOfWeek(today),
    year: String(today.getFullYear()),
    month: String(today.getMonth() + 1),
    quarter: String(Math.floor(today.getMonth() / 3) + 1),
  })
  const [report, setReport] = React.useState<FinancialReport | null>(null)
  const [tab, setTab] = React.useState<'financial' | 'vat'>('financial')
  const [loading, setLoading] = React.useState(false)
  const [emailOpen, setEmailOpen] = React.useState(false)
  const [emailTo, setEmailTo] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const pieRef = React.useRef<Chart<'pie', number[], string> | null | undefined>(undefined)
  const lineRef = React.useRef<Chart<'line', number[], string> | null | undefined>(undefined)

  const generate = async () => {
    setLoading(true)
    const params: Record<string, string> = { periodType: form.periodType }
    if (form.periodType === 'day') params.date = form.date
    else if (form.periodType === 'week') params.weekDate = form.weekDate
    else if (form.periodType === 'month') {
      params.year = form.year
      params.month = form.month
    } else if (form.periodType === 'quarter') {
      params.year = form.year
      params.quarter = form.quarter
    } else params.year = form.year

    const result = await apiFinancialReport(params)
    setLoading(false)
    if (!result.ok || !result.data || result.data.error) {
      toast({ title: t('Failed to generate report'), description: result.data?.error || result.error || `Error ${result.status}`, variant: 'error' })
      setReport(null)
      return
    }
    setReport(result.data)
  }

  const pieData = React.useMemo(() => {
    if (!report) return null
    const labels: string[] = []
    const values: number[] = []
    for (const [name, amount] of Object.entries(report.byTableType || {})) {
      if (amount > 0) {
        labels.push(t('{name} Tables', { name }))
        values.push(amount / 100)
      }
    }
    if (report.drinksTotal > 0) {
      labels.push(t('Bar/Drinks'))
      values.push(report.drinksTotal / 100)
    }
    if (report.subscriptionsTotal > 0) {
      labels.push(t('Subscriptions'))
      values.push(report.subscriptionsTotal / 100)
    }
    return {
      labels,
      datasets: [{ data: values, backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderWidth: 1 }],
    }
  }, [report, t])

  const lineData = React.useMemo(() => {
    if (!report?.timeSeries?.length) return null
    const labels = report.timeSeries.map((p) =>
      form.periodType === 'month' && p.dayOfWeek ? `${p.label} · ${p.dayOfWeek}` : p.label,
    )
    const datasets = [
      { label: t('Total'), data: report.timeSeries.map((p) => p.total / 100), borderColor: CHART_COLORS[0], backgroundColor: CHART_COLORS[0] },
    ] as { label: string; data: number[]; borderColor: string; backgroundColor: string }[]
    if (report.timeSeries.some((p) => (p.tables ?? 0) > 0)) {
      datasets.push({ label: t('Tables'), data: report.timeSeries.map((p) => (p.tables ?? 0) / 100), borderColor: CHART_COLORS[1], backgroundColor: CHART_COLORS[1] })
    }
    if (report.timeSeries.some((p) => (p.drinks ?? 0) > 0)) {
      datasets.push({ label: t('Drinks'), data: report.timeSeries.map((p) => (p.drinks ?? 0) / 100), borderColor: CHART_COLORS[2], backgroundColor: CHART_COLORS[2] })
    }
    if (report.timeSeries.some((p) => (p.subscriptions ?? 0) > 0)) {
      datasets.push({ label: t('Subscriptions'), data: report.timeSeries.map((p) => (p.subscriptions ?? 0) / 100), borderColor: CHART_COLORS[3], backgroundColor: CHART_COLORS[3] })
    }
    return { labels, datasets }
  }, [report, form.periodType, t])

  const buildPdf = React.useCallback((): jsPDF | null => {
    if (!report) return null
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const contentWidth = pageWidth - margin * 2

    pdf.setFontSize(20)
    pdf.text(t('Financial Report'), margin, 20)
    pdf.setFontSize(12)
    pdf.text(periodLabel(form, t), margin, 28)
    pdf.setFontSize(14)
    pdf.text(t('Summary:'), margin, 40)
    pdf.setFontSize(11)
    pdf.text(t('Total Revenue: {amount}', { amount: money(report.totalRevenue, currency) }), margin + 5, 48)
    let y = 56
    pdf.text(t('Breakdown:'), margin + 5, y)
    y += 8
    for (const [typeName, amount] of Object.entries(report.byTableType || {})) {
      pdf.text(t('  {name} Tables: {amount}', { name: typeName, amount: money(amount, currency) }), margin + 10, y)
      y += 6
    }
    pdf.text(t('  Drinks/Bar: {amount}', { amount: money(report.drinksTotal, currency) }), margin + 10, y)
    y += 6
    pdf.text(t('  Subscriptions: {amount}', { amount: money(report.subscriptionsTotal, currency) }), margin + 10, y)

    const addChartImage = (chart: Chart | null | undefined, title: string, newPage: boolean) => {
      if (!chart) return
      if (newPage) pdf.addPage()
      pdf.setFontSize(16)
      pdf.text(title, margin, 20)
      const canvas = chart.canvas
      const aspect = canvas.height / canvas.width
      let w = contentWidth
      let h = w * aspect
      if (h > pageHeight - 50) {
        h = pageHeight - 50
        w = h / aspect
      }
      pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', margin + (contentWidth - w) / 2, 30, w, h)
    }
    addChartImage(pieRef.current, t('Revenue Distribution'), true)
    addChartImage(lineRef.current, form.periodType === 'week' || form.periodType === 'month' ? t('Daily Revenue') : t('Revenue Over Time'), true)
    return pdf
  }, [report, form, currency, t])

  const exportPdf = () => {
    const pdf = buildPdf()
    if (pdf) pdf.save(`financial-report-${periodLabel(form, t).replace(/[^a-z0-9]+/gi, '-')}.pdf`)
  }

  const exportExcel = () => {
    if (!report) return
    const rows: (string | number)[][] = [
      [t('Financial Report'), periodLabel(form, t)],
      [t('Total Revenue'), report.totalRevenue / 100],
      ...Object.entries(report.byTableType || {}).map(([name, amount]) => [t('{name} Tables', { name }), amount / 100]),
      [t('Bar/Drinks'), report.drinksTotal / 100],
      [t('Subscriptions'), report.subscriptionsTotal / 100],
      ...(report.refundsTotal ? [[t('Refunds (credit notes)'), -report.refundsTotal / 100]] : []),
      ...Object.entries(report.byPaymentMethod || {}).map(([method, amount]) => [t('Paid by {method}', { method }), amount / 100]),
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), t('Summary'))
    if (report.timeSeries?.length) {
      const series = [[t('Period'), t('Total'), t('Tables'), t('Drinks'), t('Subscriptions')], ...report.timeSeries.map((p) => [p.label, p.total / 100, (p.tables ?? 0) / 100, (p.drinks ?? 0) / 100, (p.subscriptions ?? 0) / 100])]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(series), t('Time Series'))
    }
    XLSX.writeFile(wb, `financial-report-${periodLabel(form, t).replace(/[^a-z0-9]+/gi, '-')}.xlsx`)
  }

  const sendEmail = async () => {
    if (!report || !emailTo) return
    setSending(true)
    const pdf = buildPdf()
    const pdfBase64 = pdf ? (pdf.output('datauristring').split(',')[1] || '') : undefined
    const result = await apiEmailReport({
      to: emailTo,
      format: pdf ? 'pdf' : 'html',
      pdfBase64,
      report: {
        title: t('Financial Report'),
        periodLabel: periodLabel(form, t),
        currency,
        totalRevenue: report.totalRevenue,
        byTableType: report.byTableType,
        drinksTotal: report.drinksTotal,
        subscriptionsTotal: report.subscriptionsTotal,
      },
    })
    setSending(false)
    if (result.ok) {
      toast({ title: t('Report sent') })
      setEmailOpen(false)
    } else {
      toast({ title: t('Failed to send report'), description: result.error || `Error ${result.status}`, variant: 'error' })
    }
  }

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Admin')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('Reports')}</h1>
      </div>

      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        {(['financial', 'vat'] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === tabKey ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tabKey === 'financial' ? t('Financial') : t('VAT / TVA')}
          </button>
        ))}
      </div>

      {tab === 'vat' && <VatReportSection />}

      {tab === 'financial' && (
      <>
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="space-y-1.5">
              <Label>{t('Period type')}</Label>
              <Select value={form.periodType} onValueChange={(v) => setField('periodType', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">{t('Day')}</SelectItem>
                  <SelectItem value="week">{t('Week')}</SelectItem>
                  <SelectItem value="month">{t('Month')}</SelectItem>
                  <SelectItem value="quarter">{t('Quarter')}</SelectItem>
                  <SelectItem value="year">{t('Year')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.periodType === 'day' && (
              <div className="space-y-1.5">
                <Label htmlFor="report-date">{t('Date')}</Label>
                <Input id="report-date" type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
              </div>
            )}
            {form.periodType === 'week' && (
              <div className="space-y-1.5">
                <Label htmlFor="report-week">{t('Week starting')}</Label>
                <Input id="report-week" type="date" value={form.weekDate} onChange={(e) => setField('weekDate', e.target.value)} />
              </div>
            )}
            {(form.periodType === 'month' || form.periodType === 'quarter' || form.periodType === 'year') && (
              <div className="space-y-1.5">
                <Label htmlFor="report-year">{t('Year')}</Label>
                <Input id="report-year" type="number" min="2020" max="2099" value={form.year} onChange={(e) => setField('year', e.target.value)} />
              </div>
            )}
            {form.periodType === 'month' && (
              <div className="space-y-1.5">
                <Label>{t('Month')}</Label>
                <Select value={form.month} onValueChange={(v) => setField('month', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {t(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.periodType === 'quarter' && (
              <div className="space-y-1.5">
                <Label>{t('Quarter')}</Label>
                <Select value={form.quarter} onValueChange={(v) => setField('quarter', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('Q1 (Jan–Mar)')}</SelectItem>
                    <SelectItem value="2">{t('Q2 (Apr–Jun)')}</SelectItem>
                    <SelectItem value="3">{t('Q3 (Jul–Sep)')}</SelectItem>
                    <SelectItem value="4">{t('Q4 (Oct–Dec)')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => void generate()} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <BarChart3 />} {t('Generate Report')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('Summary — {period}', { period: periodLabel(form, t) })}</CardTitle>
              <CardDescription>{t('All amounts are tax-inclusive (TTC)')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-accent/60 px-4 py-3">
                <span className="text-sm font-semibold">{t('Total Revenue')}</span>
                <span className="text-xl font-extrabold">{money(report.totalRevenue, currency)}</span>
              </div>
              {Object.entries(report.byTableType || {}).map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2 text-sm">
                  <span>{t('{name} Tables', { name })}</span>
                  <span className="font-semibold">{money(amount, currency)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2 text-sm">
                <span>{t('Bar/Drinks')}</span>
                <span className="font-semibold">{money(report.drinksTotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2 text-sm">
                <span>{t('Subscriptions')}</span>
                <span className="font-semibold">{money(report.subscriptionsTotal, currency)}</span>
              </div>
              {report.refundsTotal != null && report.refundsTotal > 0 && (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2 text-sm">
                  <span>{t('Refunds (credit notes)')}</span>
                  <span className="font-semibold text-destructive">-{money(report.refundsTotal, currency)}</span>
                </div>
              )}
              {report.byPaymentMethod &&
                Object.entries(report.byPaymentMethod).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2 text-sm">
                    <span className="capitalize">{t('Paid by {method}', { method })}</span>
                    <span className="font-semibold">{money(amount, currency)}</span>
                  </div>
                ))}
              <div className="flex flex-wrap gap-2 pt-3">
                <Button variant="outline" onClick={exportPdf}>
                  <FileDown /> {t('Export to PDF')}
                </Button>
                <Button variant="outline" onClick={exportExcel}>
                  <Sheet /> {t('Export to Excel')}
                </Button>
                <Button variant="outline" onClick={() => setEmailOpen(true)}>
                  <Mail /> {t('Send')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {pieData && pieData.labels.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Revenue Distribution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mx-auto max-w-sm">
                    <Pie
                      ref={(instance) => {
                        pieRef.current = instance
                      }}
                      data={pieData}
                      options={{ plugins: { legend: { position: 'bottom' } } }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            {lineData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {form.periodType === 'week' || form.periodType === 'month' ? t('Daily Revenue') : t('Revenue Over Time')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Line
                    ref={(instance) => {
                      lineRef.current = instance
                    }}
                    data={lineData}
                    options={{
                      plugins: { legend: { position: 'bottom' } },
                      scales: { y: { beginAtZero: true } },
                      elements: { point: { radius: 2 } },
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {report.dayOfWeekAnalysis && report.dayOfWeekAnalysis.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('Day-of-week Analysis')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {report.dayOfWeekAnalysis.map((d) => (
                  <div key={d.dayOfWeek} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5 text-sm">
                    <span>{t(d.dayOfWeek)}</span>
                    <span className="font-semibold">{money(d.total, currency)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
      </>
      )}

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Email this report')}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-1.5">
            <Label htmlFor="email-to">{t('Recipient')}</Label>
            <Input id="email-to" type="email" autoFocus value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="[EMAIL]" />
            <p className="text-xs text-muted-foreground">{t('A PDF copy is attached. Requires SMTP settings under Admin → Settings → Email.')}</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button disabled={sending || !emailTo} onClick={() => void sendEmail()}>
              {sending ? t('Sending…') : t('Send report')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
