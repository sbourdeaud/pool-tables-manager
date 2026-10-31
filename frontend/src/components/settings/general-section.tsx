import * as React from 'react'
import { Settings2 } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { SettingField } from '@/components/settings/field'
import { SwitchRow } from '@/components/settings/switch-row'
import { Field } from '@/components/settings/field'
import { useSettings } from '@/components/settings/settings-context'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'

export function GeneralSection({ className }: { className?: string }) {
  const { settings, save } = useSettings()
  const { t } = useI18n()
  const [audioEnabled, setAudioEnabled] = React.useState(localStorage.getItem('audio_cues') !== 'false')
  const layout = settings.dashboard_layout === 'tabs' ? 'tabs' : 'sections'

  const handleAudio = (checked: boolean) => {
    setAudioEnabled(checked)
    localStorage.setItem('audio_cues', String(checked))
  }

  return (
    <SectionCard
      className={className}
      icon={Settings2}
      title={t('General')}
      description={t('Application identity and the address players use to reach it')}
    >
      <SettingField name="app_name" label={t('Application Name')} placeholder={t('Pool Hall')} help={t('Display name shown in the header')} />
      <SettingField
        name="public_base_url"
        label={t('Public Base URL')}
        placeholder={window.location.origin}
        help={t('Hostname/IP used in the table QR codes so players can reach this app. Leave blank to use the address you are currently browsing from ({origin}).', { origin: window.location.origin })}
      />
      <SwitchRow
        label={t('Payments (POS)')}
        description={t('Enable cash payments with split payments, cash-shift reconciliation and payment methods on receipts. Card terminal support arrives in a later phase.')}
        checked={settings.pos_enabled === 'true'}
        onCheckedChange={(checked) => void save('pos_enabled', String(checked))}
      />
      <Field label={t('Dashboard layout')} help={t('Sections: collapsible groups with a flag navigator. Tabs: one table type at a time — drag the flags to reorder them.')}>
        <Select value={layout} onValueChange={(value) => void save('dashboard_layout', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sections">{t('Sections (collapsible groups)')}</SelectItem>
            <SelectItem value="tabs">{t('Tabs (one type at a time)')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Separator />
      <SwitchRow
        label={t('Audio Cues')}
        badge={t('Device only')}
        description={t('Play subtle click sounds when interacting with the UI')}
        checked={audioEnabled}
        onCheckedChange={handleAudio}
      />
    </SectionCard>
  )
}
