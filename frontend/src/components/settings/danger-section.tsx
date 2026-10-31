import * as React from 'react'
import { TriangleAlert } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { apiClearHistory } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function DangerSection({ className }: { className?: string }) {
  const { refresh } = useSettings()
  const { toast } = useToast()
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<1 | 2>(1)
  const [busy, setBusy] = React.useState(false)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setStep(1)
  }

  const run = async () => {
    setBusy(true)
    const result = await apiClearHistory()
    setBusy(false)
    if (result.ok) {
      toast({ title: t('Session history cleared') })
      setOpen(false)
      setStep(1)
      void refresh()
    } else {
      toast({ title: t('Failed to clear history'), description: result.error || `Error ${result.status}`, variant: 'error' })
    }
  }

  return (
    <SectionCard
      className={className}
      icon={TriangleAlert}
      title={t('Danger Zone')}
      description={t('Irreversible, data-destroying actions. Think twice before proceeding.')}
      danger
    >
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">{t('Clear All Session History')}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{step === 1 ? t('Delete all session history?') : t('Final confirmation')}</AlertDialogTitle>
            <AlertDialogDescription>
              {step === 1
                ? t('This will permanently delete ALL session history and tab data. This action cannot be undone.')
                : t('This will delete all historical data forever. Closed accounting periods are preserved. This cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{step === 1 ? t('Cancel') : t('Back')}</AlertDialogCancel>
            {step === 1 ? (
              <AlertDialogAction
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault()
                  setStep(2)
                }}
              >
                {t('Continue')}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                variant="destructive"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault()
                  void run()
                }}
              >
                {busy ? t('Deleting…') : t('Yes, delete everything')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('Deletes all completed sessions, tab items, and history. Active sessions will not be affected.')}
      </p>
    </SectionCard>
  )
}
