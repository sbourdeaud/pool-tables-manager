import * as React from 'react'
import { Settings2 } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { SettingField } from '@/components/settings/field'
import { SwitchRow } from '@/components/settings/switch-row'
import { Field } from '@/components/settings/field'
import { useSettings } from '@/components/settings/settings-context'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function GeneralSection({ className }: { className?: string }) {
  const { settings, save } = useSettings()
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
      title="General"
      description="Application identity and the address players use to reach it"
    >
      <SettingField name="app_name" label="Application Name" placeholder="Pool Hall" help="Display name shown in the header" />
      <SettingField
        name="public_base_url"
        label="Public Base URL"
        placeholder={window.location.origin}
        help={`Hostname/IP used in table QR codes so players' phones can reach this app (e.g. http://192.168.1.50:3000 or https://pool.example.com). Leave blank to use the address you're currently browsing from (${window.location.origin}).`}
      />
      <Field label="Dashboard layout" help="Sections: collapsible groups with a flag navigator. Tabs: one table type at a time — drag the flags to reorder them.">
        <Select value={layout} onValueChange={(value) => void save('dashboard_layout', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sections">Sections (collapsible groups)</SelectItem>
            <SelectItem value="tabs">Tabs (one type at a time)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Separator />
      <SwitchRow
        label="Audio Cues"
        badge="Device only"
        description="Play subtle click sounds when interacting with the UI"
        checked={audioEnabled}
        onCheckedChange={handleAudio}
      />
    </SectionCard>
  )
}
