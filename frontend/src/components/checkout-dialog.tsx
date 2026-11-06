import * as React from 'react'
import { CheckCircle2, Printer, Ban, CreditCard, Loader2 } from 'lucide-react'
import { apiCancelPayment, apiCheckoutSession, apiCreateCardPayment, apiGetPayment, apiPaymentConfig, apiReconcileCardPayment, apiSessionDetail, type CheckoutReceipt, type PaymentConfig, type PaymentInput, type SessionDetail } from '@/lib/api'
import { money } from '@/lib/format'
import { printEstimateReceipt, printFinalReceipt } from '@/lib/receipts'
import { useSettings } from '@/components/settings/settings-context'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'

interface CheckoutDialogProps {
  open: boolean
  sessionId: string | null
  numberOfPlayers: number
  onClose: () => void
  onDone: () => void
}

export function CheckoutDialog({ open, sessionId, numberOfPlayers, onClose, onDone }: CheckoutDialogProps) {
  const { settings } = useSettings()
  const { t } = useI18n()
  const { toast } = useToast()
  const posEnabled = settings.pos_enabled === 'true'
  const currency = settings.currency || '$'
  const [detail, setDetail] = React.useState<SessionDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [discountType, setDiscountType] = React.useState<'%' | 'currency'>('%')
  const [discountValue, setDiscountValue] = React.useState('0')
  const [busy, setBusy] = React.useState(false)
  const [receipt, setReceipt] = React.useState<CheckoutReceipt | null>(null)
  const [payments, setPayments] = React.useState<PaymentInput[]>([])
  const [tender, setTender] = React.useState('')
  const [cardConfig, setCardConfig] = React.useState<PaymentConfig | null>(null)
  const [cardPayment, setCardPayment] = React.useState<{ paymentId: string; status: string } | null>(null)
  const [cardBusy, setCardBusy] = React.useState(false)
  const [cardAction, setCardAction] = React.useState<'cancel' | 'reconcile' | null>(null)
  const [providerRef, setProviderRef] = React.useState('')
  const [reconcileError, setReconcileError] = React.useState<string | null>(null)
  const [playerAmounts, setPlayerAmounts] = React.useState<Record<string, string>>({})
  const [checkoutConflict, setCheckoutConflict] = React.useState<string | null>(null)
  const [refreshError, setRefreshError] = React.useState<string | null>(null)
  const [checkoutBlocked, setCheckoutBlocked] = React.useState(false)
  const preserveAmountsForDetail = React.useRef<SessionDetail | null>(null)
  const dialogVersion = React.useRef(0)
  const checkoutInFlight = React.useRef(false)
  const cardInFlight = React.useRef(false)
  const cardVersion = React.useRef(0)
  const cardAttempt = React.useRef<{ sessionId: string; amountCents: number; idempotencyKey: string } | null>(null)

  React.useEffect(() => {
    const version = ++dialogVersion.current
    if (!open || !sessionId) return
    setReceipt(null)
    setPayments([])
    setTender('')
    setCardPayment(null)
    setCardBusy(false)
    setCardAction(null)
    setProviderRef('')
    setReconcileError(null)
    cardVersion.current += 1
    cardInFlight.current = false
    cardAttempt.current = null
    setDiscountValue('0')
    setDiscountType('%')
    setPlayerAmounts({})
    setCheckoutConflict(null)
    setRefreshError(null)
    setCheckoutBlocked(false)
    setBusy(false)
    checkoutInFlight.current = false
    preserveAmountsForDetail.current = null
    setLoading(true)
    void apiPaymentConfig().then((r) => {
      if (dialogVersion.current === version) setCardConfig(r.data || null)
    })
    void apiSessionDetail(sessionId).then((r) => {
      if (dialogVersion.current !== version) return
      setDetail(r.data || null)
      setLoading(false)
    })
    return () => { dialogVersion.current += 1 }
  }, [open, sessionId])

  const tableCharge = detail?.tableCharge || 0
  const items = detail?.items || []
  const itemsTotal = items.reduce((sum, i) => sum + (i.totalCents || 0), 0)
  const subtotal = tableCharge + itemsTotal
  const rawDiscount = Number(discountValue) || 0
  const discountCents = Math.min(subtotal, Math.round(discountType === '%' ? (subtotal * rawDiscount) / 100 : rawDiscount * 100))
  const total = Math.max(0, subtotal - discountCents)
  const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0)
  const remainingCents = Math.max(0, total - paidCents)
  const paymentsOverLimit = paidCents > total
  const playerRows = React.useMemo(() => {
    const active = (detail?.players || []).filter((player) => player.status !== 'settled' && !player.leftAt)
    if (active.length > 0) return active
    return Array.from({ length: Math.max(0, Math.round(numberOfPlayers)) }, (_, index) => ({
      id: `seat-${index + 1}`,
      playerNumber: index + 1,
      isSubscriber: false,
      shareCents: 0,
    }))
  }, [detail, numberOfPlayers])

  // Rebuild the default allocation whenever the bill total changes (for example
  // after applying a discount). Manual edits are preserved while the total is stable.
  React.useEffect(() => {
    if (preserveAmountsForDetail.current === detail && detail) {
      preserveAmountsForDetail.current = null
      return
    }
    preserveAmountsForDetail.current = null
    if (!detail || playerRows.length === 0) {
      setPlayerAmounts({})
      return
    }
    const hasSeatShares = (detail.players || []).length > 0
    const itemShares = splitCents(itemsTotal, playerRows.length)
    const weights = hasSeatShares
      ? playerRows.map((player, index) => (player.shareCents || 0) + itemShares[index])
      : playerRows.map(() => 0)
    const amounts = hasSeatShares ? allocateByWeights(weights, total) : splitCents(total, playerRows.length)
    setPlayerAmounts(Object.fromEntries(playerRows.map((player, index) => [player.id, (amounts[index] / 100).toFixed(2)])))
  }, [detail, total, itemsTotal, numberOfPlayers])

  const playerAmountsTotal = playerRows.reduce((sum, player) => {
    const amount = Math.max(0, Math.round((parseFloat(playerAmounts[player.id] || '0') || 0) * 100))
    return sum + amount
  }, 0)
  const playerAmountsOverLimit = playerRows.length > 0 && playerAmountsTotal > total
  const playerAmountsUnassigned = Math.max(0, total - playerAmountsTotal)

  const splitEven = () => {
    if (playerRows.length === 0) return
    const amounts = splitCents(total, playerRows.length)
    setPlayerAmounts(Object.fromEntries(playerRows.map((player, index) => [player.id, (amounts[index] / 100).toFixed(2)])))
  }

  const addCardTerminalPayment = async () => {
    if (!sessionId || remainingCents <= 0 || cardPayment || cardInFlight.current) return
    const previousAttempt = cardAttempt.current
    if (previousAttempt && (previousAttempt.sessionId !== sessionId || previousAttempt.amountCents !== remainingCents)) {
      toast({ title: 'Card payment failed', description: t('Retry the previous card payment before changing the amount.'), variant: 'error' })
      return
    }
    const amountCents = remainingCents
    const idempotencyKey = previousAttempt?.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `card-${Date.now()}`)
    const version = dialogVersion.current
    cardAttempt.current = { sessionId, amountCents, idempotencyKey }
    setProviderRef('')
    setReconcileError(null)
    cardInFlight.current = true
    setCardBusy(true)
    try {
      const result = await apiCreateCardPayment(sessionId, amountCents, idempotencyKey)
      if (dialogVersion.current !== version) return
      const paymentId = result.data?.paymentId
      if (paymentId) {
        const status = result.data?.status || 'unknown'
        if (status === 'captured') {
          setCardPayment(null)
          cardAttempt.current = null
          setPayments((current) => current.some((payment) => payment.paymentId === paymentId) ? current : [...current, { method: 'card', amountCents, paymentId }])
          toast({ title: t('Card payment captured') })
        } else if (status === 'canceled' || status === 'creation_rejected') {
          setCardPayment(null)
          cardAttempt.current = null
          toast({ title: status === 'canceled' ? t('Card payment canceled') : t('Card payment failed') })
        } else {
          setCardPayment({ paymentId, status })
          if (result.ok) toast({ title: t('Present card on the terminal…') })
          else toast({ title: t('Checking card payment status…'), description: result.error })
        }
      } else {
        if (result.status > 0 && result.status < 500) cardAttempt.current = null
        toast({
          title: 'Card payment failed',
          description: result.error === 'card_not_configured'
            ? t('No card terminal is configured on the server.')
            : result.error || `Error ${result.status}`,
          variant: 'error',
        })
      }
    } catch (err) {
      if (dialogVersion.current === version) toast({ title: 'Card payment failed', description: err instanceof Error ? err.message : 'Network error', variant: 'error' })
    } finally {
      if (dialogVersion.current === version) {
        cardInFlight.current = false
        setCardBusy(false)
      }
    }
  }

  const cancelCardPayment = async () => {
    if (!cardPayment || cardInFlight.current) return
    const version = dialogVersion.current
    cardVersion.current += 1
    cardInFlight.current = true
    setCardBusy(true)
    setCardAction('cancel')
    try {
      const result = await apiCancelPayment(cardPayment.paymentId)
      if (dialogVersion.current !== version) return
      if (result.ok && result.data) {
        if (result.data.status === 'captured') {
          const paymentId = result.data.id
          setCardPayment(null)
          cardAttempt.current = null
          setProviderRef('')
          setReconcileError(null)
          setPayments((current) => current.some((payment) => payment.paymentId === paymentId) ? current : [...current, { method: 'card', amountCents: result.data!.amountCents, paymentId }])
          toast({ title: t('Card payment captured') })
        } else if (result.data.status === 'canceled') {
          setCardPayment(null)
          cardAttempt.current = null
          setProviderRef('')
          setReconcileError(null)
          toast({ title: t('Card payment canceled') })
        } else {
          setCardPayment({ paymentId: result.data.id, status: result.data.status })
        }
      } else {
        toast({ title: 'Failed to cancel', description: result.error || `Error ${result.status}`, variant: 'error' })
      }
    } catch (err) {
      if (dialogVersion.current === version) toast({ title: 'Failed to cancel', description: err instanceof Error ? err.message : 'Network error', variant: 'error' })
    } finally {
      if (dialogVersion.current === version) {
        cardInFlight.current = false
        setCardBusy(false)
        setCardAction(null)
      }
    }
  }

  const reconcileCardPayment = async () => {
    if (!cardPayment || !['pending', 'unknown'].includes(cardPayment.status) || cardInFlight.current) return
    const paymentId = cardPayment.paymentId
    const version = dialogVersion.current
    cardVersion.current += 1
    cardInFlight.current = true
    setCardBusy(true)
    setCardAction('reconcile')
    setReconcileError(null)
    try {
      const result = await apiReconcileCardPayment(paymentId, providerRef.trim() || undefined)
      if (dialogVersion.current !== version) return
      const payment = result.data
      if (result.ok && payment?.id === paymentId && payment.status === 'captured') {
        setCardPayment(null)
        cardAttempt.current = null
        setProviderRef('')
        setPayments((current) => current.some((item) => item.paymentId === paymentId) ? current : [...current, { method: 'card', amountCents: payment.amountCents, paymentId }])
        toast({ title: t('Card payment captured') })
      } else if (result.ok && payment?.id === paymentId && ['canceled', 'creation_rejected', 'refunded'].includes(payment.status)) {
        setCardPayment(null)
        cardAttempt.current = null
        setProviderRef('')
        toast({ title: payment.status === 'canceled' ? t('Card payment canceled') : t('Card payment failed'), description: `Status: ${payment.status}` })
      } else {
        if (payment?.id === paymentId && ['presenting', 'pending', 'unknown'].includes(payment.status)) {
          setCardPayment((current) => current?.status === payment.status ? current : { paymentId, status: payment.status })
        }
        setReconcileError(`${t('Card payment is still unresolved. Verify the payment before taking another payment.')} ${result.error || `Error ${result.status}`}`)
      }
    } catch (err) {
      if (dialogVersion.current === version) setReconcileError(`${t('Card payment is still unresolved. Verify the payment before taking another payment.')} ${err instanceof Error ? err.message : 'Network error'}`)
    } finally {
      if (dialogVersion.current === version) {
        cardInFlight.current = false
        setCardBusy(false)
        setCardAction(null)
      }
    }
  }

  const addCashPayment = (exact = false) => {
    const tendered = exact ? remainingCents : Math.round(parseFloat(tender || '0') * 100)
    if (!Number.isFinite(tendered) || tendered <= 0) return
    const applied = Math.min(tendered, remainingCents)
    if (applied <= 0) return
    setPayments((current) => [...current, { method: 'cash', amountCents: applied, tenderedCents: tendered > applied ? tendered : undefined }])
    setTender('')
  }

  // Poll the card payment while the reader is waiting for the customer.
  React.useEffect(() => {
    if (!cardPayment || cardBusy || !['presenting', 'pending', 'unknown', 'failed'].includes(cardPayment.status) || !sessionId) return
    const paymentId = cardPayment.paymentId
    const version = dialogVersion.current
    const operation = cardVersion.current
    let active = true
    let polling = false
    const poll = async () => {
      if (!active || polling) return
      polling = true
      try {
        const res = await apiGetPayment(paymentId)
        if (!active || dialogVersion.current !== version || cardVersion.current !== operation) return
        if (res.ok && res.data) {
          const status = res.data.status
          if (status === 'captured') {
            active = false
            window.clearInterval(timer)
            setCardPayment(null)
            cardAttempt.current = null
            setProviderRef('')
            setReconcileError(null)
            setPayments((current) => current.some((payment) => payment.paymentId === paymentId) ? current : [...current, { method: 'card', amountCents: res.data!.amountCents, paymentId }])
            toast({ title: t('Card payment captured') })
          } else if (['presenting', 'pending', 'unknown', 'failed'].includes(status)) {
            if (status !== cardPayment.status) setCardPayment({ paymentId, status })
          } else {
            active = false
            window.clearInterval(timer)
            if (status === 'canceled' || status === 'refunded' || status === 'creation_rejected') {
              setCardPayment(null)
              cardAttempt.current = null
              setProviderRef('')
              setReconcileError(null)
            } else {
              setCardPayment({ paymentId, status })
            }
            toast({
              title: status === 'canceled' ? t('Card payment canceled') : t('Card payment failed'),
              description: `Status: ${status}`,
              variant: status === 'canceled' ? 'success' : 'error',
            })
          }
        }
      } catch {
        /* keep polling */
      } finally {
        polling = false
      }
    }
    const timer = window.setInterval(() => void poll(), 2000)
    void poll()
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [cardPayment, cardBusy, sessionId, toast])

  const refreshAfterConflict = async (id: string, version: number) => {
    onDone()
    try {
      const result = await apiSessionDetail(id)
      if (dialogVersion.current !== version) return
      if (result.ok && result.data?.session?.status === 'active') {
        if (result.data !== detail) {
          preserveAmountsForDetail.current = result.data
          setDetail(result.data)
        }
        setRefreshError(null)
        setCheckoutBlocked(false)
      } else if (result.ok && result.data?.session) {
        setRefreshError(t('The session is no longer active. Verify its status and payments before taking further action.'))
      } else {
        setRefreshError(t('Could not refresh the session. Retry refresh before attempting checkout.'))
      }
    } catch {
      if (dialogVersion.current === version) setRefreshError(t('Could not refresh the session. Retry refresh before attempting checkout.'))
    }
  }

  const retryRefresh = async () => {
    if (!sessionId || busy) return
    const version = dialogVersion.current
    setBusy(true)
    await refreshAfterConflict(sessionId, version)
    if (dialogVersion.current === version) setBusy(false)
  }

  const complete = async () => {
    if (!sessionId || checkoutInFlight.current || checkoutBlocked || cardPayment || cardBusy) return
    const version = dialogVersion.current
    checkoutInFlight.current = true
    setBusy(true)
    setCheckoutConflict(null)
    setRefreshError(null)
    try {
      const result = await apiCheckoutSession(sessionId, discountCents, posEnabled ? payments : undefined)
      if (dialogVersion.current !== version) {
        if ((result.ok && result.data?.receiptNumber != null) || result.status === 409) onDone()
        return
      }
      if (result.ok && result.data?.receiptNumber != null) {
        setReceipt(result.data)
        toast({ title: t('Invoice created'), description: `#${result.data.receiptNumber}/${result.data.year}` })
        onDone()
        return
      }
      if (result.status === 409) {
        const message = result.error === 'session_not_active'
          ? t('The session is no longer active. Verify its status and payments before taking further action.')
          : `${t('Checkout conflicted with the current session. Verify its status and payments before retrying.')} (${result.error || 'HTTP 409'})`
        setCheckoutConflict(message)
        setCheckoutBlocked(true)
        toast({ title: t('Checkout failed'), description: message, variant: 'error' })
        await refreshAfterConflict(sessionId, version)
        return
      }
      toast({ title: t('Checkout failed'), description: result.error || `Error ${result.status}`, variant: 'error' })
    } catch (err) {
      if (dialogVersion.current === version) {
        toast({ title: t('Checkout failed'), description: err instanceof Error ? err.message : 'Network error', variant: 'error' })
      }
    } finally {
      if (dialogVersion.current === version) {
        checkoutInFlight.current = false
        setBusy(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{receipt ? `Invoice #${receipt.receiptNumber}/${receipt.year}` : t('Checkout')}</DialogTitle>
          <DialogDescription>
            {receipt ? 'Payment complete. The session has ended.' : t('Review the tab, apply a discount if needed and complete payment.')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <DialogBody>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </DialogBody>
        ) : receipt ? (
          <>
            <DialogBody className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> VAT {money(receipt.vatCents, currency)} · Total HT {money(receipt.totalTtcCents - receipt.vatCents, currency)}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm font-semibold">{t('TOTAL (TTC)')}</span>
                <span className="text-xl font-extrabold">{money(receipt.totalTtcCents, currency)}</span>
              </div>
              {receipt.payments && receipt.payments.length > 0 && (
                <div className="space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  {receipt.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between">
                      <span className="capitalize">{t('Paid ({method})', { method: payment.method })}</span>
                      <span className="font-semibold">{money(payment.amountCents, currency)}</span>
                    </div>
                  ))}
                  {receipt.payments.some((p) => (p.details?.changeCents || 0) > 0) && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t('Change due')}</span>
                      <span>{money(receipt.payments.reduce((sum, p) => sum + (p.details?.changeCents || 0), 0), currency)}</span>
                    </div>
                  )}
                </div>
              )}
              {receipt.discountCents > 0 && (
                <p className="text-sm text-muted-foreground">Discount applied: -{money(receipt.discountCents, currency)}</p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => void printFinalReceipt(receipt, currency, detail)}>
                <Printer /> {t('Print invoice')}
              </Button>
              <Button
                onClick={() => {
                  onClose()
                  onDone()
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogBody className="space-y-4">
              {checkoutConflict && (
                <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <p>{checkoutConflict}</p>
                  {refreshError && <p>{refreshError}</p>}
                  {checkoutBlocked && (
                    <Button variant="outline" size="sm" onClick={() => void retryRefresh()} disabled={busy}>
                      {t('Retry refresh')}
                    </Button>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {tableCharge > 0 && (
                  <LineRow label={t('Table Time')} sub={t('{hours}h charged', { hours: Math.ceil((detail?.session ? (Date.now() - new Date(detail.session.startedAt).getTime()) / 3600000 : 1)) })} value={money(tableCharge, currency)} />
                )}
                {items.map((item) => (
                  <LineRow
                    key={item.id}
                    label={item.description}
                    sub={`${item.quantity} × ${money(item.unitPrice, currency)}`}
                    value={money(item.totalCents, currency)}
                  />
                ))}
                {tableCharge === 0 && items.length === 0 && <p className="text-sm text-muted-foreground">{t('This tab is empty.')}</p>}
              </div>

              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[140px_1fr]">
                <div className="space-y-1.5">
                  <Label>{t('Discount type')}</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as '%' | 'currency')} disabled={payments.length > 0 || Boolean(cardPayment) || cardBusy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="%">{t('Percent (%)')}</SelectItem>
                      <SelectItem value="currency">{t('Fixed ({currency})', { currency })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discount-value">{discountType === '%' ? t('Discount %') : t('Discount ({currency})', { currency })}</Label>
                  <Input id="discount-value" type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <SummaryRow label={t('Subtotal (TTC)')} value={money(subtotal, currency)} />
                <SummaryRow label={t('Discount')} value={'-' + money(discountCents, currency)} accent />
                <div className="flex items-center justify-between border-t pt-2 text-base font-extrabold">
                  <span>{t('TOTAL (TTC)')}</span>
                  <span>{money(total, currency)}</span>
                </div>
              </div>

              {playerRows.length > 0 && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>{t('Players')}</Label>
                    {playerRows.length > 1 && (
                      <Button size="sm" variant="outline" onClick={splitEven} disabled={payments.length > 0 || Boolean(cardPayment) || cardBusy}>
                        {t('Split even')}
                      </Button>
                    )}
                  </div>
                  {playerRows.map((player) => (
                    <div key={player.id} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm">
                        {t('Player {number}', { number: player.playerNumber })}
                        {player.isSubscriber && (
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                            {t('Subscriber')}
                          </span>
                        )}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        max={(total / 100).toFixed(2)}
                        className="w-28 text-right"
                        value={playerAmounts[player.id] ?? ''}
                        disabled={payments.length > 0 || Boolean(cardPayment) || cardBusy}
                        onChange={(event) => setPlayerAmounts((current) => ({ ...current, [player.id]: event.target.value }))}
                      />
                    </div>
                  ))}
                  {playerAmountsOverLimit ? (
                    <p className="text-xs text-destructive">{t('Player amounts cannot exceed the total due.')}</p>
                  ) : playerAmountsUnassigned > 0 ? (
                    <p className="text-xs text-muted-foreground">{t('Unassigned: {amount}', { amount: money(playerAmountsUnassigned, currency) })}</p>
                  ) : null}
                </div>
              )}

              {posEnabled && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{t('Payments (cash)')}</span>
                    <span className={paymentsOverLimit ? 'text-destructive' : remainingCents === 0 ? 'text-emerald-600' : ''}>
                      {paymentsOverLimit ? t('Payments exceed the total due.') : remainingCents === 0 ? t('Fully paid') : t('Remaining {amount}', { amount: money(remainingCents, currency) })}
                    </span>
                  </div>

                  {payments.length > 0 && (
                    <div className="space-y-1">
                      {payments.map((payment, index) => (
                        <div key={index} className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5 text-sm">
                          <span className="capitalize">{payment.method}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold">{money(payment.amountCents, currency)}</span>
                            {payment.tenderedCents != null && payment.tenderedCents > payment.amountCents && (
                              <span className="text-xs text-muted-foreground">
                                change {money(payment.tenderedCents - payment.amountCents, currency)}
                              </span>
                            )}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setPayments((current) => current.filter((_, i) => i !== index))}
                              disabled={payment.method === 'card'}
                              aria-label="Remove payment"
                            >
                              ×
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {cardPayment && (
                    <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {reconcileError && cardPayment.status === 'presenting'
                          ? t('Check the terminal; payment status is still unresolved.')
                          : ['pending', 'unknown'].includes(cardPayment.status) ? t('Checking card payment status…') : t('Present card on the terminal…')}
                      </span>
                      <Button variant="outline" size="sm" aria-label="Cancel card payment" onClick={() => void cancelCardPayment()} disabled={cardBusy}>
                        <Ban /> {cardAction === 'cancel' ? t('Canceling card payment…') : t('Cancel')}
                      </Button>
                    </div>
                  )}

                  {cardPayment && ['pending', 'unknown'].includes(cardPayment.status) && (
                    <div className="space-y-2 rounded-md border bg-background px-3 py-2 text-sm">
                      <p>{t('Reconcile the original reservation using its idempotency key. This may recover or create the original payment, not a separate charge.')}</p>
                      <Input
                        aria-label="Provider reference"
                        placeholder={t('Verified provider reference (optional)')}
                        value={providerRef}
                        disabled={cardBusy}
                        onChange={(event) => setProviderRef(event.target.value)}
                      />
                      <Button variant="outline" size="sm" aria-label="Reconcile card payment" onClick={() => void reconcileCardPayment()} disabled={cardBusy}>
                        {cardAction === 'reconcile' ? t('Reconciling card payment…') : t('Reconcile card payment')}
                      </Button>
                    </div>
                  )}
                  {cardPayment && reconcileError && <p role="alert" className="text-sm text-destructive">{reconcileError}</p>}

                  {cardPayment && ['failed', 'canceled'].includes(cardPayment.status) && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      Card payment {cardPayment.status === 'canceled' ? 'canceled' : 'failed'} — verify its status before taking another payment.
                    </div>
                  )}

                  {remainingCents > 0 && !cardPayment && cardConfig?.card_enabled && (
                    <Button variant="outline" onClick={() => void addCardTerminalPayment()} disabled={cardBusy}>
                      <CreditCard /> {t('Card (terminal)', { amount: money(remainingCents, currency) })} — {money(remainingCents, currency)}
                    </Button>
                  )}

                  {remainingCents > 0 && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t('Cash received ({currency})', { currency })}
                        value={tender}
                        disabled={Boolean(cardPayment) || cardBusy}
                        onChange={(e) => setTender(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addCashPayment()
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => addCashPayment()} disabled={!tender || Boolean(cardPayment) || cardBusy}>
                          {t('Add payment')}
                        </Button>
                        <Button variant="secondary" onClick={() => addCashPayment(true)} disabled={Boolean(cardPayment) || cardBusy}>
                          {t('Exact {amount}', { amount: money(remainingCents, currency) })}
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('Card terminal integration arrives in a later phase.')}</p>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                variant="outline"
                className="sm:mr-auto"
                onClick={() =>
                  void printEstimateReceipt(
                    detail,
                    tableCharge,
                    items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, totalCents: i.totalCents, vatRatePercent: i.vatRatePercent })),
                    discountCents,
                    currency,
                  )
                }
              >
                <Printer /> {t('Print estimate')}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <ConfirmDialog
                trigger={
                  <Button disabled={busy || cardBusy || Boolean(cardPayment) || checkoutBlocked || playerAmountsOverLimit || (posEnabled && paidCents !== total)}>
                    {busy ? t('Processing…') : t('Complete checkout')}
                  </Button>
                }
                title={t('Complete payment and end session?')}
                description={
                  posEnabled
                    ? `${t('Payments')}: ${payments.map((p) => money(p.amountCents, currency)).join(' + ') || money(total, currency)}. The session will end and an invoice will be issued.`
                    : t('Total due: {amount}. The session will end and an invoice will be issued.', { amount: money(total, currency) })
                }
                confirmLabel="Complete payment"
                variant="default"
                onConfirm={() => void complete()}
              />
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function splitCents(totalCents: number, count: number): number[] {
  if (count <= 0) return []
  const safeTotal = Math.max(0, Math.round(totalCents))
  const base = Math.floor(safeTotal / count)
  let remainder = safeTotal - base * count
  return Array.from({ length: count }, () => {
    const value = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1
    return value
  })
}

function allocateByWeights(weights: number[], totalCents: number): number[] {
  if (weights.length === 0) return []
  const safeTotal = Math.max(0, Math.round(totalCents))
  const weightTotal = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0)
  if (weightTotal <= 0) return splitCents(safeTotal, weights.length)
  let allocated = 0
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return safeTotal - allocated
    const share = Math.round((safeTotal * Math.max(0, weight)) / weightTotal)
    allocated += share
    return share
  })
}

function LineRow({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? 'font-semibold text-emerald-600' : 'font-semibold'}>{value}</span>
    </div>
  )
}
