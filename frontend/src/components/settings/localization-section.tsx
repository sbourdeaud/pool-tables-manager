import { Globe2 } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { SettingField, Field } from '@/components/settings/field'
import { useSettings } from '@/components/settings/settings-context'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LANGUAGES, LanguageSelect, useI18n } from '@/lib/i18n'
import { currencyOptionsForLanguages } from '@/lib/currencies'

const CURRENCIES = currencyOptionsForLanguages(LANGUAGES.map((language) => language.value))

export function LocalizationSection({ className }: { className?: string }) {
  const { settings, save } = useSettings()
  const { t } = useI18n()
  const currency = settings.currency || '$'
  const options = CURRENCIES.some((option) => option.value === currency)
    ? CURRENCIES
    : [{ value: currency, label: currency, code: currency }, ...CURRENCIES]

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
      description={t('Language, currency and subscriber pricing')}
    >
      <Field label={t('Language')} help={t('Stored on this device')}>
        <LanguageSelect />
      </Field>
      <Field label={t('Currency')}>
        <Select value={currency} onValueChange={handleCurrency}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((c) => (
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
