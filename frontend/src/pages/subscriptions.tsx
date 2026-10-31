import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Trash2, Users } from 'lucide-react'
import { apiCreateSubscription, apiDeleteSubscription, apiRenewSubscription, apiSubscriptions, type Subscription } from '@/lib/api'
import { money } from '@/lib/format'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

const DAY_MS = 1000 * 60 * 60 * 24

export function SubscriptionsPage() {
  const { settings } = useSettings()
  const { toast } = useToast()
  const { t } = useI18n()
  const currency = settings.currency || '$'
  const [subs, setSubs] = React.useState<Subscription[]>([])
  const [patron, setPatron] = React.useState('')
  const [fee, setFee] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    const result = await apiSubscriptions()
    setSubs(result.data || [])
    setLoading(false)
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patron.trim()) return
    const result = await apiCreateSubscription({
      patron_name: patron.trim(),
      patron_email: patron.trim().toLowerCase().replace(/\s+/g, '.') + '@patron.local',
      monthly_fee_cents: Math.round(parseFloat(fee || '0') * 100),
    })
    if (!result.ok) return toast({ title: t('Failed to add subscription'), variant: 'error' })
    toast({ title: t('Subscription added') })
    setPatron('')
    setFee('')
    await load()
  }

  const renew = async (id: string) => {
    const result = await apiRenewSubscription(id)
    if (!result.ok) return toast({ title: t('Failed to renew'), variant: 'error' })
    toast({ title: t('Subscription renewed') })
    await load()
  }

  const remove = async (id: string) => {
    const result = await apiDeleteSubscription(id)
    if (!result.ok) return toast({ title: t('Failed to delete'), variant: 'error' })
    toast({ title: t('Subscription deleted') })
    await load()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Admin')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('Subscriptions')}</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> {t('Add subscription')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="patron">{t('Patron name')}</Label>
              <Input id="patron" value={patron} onChange={(e) => setPatron(e.target.value)} placeholder="Jane Doe" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee">{t('Monthly fee ({currency})', { currency })}</Label>
              <Input id="fee" type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="30.00" required />
            </div>
            <Button type="submit">{t('Add Subscription')}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('Patrons')}</CardTitle>
          <CardDescription>{loading ? t('Loading…') : subs.length === 1 ? t('{count} subscription', { count: subs.length }) : t('{count} subscriptions', { count: subs.length })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!loading && subs.length === 0 && <p className="text-sm text-muted-foreground">{t('No subscriptions yet.')}</p>}
          {subs.map((s) => {
            const days = Math.floor((Date.now() - new Date(s.active_from).getTime()) / DAY_MS)
            const due = days >= 30
            return (
              <div
                key={s.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2',
                  due ? 'border-destructive/40 bg-destructive/[0.06]' : 'bg-muted/30',
                )}
              >
                <div className="min-w-0">
                  <p className={cn('truncate text-sm font-semibold', due && 'text-destructive')}>{s.patronName || t('Unknown')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('{amount}/month · started {date} ({days} days ago)', { amount: money(s.monthly_fee_cents, currency), date: new Date(s.active_from).toLocaleDateString(), days })}
                    {due && ` · ${t('DUE FOR RENEWAL')}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {due && (
                    <Button size="sm" onClick={() => void renew(s.id)}>
                      <RefreshCw /> {t('Renew')}
                    </Button>
                  )}
                  <ConfirmDialog
                    trigger={
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={t('Delete subscription')}>
                        <Trash2 />
                      </Button>
                    }
                    title={t('Delete subscription?')}
                    description={t('{name} will lose their subscription.', { name: s.patronName || t('This patron will lose their subscription.') })}
                    confirmLabel={t('Delete subscription')}
                    onConfirm={() => void remove(s.id)}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
