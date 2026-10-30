import * as React from 'react'
import { TriangleAlert } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { apiClearHistory } from '@/lib/api'
import { Button } from '@/components/ui/button'
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
      toast({ title: 'Session history cleared' })
      setOpen(false)
      setStep(1)
      void refresh()
    } else {
      toast({ title: 'Failed to clear history', description: result.error || `Error ${result.status}`, variant: 'error' })
    }
  }

  return (
    <SectionCard
      className={className}
      icon={TriangleAlert}
      title="Danger Zone"
      description="Irreversible, data-destroying actions. Think twice before proceeding."
      danger
    >
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Clear All Session History</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{step === 1 ? 'Delete all session history?' : 'Final confirmation'}</AlertDialogTitle>
            <AlertDialogDescription>
              {step === 1
                ? 'This will permanently delete ALL session history and tab data. This action cannot be undone.'
                : 'This will delete all historical data forever. Closed accounting periods are preserved. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{step === 1 ? 'Cancel' : 'Back'}</AlertDialogCancel>
            {step === 1 ? (
              <AlertDialogAction
                variant="destructive"
                onClick={(e) => {
                  e.preventDefault()
                  setStep(2)
                }}
              >
                Continue
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
                {busy ? 'Deleting…' : 'Yes, delete everything'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Deletes all completed sessions, tab items, and history. Active sessions will not be affected.
      </p>
    </SectionCard>
  )
}
