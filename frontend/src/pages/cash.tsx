import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Ban, Coins, CreditCard, FileDown, Lock, LockOpen, Printer, RotateCcw, ShieldCheck } from 'lucide-react'
import {
  apiCancelPayment,
  apiCashShifts,
  apiCloseCashShift,
  apiCreditNotes,
  apiCurrentCashShift,
  apiDayClose,
  apiOpenCashShift,
  apiPaymentConfig,
  apiPayments,
  apiReconciliation,
  apiRefundPayment,
  paymentsExportUrl,
  type CashShift,
  type CreditNoteRecord,
  type CurrentCashShift,
  type PaymentConfig,
  type PaymentRecord,
  type Reconciliation,
} from '@/lib/api'
import { printCreditNote } from '@/lib/receipts'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { money } from '@/lib/format'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function CashPage() {
  const { settings } = useSettings()
  const { toast } = useToast()
  const currency = settings.currency || '€'
  const posEnabled = settings.pos_enabled === 'true'

  const [current, setCurrent] = React.useState<CurrentCashShift | null>(null)
  const [payments, setPayments] = React.useState<PaymentRecord[]>([])
  const [shifts, setShifts] = React.useState<CashShift[]>([])
  const [openingFloat, setOpeningFloat] = React.useState('')
  const [counted, setCounted] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [reconDate, setReconDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [reconciliation, setReconciliation] = React.useState<Reconciliation | null>(null)
  const [closingDay, setClosingDay] = React.useState(false)
  const [creditNotes, setCreditNotes] = React.useState<CreditNoteRecord[]>([])
  const [providerConfig, setProviderConfig] = React.useState<PaymentConfig | null>(null)
  const [refundTarget, setRefundTarget] = React.useState<PaymentRecord | null>(null)
  const [refundAmount, setRefundAmount] = React.useState('')
  const [refundReason, setRefundReason] = React.useState('')

  const load = React.useCallback(async () => {
    if (!posEnabled) {
      setLoading(false)
      return
    }
    const [currentRes, paymentsRes, shiftsRes, notesRes, configRes] = await Promise.all([
      apiCurrentCashShift(),
      apiPayments(100),
      apiCashShifts(),
      apiCreditNotes(50),
      apiPaymentConfig(),
    ])
    setCurrent(currentRes.data || { shift: null })
    setPayments(paymentsRes.data || [])
    setShifts(shiftsRes.data || [])
    setCreditNotes(notesRes.data || [])
    setProviderConfig(configRes.data || null)
    setLoading(false)
  }, [posEnabled])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    if (!posEnabled) return
    void apiReconciliation(reconDate).then((r) => setReconciliation(r.data || null))
  }, [posEnabled, reconDate])

  const openShift = async () => {
    const floatCents = Math.round(parseFloat(openingFloat || '0') * 100)
    const result = await apiOpenCashShift(floatCents)
    if (!result.ok) {
      return toast({ title: 'Failed to open shift', description: result.error || `Error ${result.status}`, variant: 'error' })
    }
    toast({ title: 'Cash shift opened' })
    setOpeningFloat('')
    await load()
  }

  const closeShift = async () => {
    if (!current?.shift) return
    const countedCents = Math.round(parseFloat(counted || '0') * 100)
    const result = await apiCloseCashShift(current.shift.id, { countedCents, notes: notes.trim() || undefined })
    if (!result.ok) {
      return toast({ title: 'Failed to close shift', description: result.error || `Error ${result.status}`, variant: 'error' })
    }
    toast({
      title: 'Cash shift closed',
      description: `Variance: ${money(result.data?.varianceCents || 0, currency)}`,
    })
    setCounted('')
    setNotes('')
    await load()
  }

  const openRefund = (payment: PaymentRecord) => {
    setRefundTarget(payment)
    setRefundAmount(((payment.amountCents - payment.refundedCents) / 100).toFixed(2))
    setRefundReason('')
  }

  const submitRefund = async () => {
    if (!refundTarget) return
    const remaining = refundTarget.amountCents - refundTarget.refundedCents
    const cents = Math.round(parseFloat(refundAmount || '0') * 100)
    if (!(cents > 0) || cents > remaining) {
      return toast({ title: 'Invalid refund amount', description: `Maximum ${money(remaining, currency)}`, variant: 'error' })
    }
    const result = await apiRefundPayment(refundTarget.id, cents, refundReason.trim() || undefined)
    if (!result.ok) {
      return toast({ title: 'Failed to refund', description: result.error || `Error ${result.status}`, variant: 'error' })
    }
    const note = result.data?.creditNote
    toast({
      title: 'Payment refunded',
      description: note ? `Credit note #${note.number}/${note.year} issued (VAT ${money(note.vatCents, currency)})` : 'Recorded (no credit note: payment was not invoiced yet)',
    })
    setRefundTarget(null)
    await load()
    void apiReconciliation(reconDate).then((r) => setReconciliation(r.data || null))
  }

  const cancelPayment = async (payment: PaymentRecord) => {
    const result = await apiCancelPayment(payment.id)
    if (!result.ok) {
      return toast({ title: 'Failed to cancel payment', description: result.error || `Error ${result.status}`, variant: 'error' })
    }
    toast({ title: 'Card payment canceled', description: `Status: ${result.data?.status || 'canceled'}` })
    await load()
  }

  const closeDay = async () => {
    setClosingDay(true)
    const result = await apiDayClose(reconDate)
    setClosingDay(false)
    if (!result.ok) {
      return toast({
        title: result.error === 'open_shift' ? 'Close the cash shift first' : result.error === 'already_closed' ? 'Day already closed' : 'Failed to close day',
        description: result.error || `Error ${result.status}`,
        variant: 'error',
      })
    }
    toast({ title: `Day ${reconDate} closed` })
    void apiReconciliation(reconDate).then((r) => setReconciliation(r.data || null))
    await load()
  }

  if (!posEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Cash &amp; Payments</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm font-semibold">Payments are disabled</p>
            <p className="max-w-prose text-sm text-muted-foreground">
              The optional POS feature is off. Enable it in Settings → General → “Payments (POS)” to collect
              cash payments, split payments between payers, print payment methods on receipts and reconcile
              the cash drawer.
            </p>
            <Button asChild variant="outline">
              <Link to="/settings">Open Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const expectedCents = current?.totals?.expectedCents ?? null
  const signedMoney = (cents: number) =>
    (cents > 0 ? '+' : cents < 0 ? '-' : '') + money(Math.abs(cents), currency)

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Cash &amp; Payments</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          {providerConfig?.card_enabled
            ? `Card terminal: ${providerConfig.provider === 'stripe' ? 'Stripe Terminal configured' : `${providerConfig.provider} configured`}`
            : 'Card terminal: not configured — cash only'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {current?.shift ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Cash shift
            </CardTitle>
            <CardDescription>
              {current?.shift
                ? `Open since ${new Date(current.shift.openedAt).toLocaleString()}${current.shift.openedBy ? ` · ${current.shift.openedBy}` : ''}`
                : 'No shift open.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : current?.shift ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/40 px-2 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Opening float</p>
                    <p className="font-semibold">{money(current.shift.openingFloatCents, currency)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Cash net</p>
                    <p className="font-semibold">{money(current.totals?.netCents || 0, currency)}</p>
                  </div>
                  <div className="rounded-lg bg-accent/60 px-2 py-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Expected</p>
                    <p className="font-semibold">{money(expectedCents || 0, currency)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cash-counted">Counted cash ({currency})</Label>
                  <Input id="cash-counted" type="number" min="0" step="0.01" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0.00" />
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
                  {counted && expectedCents != null && (
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        Math.round(parseFloat(counted) * 100) - expectedCents === 0 ? 'text-emerald-600' : 'text-destructive',
                      )}
                    >
                      Variance: {signedMoney(Math.round(parseFloat(counted) * 100) - expectedCents)}
                    </p>
                  )}
                  <ConfirmDialog
                    trigger={<Button disabled={!counted}>Close shift</Button>}
                    title="Close cash shift?"
                    description={`Expected ${money(expectedCents || 0, currency)}. The counted amount will be stored with the variance for reconciliation.`}
                    confirmLabel="Close shift"
                    onConfirm={() => void closeShift()}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="cash-float">Opening float ({currency})</Label>
                <Input id="cash-float" type="number" min="0" step="0.01" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="0.00" />
                <Button onClick={() => void openShift()}>
                  <Coins /> Open shift
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Closed shifts</CardTitle>
            <CardDescription>Variance = counted − expected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {shifts.filter((shift) => shift.closedAt).length === 0 && <p className="text-sm text-muted-foreground">No closed shifts yet.</p>}
            {shifts
              .filter((shift) => shift.closedAt)
              .slice(0, 6)
              .map((shift) => (
                <div key={shift.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold">{new Date(shift.closedAt || '').toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Expected {money(shift.expectedCents || 0, currency)} · Counted {money(shift.countedCents || 0, currency)}
                    </p>
                  </div>
                  <span className={cn('font-semibold', (shift.varianceCents || 0) === 0 ? 'text-emerald-600' : 'text-destructive')}>
                    {signedMoney(shift.varianceCents || 0)}
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Day close &amp; reconciliation
            {reconciliation?.closure && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Closed {new Date(reconciliation.closure.closedAt).toLocaleDateString()}
                {reconciliation.closure.closedBy ? ` · ${reconciliation.closure.closedBy}` : ''}
              </span>
            )}
          </CardTitle>
          <CardDescription>Payments by method, credit notes and cash-drawer variance for the day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="recon-date">Date</Label>
              <Input id="recon-date" type="date" value={reconDate} onChange={(e) => setReconDate(e.target.value)} />
            </div>
            <Button variant="outline" asChild>
              <a href={paymentsExportUrl(reconDate, reconDate)} download>
                <FileDown /> Export CSV
              </a>
            </Button>
            <ConfirmDialog
              trigger={
                <Button disabled={closingDay || Boolean(reconciliation?.closure) || (reconciliation?.cashShifts.openShifts || 0) > 0}>
                  <Lock /> {reconciliation?.closure ? 'Day closed' : closingDay ? 'Closing…' : 'Close day'}
                </Button>
              }
              title={`Close ${reconDate}?`}
              description="Locks the day's sales against deletion (closure period) and snapshots the reconciliation totals."
              confirmLabel="Close day"
              onConfirm={() => void closeDay()}
            />
          </div>

          {reconciliation ? (
            <>
              <div className="space-y-1">
                {Object.entries(reconciliation.payments.byMethod).length === 0 && <p className="text-sm text-muted-foreground">No payments recorded for this day.</p>}
                {Object.entries(reconciliation.payments.byMethod).map(([method, totals]) => (
                  <div key={method} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <span className="capitalize">{method} ({totals.count})</span>
                    <span className="font-semibold">{money(totals.netCents, currency)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span>Credit notes (refunds)</span>
                <span className="font-semibold">{money(reconciliation.creditNotes.totalTtcCents, currency)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span>
                  Cash drawer · expected {money(reconciliation.cashShifts.expectedCents, currency)} · counted {money(reconciliation.cashShifts.countedCents, currency)}
                  {reconciliation.cashShifts.openShifts > 0 ? ` · ${reconciliation.cashShifts.openShifts} shift open` : ''}
                </span>
                <span className={cn('font-semibold', reconciliation.cashShifts.varianceCents === 0 ? 'text-emerald-600' : 'text-destructive')}>
                  Variance {signedMoney(reconciliation.cashShifts.varianceCents)}
                </span>
              </div>
              {reconciliation.terminal?.available ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span>
                    Terminal (Stripe) · net {money(reconciliation.terminal.netCents || 0, currency)}
                    <span className="text-muted-foreground"> · fees {money(reconciliation.terminal.feeCents || 0, currency)}</span>
                    {reconciliation.payments.byMethod.card && (
                      <span className={cn('ml-2 font-semibold', (reconciliation.terminal.netCents || 0) === reconciliation.payments.byMethod.card.netCents ? 'text-emerald-600' : 'text-destructive')}>
                        {((reconciliation.terminal.netCents || 0) - reconciliation.payments.byMethod.card.netCents) === 0
                          ? 'matches app'
                          : `difference ${signedMoney((reconciliation.terminal.netCents || 0) - reconciliation.payments.byMethod.card.netCents)}`}
                      </span>
                    )}
                  </span>
                </div>
              ) : providerConfig?.card_enabled ? (
                <p className="text-xs text-muted-foreground">Terminal settlement totals unavailable (Stripe API not reachable or test data).</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Credit notes (avoir)</CardTitle>
          <CardDescription>Issued for refunds — each has its own sequence number and VAT breakdown.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {creditNotes.length === 0 && <p className="text-sm text-muted-foreground">No credit notes issued yet.</p>}
          {creditNotes.map((note) => (
            <div key={note.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <div>
                <p className="font-semibold">Credit note #{note.number}/{note.year}</p>
                <p className="text-xs text-muted-foreground">
                  {note.receiptNumber ? `Receipt #${note.receiptNumber}/${note.receiptYear} · ` : ''}
                  {note.tableNumber != null ? `Table #${note.tableNumber} · ` : ''}
                  {new Date(note.createdAt).toLocaleString()}
                  {note.reason ? ` · ${note.reason}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{money(note.totalTtcCents, currency)}</span>
                <Button size="sm" variant="outline" onClick={() => void printCreditNote(note, currency)}>
                  <Printer /> Print
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent payments</CardTitle>
          <CardDescription>Latest {payments.length} recorded payments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded yet.</p>}
          {payments.map((payment) => {
            const remaining = payment.amountCents - payment.refundedCents
            return (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold">
                    {payment.tableNumber != null ? `Table #${payment.tableNumber}` : 'Session'} · {money(payment.amountCents, payment.currency || currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(payment.createdAt).toLocaleString()} · {payment.method}
                    {payment.refundedCents > 0 ? ` · refunded ${money(payment.refundedCents, currency)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-semibold capitalize',
                      payment.status === 'refunded' ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground',
                    )}
                  >
                    {payment.status.replace('_', ' ')}
                  </span>
                  {payment.method === 'card' && (payment.status === 'presenting' || payment.status === 'pending') && (
                    <Button size="sm" variant="outline" onClick={() => void cancelPayment(payment)}>
                      <Ban /> Cancel
                    </Button>
                  )}
                  {remaining > 0 && (
                    <Button size="sm" variant="outline" onClick={() => openRefund(payment)}>
                      <RotateCcw /> Refund {money(remaining, currency)}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Dialog open={Boolean(refundTarget)} onOpenChange={(open) => { if (!open) setRefundTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund payment</DialogTitle>
            <DialogDescription>
              {refundTarget
                ? `Refundable: ${money(refundTarget.amountCents - refundTarget.refundedCents, currency)}. Invoiced payments get a numbered VAT credit note (avoir).`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="refund-amount">Refund amount ({currency})</Label>
              <Input id="refund-amount" type="number" min="0" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="refund-reason">Reason (optional)</Label>
              <Input id="refund-reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="e.g. breakage, wrong order" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>Cancel</Button>
            <Button onClick={() => void submitRefund()}>
              <RotateCcw /> Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
