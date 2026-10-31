import * as React from 'react'
import { Lock, ExternalLink } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { SettingField, Field } from '@/components/settings/field'
import { SwitchRow } from '@/components/settings/switch-row'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { useSettings } from '@/components/settings/settings-context'
import { useToast } from '@/components/toast'
import { apiClearAdmin, apiCreateAdmin, apiRotateAdmin } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

export function SecuritySection({ className }: { className?: string }) {
  const { settings, save, refresh } = useSettings()
  const { toast } = useToast()
  const { t } = useI18n()
  const oidcEnabled = settings.oidc_enabled === 'true'
  const localAdminConfigured = Boolean(settings.local_admin_password_hash)

  return (
    <SectionCard
      className={className}
      icon={Lock}
      title={t('Security')}
      description={t('Authentication for admin pages and account recovery')}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-bold">{t('OpenID Connect (OIDC)')}</h3>
          <SwitchRow
            label={t('Enable OIDC (admin pages)')}
            description={t('When enabled, admin pages require OIDC login. Keep disabled to avoid lockout.')}
            checked={oidcEnabled}
            onCheckedChange={(checked) => void save('oidc_enabled', String(checked))}
          />
          {oidcEnabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <SettingField name="oidc_issuer" label={t('Issuer URL')} />
                </div>
                <SettingField name="oidc_client_id" label={t('Client ID')} />
                <SettingField name="oidc_client_secret" label={t('Client Secret')} type="password" />
                <SettingField name="oidc_scope" label={t('Scope')} />
                <SettingField name="oidc_redirect_uri" label={t('Redirect URI')} />
              </div>
              <div className="space-y-1.5">
                <Button variant="outline" onClick={() => window.open('/auth/login', '_blank')}>
                  <ExternalLink /> {t('Test OIDC (opens login)')}
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('Opens the OIDC login flow in a new tab. Ensure values are saved before testing.')}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold">{t('Local Admin (Recovery)')}</h3>
          {localAdminConfigured ? <RotatePasswordForm onRotated={refresh} /> : <CreateAdminForm onCreated={refresh} />}
          {localAdminConfigured && (
            <ConfirmDialog
              trigger={<Button variant="outline" className="text-destructive">{t('Clear Local Admin (allow re-bootstrap)')}</Button>}
              title={t('Clear local admin password?')}
              description={t('This removes the local admin password and allows the setup flow to run again. You will need to configure a password before admin access works.')}
              confirmLabel={t('Clear local admin')}
              onConfirm={async () => {
                const result = await apiClearAdmin()
                if (result.ok) {
                  toast({ title: t('Local admin cleared'), description: t('The app can be reconfigured for local admin.') })
                  void refresh()
                } else {
                  toast({ title: t('Failed to clear local admin'), description: result.error || `Error ${result.status}`, variant: 'error' })
                }
              }}
            />
          )}
        </div>
      </div>
    </SectionCard>
  )
}

function RotatePasswordForm({ onRotated }: { onRotated: () => Promise<void> }) {
  const { toast } = useToast()
  const { t } = useI18n()
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [confirm, setConfirm] = React.useState('')

  const rotate = async () => {
    if (next.length < 6) {
      toast({ title: t('New password is too short'), description: t('Use at least 6 characters.'), variant: 'error' })
      return
    }
    if (next !== confirm) {
      toast({ title: t('Passwords do not match'), variant: 'error' })
      return
    }
    const result = await apiRotateAdmin(current, next)
    if (result.ok) {
      toast({ title: t('Password rotated') })
      setCurrent('')
      setNext('')
      setConfirm('')
      void onRotated()
    } else {
      toast({ title: t('Failed to rotate password'), description: result.error || `Error ${result.status}`, variant: 'error' })
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t('Current password')}>
            <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
        </div>
        <Field label={t('New password')}>
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label={t('Confirm new password')}>
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </div>
      <ConfirmDialog
        trigger={<Button>{t('Rotate Password')}</Button>}
        title={t('Rotate admin password?')}
        description={t('The current admin password will stop working immediately. Make sure the new password is stored safely.')}
        confirmLabel={t('Rotate password')}
        onConfirm={() => void rotate()}
      />
    </>
  )
}

function CreateAdminForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const { toast } = useToast()
  const { t } = useI18n()
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')

  const create = async () => {
    if (password.length < 6) {
      toast({ title: t('Password is too short'), description: t('Use at least 6 characters.'), variant: 'error' })
      return
    }
    if (password !== confirm) {
      toast({ title: t('Passwords do not match'), variant: 'error' })
      return
    }
    const result = await apiCreateAdmin(password)
    if (result.ok) {
      toast({ title: t('Local admin created'), description: t('Please log in.') })
      setPassword('')
      setConfirm('')
      void onCreated()
    } else {
      toast({ title: t('Failed to create local admin'), description: result.error || `Error ${result.status}`, variant: 'error' })
    }
  }

  return (
    <>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {t('No local admin is configured. You can create one here (only available if OIDC is disabled).')}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('New admin password')}>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label={t('Confirm password')}>
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
      </div>
      <Button onClick={() => void create()}>{t('Create Local Admin')}</Button>
    </>
  )
}
