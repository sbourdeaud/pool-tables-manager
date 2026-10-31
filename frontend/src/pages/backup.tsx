import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Database, Download, RotateCcw, ShieldAlert, Upload } from 'lucide-react'
import { apiImportBackup, backupExportUrl, type BackupImportResult } from '@/lib/api'
import { useToast } from '@/components/toast'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function friendlyError(result: { error?: string; message?: string; missing?: string[] } | undefined): string {
  if (!result) return 'Unknown error'
  switch (result.error) {
    case 'empty_upload':
      return 'Select a backup file first.'
    case 'invalid_archive':
      return 'That file is not a readable PostgreSQL backup archive.'
    case 'not_app_backup':
      return `This archive does not look like a Pool Tables Manager backup${result.missing && result.missing.length ? ` (missing: ${result.missing.slice(0, 5).join(', ')}${result.missing.length > 5 ? '…' : ''})` : ''}.`
    case 'restore_failed':
      return `Restore failed — the database was left unchanged. ${result.message || ''}`.trim()
    case 'backup_in_progress':
      return 'Another backup or restore is already running.'
    case 'database_url_missing':
      return 'The server has no DATABASE_URL configured.'
    default:
      return result.message || result.error || 'Unknown error'
  }
}

export function BackupPage() {
  const { toast } = useToast()
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
      toast({ title: 'Database restored', description: 'Reload the app to pick up the restored settings.' })
    } else {
      toast({ title: 'Restore failed', description: friendlyError(response.data), variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Database Backup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download a consistent, compressed snapshot of the database or restore one.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" /> Export
            </CardTitle>
            <CardDescription>
              A consistent snapshot taken with <code>pg_dump</code> (custom format, zlib-compressed). Includes
              all sessions, tabs, receipts, payments, settings and history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild>
              <a href={backupExportUrl()} download>
                <Download /> Download backup
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Keep backups outside the server (e.g. on your computer) and store them securely — they contain
              customer and fiscal data.
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" /> Restore
            </CardTitle>
            <CardDescription>
              Replaces the current database contents with the uploaded archive. Take a fresh export first.
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
                  <RotateCcw /> {busy ? 'Restoring…' : 'Restore database'}
                </Button>
              }
              title="Restore this backup?"
              description="All current data will be replaced by the archive. The restore runs in a single transaction: on failure nothing changes. Backups from older app versions are upgraded with Prisma migrations afterwards."
              confirmLabel="Restore"
              onConfirm={() => void runImport()}
            />
            <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                Only restore archives from this application and a compatible PostgreSQL major version. The
                admin session stays valid; reload the app afterwards to pick up restored settings.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {result?.ok && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" /> Restore complete
            </CardTitle>
            <CardDescription>
              {result.sizeBytes ? `${(result.sizeBytes / 1024).toFixed(1)} kB restored. ` : ''}
              Prisma migrations: {result.migrations?.code === 0 ? 'schema up to date' : 'see output below'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.migrations?.output && (
              <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">{result.migrations.output}</pre>
            )}
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload app
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
