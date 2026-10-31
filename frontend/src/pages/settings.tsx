import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useSettings } from '@/components/settings/settings-context'
import { GeneralSection } from '@/components/settings/general-section'
import { LocalizationSection } from '@/components/settings/localization-section'
import { SmtpSection } from '@/components/settings/smtp-section'
import { FiscalSection } from '@/components/settings/fiscal-section'
import { SecuritySection } from '@/components/settings/security-section'
import { DangerSection } from '@/components/settings/danger-section'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'

export function SettingsPage() {
  const { loading, loadError, refresh } = useSettings()
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <a href="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Admin')}
        </a>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('Settings')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('Configure branding, localization, fiscal, email and security.')}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-64 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : loadError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw /> {t('Retry')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
          <GeneralSection />
          <LocalizationSection />
          <SmtpSection />
          <FiscalSection />
          <SecuritySection className="xl:col-span-2" />
          <DangerSection className="xl:col-span-2" />
        </div>
      )}
    </div>
  )
}
