import * as React from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import { apiCheckoutSession, apiEndSession, apiSessionDetail, type CheckoutReceipt, type SessionDetail } from '@/lib/api'
import { money } from '@/lib/format'
import { printEstimateReceipt, printFinalReceipt } from '@/lib/receipts'
import { useSettings } from '@/components/settings/settings-context'
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
  const { toast } = useToast()
  const currency = settings.currency || '$'
  const [detail, setDetail] = React.useState<SessionDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [discountType, setDiscountType] = React.useState<'%' | 'currency'>('%')
  const [discountValue, setDiscountValue] = React.useState('0')
  const [busy, setBusy] = React.useState(false)
  const [receipt, setReceipt] = React.useState<CheckoutReceipt | null>(null)

  React.useEffect(() => {
    if (!open || !sessionId) return
    setReceipt(null)
    setDiscountValue('0')
    setDiscountType('%')
    setLoading(true)
    void apiSessionDetail(sessionId).then((r) => {
      setDetail(r.data || null)
      setLoading(false)
    })
  }, [open, sessionId])

  const tableCharge = detail?.tableCharge || 0
  const items = detail?.items || []
  const subtotal = tableCharge + items.reduce((sum, i) => sum + (i.totalCents || 0), 0)
  const rawDiscount = Number(discountValue) || 0
  const discountCents = Math.min(subtotal, Math.round(discountType === '%' ? (subtotal * rawDiscount) / 100 : rawDiscount * 100))
  const total = Math.max(0, subtotal - discountCents)
  const perPlayer = numberOfPlayers > 1 ? total / numberOfPlayers : null

  const complete = async () => {
    if (!sessionId) return
    setBusy(true)
    const result = await apiCheckoutSession(sessionId, discountCents)
    setBusy(false)
    if (result.ok && result.data?.receiptNumber != null) {
      setReceipt(result.data)
      toast({ title: 'Invoice created', description: `#${result.data.receiptNumber}/${result.data.year}` })
      onDone()
      return
    }
    if (result.status === 409) {
      // Session already not active: fall back to ending it, mirroring the classic flow
      await apiEndSession(sessionId)
      toast({ title: 'Session ended' })
      onClose()
      onDone()
      return
    }
    toast({ title: 'Checkout failed', description: result.error || `Error ${result.status}`, variant: 'error' })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{receipt ? `Invoice #${receipt.receiptNumber}/${receipt.year}` : 'Checkout'}</DialogTitle>
          <DialogDescription>
            {receipt ? 'Payment complete. The session has ended.' : 'Review the tab, apply a discount if needed and complete payment.'}
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
                <span className="text-sm font-semibold">TOTAL (TTC)</span>
                <span className="text-xl font-extrabold">{money(receipt.totalTtcCents, currency)}</span>
              </div>
              {receipt.discountCents > 0 && (
                <p className="text-sm text-muted-foreground">Discount applied: -{money(receipt.discountCents, currency)}</p>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => void printFinalReceipt(receipt, currency, detail)}>
                <Printer /> Print invoice
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
              <div className="space-y-2">
                {tableCharge > 0 && (
                  <LineRow label="Table Time" sub={`${Math.ceil((detail?.session ? (Date.now() - new Date(detail.session.startedAt).getTime()) / 3600000 : 1))}h charged`} value={money(tableCharge, currency)} />
                )}
                {items.map((item) => (
                  <LineRow
                    key={item.id}
                    label={item.description}
                    sub={`${item.quantity} × ${money(item.unitPrice, currency)}`}
                    value={money(item.totalCents, currency)}
                  />
                ))}
                {tableCharge === 0 && items.length === 0 && <p className="text-sm text-muted-foreground">This tab is empty.</p>}
              </div>

              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[140px_1fr]">
                <div className="space-y-1.5">
                  <Label>Discount type</Label>
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as '%' | 'currency')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="%">Percent (%)</SelectItem>
                      <SelectItem value="currency">Fixed ({currency})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discount-value">{discountType === '%' ? 'Discount %' : `Discount (${currency})`}</Label>
                  <Input id="discount-value" type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <SummaryRow label="Subtotal (TTC)" value={money(subtotal, currency)} />
                <SummaryRow label="Discount" value={'-' + money(discountCents, currency)} accent />
                <div className="flex items-center justify-between border-t pt-2 text-base font-extrabold">
                  <span>TOTAL (TTC)</span>
                  <span>{money(total, currency)}</span>
                </div>
                {perPlayer != null && (
                  <p className="pt-1 text-center text-sm text-muted-foreground">
                    {numberOfPlayers} players · {money(perPlayer, currency)} per person
                  </p>
                )}
              </div>
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
                <Printer /> Print estimate
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <ConfirmDialog
                trigger={<Button disabled={busy}>{busy ? 'Processing…' : 'Complete checkout'}</Button>}
                title="Complete payment and end session?"
                description={`Total due: ${money(total, currency)}. The session will end and an invoice will be issued.`}
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
