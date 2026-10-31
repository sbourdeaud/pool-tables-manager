import { FileText } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { SettingField } from '@/components/settings/field'
import { useI18n } from '@/lib/i18n'

export function FiscalSection({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <SectionCard
      className={className}
      icon={FileText}
      title={t('Fiscal / Legal Information')}
      description={t('Used on receipts and in the VAT (TVA) report. Consult your expert-comptable to confirm the correct values for your business.')}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingField name="legal_name" label={t('Legal Business Name')} />
        <SettingField name="siret" label={t('SIRET')} />
        <SettingField name="siren" label={t('SIREN')} />
        <SettingField name="tva_number" label={t('TVA Intracommunautaire No.')} />
        <div className="sm:col-span-2">
          <SettingField name="legal_address" label={t('Registered Address')} />
        </div>
        <SettingField
          name="vat_regime"
          label={t('VAT Regime')}
          help={t('e.g. réel normal, réel simplifié, franchise en base')}
        />
        <SettingField
          name="vat_periodicity"
          label={t('Declaration Periodicity')}
          help={t('monthly / quarterly / annual')}
        />
      </div>
    </SectionCard>
  )
}
