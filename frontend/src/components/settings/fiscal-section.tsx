import { FileText } from 'lucide-react'
import { SectionCard } from '@/components/settings/section-card'
import { SettingField } from '@/components/settings/field'

export function FiscalSection({ className }: { className?: string }) {
  return (
    <SectionCard
      className={className}
      icon={FileText}
      title="Fiscal / Legal Information"
      description="Used on receipts and in the VAT (TVA) report. Consult your expert-comptable to confirm the correct values for your business."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingField name="legal_name" label="Legal Business Name" />
        <SettingField name="siret" label="SIRET" />
        <SettingField name="siren" label="SIREN" />
        <SettingField name="tva_number" label="TVA Intracommunautaire No." />
        <div className="sm:col-span-2">
          <SettingField name="legal_address" label="Registered Address" />
        </div>
        <SettingField
          name="vat_regime"
          label="VAT Regime"
          help="e.g. réel normal, réel simplifié, franchise en base"
        />
        <SettingField
          name="vat_periodicity"
          label="Declaration Periodicity"
          help="monthly / quarterly / annual"
        />
      </div>
    </SectionCard>
  )
}
