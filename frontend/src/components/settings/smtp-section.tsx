import * as React from 'react'
import { Mail, Send } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { SettingField, Field } from '@/components/settings/field'
import { SwitchRow } from '@/components/settings/switch-row'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { apiSmtpTest } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/lib/i18n'

export function SmtpSection({ className }: { className?: string }) {
  const { settings, save } = useSettings()
  const { toast } = useToast()
  const { t } = useI18n()
  const [password, setPassword] = React.useState('')
  const [showTest, setShowTest] = React.useState(false)
  const [testTo, setTestTo] = React.useState('')
  const [sending, setSending] = React.useState(false)

  const commitPassword = async () => {
    if (!password) return
    const ok = await save('smtp_pass', password)
    if (ok) setPassword('')
  }

  const sendTest = async () => {
    if (!testTo) return
    setSending(true)
    const result = await apiSmtpTest(testTo)
    setSending(false)
    if (result.ok) {
      toast({ title: t('Test email sent') })
      setShowTest(false)
      setTestTo('')
    } else {
      toast({ title: t('Test failed'), description: result.error || `Error ${result.status}`, variant: 'error' })
    }
  }

  return (
    <SectionCard
      className={className}
      icon={Mail}
      title={t('Email (SMTP)')}
      description={t('Used to email reports and maintenance alerts. The SMTP password is stored on the server and is never shown here again.')}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingField name="smtp_host" label={t('SMTP Host')} />
        <SettingField name="smtp_port" label={t('SMTP Port')} type="number" />
        <SettingField name="smtp_user" label={t('SMTP Username')} />
        <SettingField name="smtp_from" label={t('From Address')} />
        <div className="sm:col-span-2">
          <SettingField name="maintenance_alert_email" label={t('Maintenance Alert Email')} />
        </div>
      </div>
      <Separator />
      <SwitchRow
        label={t('Use TLS/SSL (secure)')}
        checked={settings.smtp_secure === 'true'}
        onCheckedChange={(checked) => void save('smtp_secure', String(checked))}
      />
      <Field label={t('SMTP Password')} help={t('Leave blank to keep the stored password')}>
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          placeholder={settings.smtp_pass_set ? t('•••••• (stored — type to replace)') : t('not set')}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => void commitPassword()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
      </Field>

      <div className="space-y-3">
        {!showTest ? (
          <Button variant="outline" onClick={() => setShowTest(true)}>
            <Send /> {t('Send Test Email')}
          </Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              autoFocus
              placeholder="recipient@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void sendTest()
                if (e.key === 'Escape') setShowTest(false)
              }}
            />
            <div className="flex gap-2">
              <Button onClick={() => void sendTest()} disabled={sending || !testTo}>
                {sending ? t('Sending…') : t('Send')}
              </Button>
              <Button variant="ghost" onClick={() => setShowTest(false)}>
                {t('Cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
