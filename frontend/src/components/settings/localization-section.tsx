import { Globe2 } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { SettingField, Field } from '@/components/settings/field'
import { useSettings } from '@/components/settings/settings-context'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LanguageSelect, useI18n } from '@/lib/i18n'

const CURRENCIES = [
  { value: '$', label: '$ (USD)' },
  { value: '€', label: '€ (EUR)' },
  { value: '£', label: '£ (GBP)' },
]

export function LocalizationSection({ className }: { className?: string }) {
  const { settings, save } = useSettings()
  const { t } = useI18n()
  const currency = settings.currency || '$'

  const handleCurrency = (value: string) => {
    void save('currency', value).then((ok) => {
      if (ok) localStorage.setItem('currency', value)
    })
  }

  return (
    <SectionCard
      className={className}
      icon={Globe2}
      title={t('Localization & Pricing')}
      description="Language, currency and subscriber pricing"
    >
      <Field label={t('Language')} help={t('Stored on this device')}>
        <LanguageSelect />
      </Field>
      <Field label="Currency">
        <Select value={currency} onValueChange={handleCurrency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <SettingField
        name="subscriber_discount"
        label="Subscriber Discount (%)"
        type="number"
        min="0"
        max="100"
        fallback="50"
        help="Discount applied to non-subscribers playing with subscribers"
      />
    </SectionCard>
  )
}
