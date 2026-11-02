import * as React from 'react'
import { Megaphone } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { useSettings } from '@/components/settings/settings-context'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'

const MAX_MESSAGE_LENGTH = 500

export function MessageOfTheDaySection({ className }: { className?: string }) {
  const { settings, save } = useSettings()
  const { t } = useI18n()
  const current = settings.venue_motd ?? ''
  const [message, setMessage] = React.useState(current)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setMessage(current)
  }, [current])

  const handleSave = async () => {
    setSaving(true)
    await save('venue_motd', message.trim())
    setSaving(false)
  }

  return (
    <SectionCard
      className={className}
      icon={Megaphone}
      title={t('Message of the Day')}
      description={t('Show a short notice to guests on the public status page.')}
    >
      <div className="space-y-1.5">
        <Label className="block" htmlFor="venue-motd">{t('Message')}</Label>
        <textarea
          id="venue-motd"
          className="flex min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={message}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={4}
          onChange={(event) => setMessage(event.target.value)}
        />
        <p className="text-right text-xs text-muted-foreground">{message.length}/{MAX_MESSAGE_LENGTH}</p>
      </div>
      <Button type="button" onClick={() => void handleSave()} disabled={saving || message.trim() === current.trim()}>
        {saving ? t('Saving…') : t('Save')}
      </Button>
    </SectionCard>
  )
}
