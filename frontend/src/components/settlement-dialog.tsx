import * as React from 'react'
import { Printer, UserMinus } from 'lucide-react'
import { apiSessionDetail, apiSessionSettle, apiSetPlayerCount, type SessionDetail } from '@/lib/api'
import { money } from '@/lib/format'
import { printSettlementReceipt } from '@/lib/receipts'
import { useSettings } from '@/components/settings/settings-context'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface SettlementDialogProps {
  open: boolean
  sessionId: string | null
  numberOfPlayers: number
  onClose: () => void
  onDone: () => void
}

export function SettlementDialog({ open, sessionId, numberOfPlayers, onClose, onDone }: SettlementDialogProps) {
  const { settings } = useSettings()
  const { t } = useI18n()
  const { toast } = useToast()
  const currency = settings.currency || '$'
  const [detail, setDetail] = React.useState<SessionDetail | null>(null)
  const [tableOption, setTableOption] = React.useState<'none' | 'share' | 'full'>('none')
  const [isSubscriber, setIsSubscriber] = React.useState(false)
  const [quantities, setQuantities] = React.useState<Record<string, number>>({})
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open || !sessionId) return
    setTableOption('none')
    setIsSubscriber(false)
    setQuantities({})
    void apiSessionDetail(sessionId).then((r) => setDetail(r.data || null))
  }, [open, sessionId])

  const items = detail?.items || []
  const tableCharge = detail?.tableCharge || 0
  const subscriberCount = detail?.session?.subscriberCount ?? 0
  const nonSubscriberCount = Math.max(1, numberOfPlayers - subscriberCount)
  const tableSettlement =
    tableOption === 'none' ? 0 : tableOption === 'full' ? tableCharge : Math.round(tableCharge / nonSubscriberCount)

  const selectedItems = items
    .filter((i) => (quantities[i.id] || 0) > 0)
    .map((i) => ({ itemId: i.id, quantity: quantities[i.id] }))
  const selectedTotal = items.reduce((sum, i) => sum + (quantities[i.id] || 0) * i.unitPrice, 0)

  const settle = async () => {
    if (!sessionId) return
    setBusy(true)
    const result = await apiSessionSettle(sessionId, {
      tableSettlementCents: tableSettlement,
      items: selectedItems,
      isSubscriber,
    })
    if (!result.ok) {
      setBusy(false)
      toast({ title: t('Settlement failed'), description: result.error || `Error ${result.status}`, variant: 'error' })
      return
    }
    const next = Math.max(1, numberOfPlayers - 1)
    const patched = await apiSetPlayerCount(sessionId, next)
    if (!patched.ok) console.warn('Failed to update player count after settlement')
    setBusy(false)
    toast({ title: t('Player settled') })
    onClose()
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('Player Settlement')}</DialogTitle>
          <DialogDescription>{t('Settle one player\'s share — table time and selected items.')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <label className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <Switch checked={isSubscriber} onCheckedChange={setIsSubscriber} />
            <span className="text-sm font-medium">{t('This player is a subscriber')}</span>
          </label>

          {tableCharge > 0 && (
            <div className="space-y-2">
              <Label>{t('Table Time')}</Label>
              {(
                [
                  ['none', t('Do not settle table time')],
                  ['share', t('Player share ({amount})', { amount: money(Math.round(tableCharge / nonSubscriberCount), currency) })],
                  ['full', t('Full table charge ({amount})', { amount: money(tableCharge, currency) })],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    tableOption === value ? 'border-primary/60 bg-accent/60' : 'bg-muted/20',
                  )}
                >
                  <input type="radio" name="tableOption" checked={tableOption === value} onChange={() => setTableOption(value)} />
                  {label}
                </label>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              <Label>{t('Items to settle')}</Label>
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {money(item.unitPrice, currency)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity}
                    className="w-20"
                    value={quantities[item.id] ?? 0}
                    onChange={(e) => {
                      const qty = Math.max(0, Math.min(item.quantity, parseInt(e.target.value || '0', 10)))
                      setQuantities((q) => ({ ...q, [item.id]: qty }))
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-accent/60 px-3 py-2 text-sm font-semibold">
            <span>{t('Settlement total')}</span>
            <span>{money(tableSettlement + selectedTotal, currency)}</span>
          </div>
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => void printSettlementReceipt(tableSettlement, selectedItems, items, currency, sessionId || '')}
          >
            <Printer /> {t('Print receipt')}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button disabled={busy} onClick={() => void settle()}>
              <UserMinus /> {busy ? t('Settling…') : t('Settle player')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
