import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Database, Download, RotateCcw, ShieldAlert, Upload } from 'lucide-react'
import { apiImportBackup, backupExportUrl, type BackupImportResult } from '@/lib/api'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'

type Translate = (key: string, vars?: Record<string, string | number>) => string

function friendlyError(result: { error?: string; message?: string; missing?: string[] } | undefined, t: Translate): string {
  if (!result) return t('Unknown error')
  switch (result.error) {
    case 'empty_upload':
      return t('Select a backup file first.')
    case 'invalid_archive':
      return t('That file is not a readable PostgreSQL backup archive.')
    case 'not_app_backup':
      return result.missing && result.missing.length
        ? t('This archive does not look like a Pool Tables Manager backup (missing: {missing}).', { missing: `${result.missing.slice(0, 5).join(', ')}${result.missing.length > 5 ? '…' : ''}` })
        : t('This archive does not look like a Pool Tables Manager backup')
    case 'restore_failed':
      return t('Restore failed — the database was left unchanged. {message}', { message: result.message || '' }).trim()
    case 'backup_in_progress':
      return t('Another backup or restore is already running.')
    case 'database_url_missing':
      return t('The server has no DATABASE_URL configured.')
    default:
      return result.message || result.error || t('Unknown error')
  }
}

export function BackupPage() {
  const { toast } = useToast()
  const { t } = useI18n()
  const [file, setFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<BackupImportResult | null>(null)

  const runImport = async () => {
    if (!file) return
    setBusy(true)
    setResult(null)
    const response = await apiImportBackup(file)
    setBusy(false)
    if (response.ok) {
      setResult(response.data || { ok: true })
      setFile(null)
      toast({ title: t('Database restored'), description: t('Reload the app to pick up the restored settings.') })
    } else {
      toast({ title: t('Restore failed'), description: friendlyError(response.data, t), variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t('Back to Admin')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('Database Backup')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('Download a consistent, compressed snapshot of the database or restore one.')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" /> {t('Export')}
            </CardTitle>
            <CardDescription>
              {t('A consistent snapshot taken with pg_dump (custom format, zlib-compressed). Includes all sessions, tabs, receipts, payments, settings and history.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild>
              <a href={backupExportUrl()} download>
                <Download /> {t('Download backup')}
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('Keep backups outside the server (e.g. on your computer) and store them securely — they contain customer and fiscal data.')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" /> {t('Restore')}
            </CardTitle>
            <CardDescription>
              {t('Replaces the current database contents with the uploaded archive. Take a fresh export first.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Input
                type="file"
                accept=".dump,.backup,.tar,application/octet-stream"
                onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                disabled={busy}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} · {(file.size / 1024).toFixed(1)} kB
                </p>
              )}
            </div>
            <ConfirmDialog
              trigger={
                <Button variant="destructive" disabled={!file || busy}>
                  <RotateCcw /> {busy ? t('Restoring…') : t('Restore database')}
                </Button>
              }
              title={t('Restore this backup?')}
              description={t('All current data will be replaced by the archive. The restore runs in a single transaction: on failure nothing changes. Backups from older app versions are upgraded with Prisma migrations afterwards.')}
              confirmLabel={t('Restore')}
              onConfirm={() => void runImport()}
            />
            <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                {t('Only restore archives from this application and a compatible PostgreSQL major version. The admin session stays valid; reload the app afterwards to pick up restored settings.')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {result?.ok && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" /> {t('Restore complete')}
            </CardTitle>
            <CardDescription>
              {result.sizeBytes ? t('{size} kB restored. ', { size: (result.sizeBytes / 1024).toFixed(1) }) : ''}
              {t('Prisma migrations: {state}.', { state: result.migrations?.code === 0 ? t('schema up to date') : t('see output below') })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.migrations?.output && (
              <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">{result.migrations.output}</pre>
            )}
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t('Reload app')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
