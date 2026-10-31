// Consistent database backup/restore built on the PostgreSQL client tools.
// Export streams a custom-format dump (built-in zlib compression) taken in a
// single consistent snapshot; import validates the archive, restores it inside
// a single transaction, then brings the schema up to date with Prisma migrate.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// Tables we expect in an app backup. Used to reject unrelated archives.
const REQUIRED_TABLES = [
  'TableType', 'PoolTable', 'Session', 'TabLineItem', 'Drink', 'Subscription',
  'Setting', 'PendingOrder', 'Receipt', 'ClosurePeriod', 'Payment', 'CashShift',
  'PaymentEvent', 'CreditNote'
];

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function run(spawnFn, cmd, args) {
  return new Promise((resolve) => {
    const child = spawnFn(cmd, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (err) => resolve({ code: -1, stdout, stderr: String(err.message || err) }));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function createBackupService({ spawnFn = spawn, databaseUrl = process.env.DATABASE_URL, prisma } = {}) {
  let busy = false;

  // Streams the dump to an Express response. Returns { busy } when another
  // backup/restore is already running (nothing is written in that case).
  function exportTo(res) {
    if (!databaseUrl) {
      res.status(500).json({ error: 'database_url_missing' });
      return Promise.resolve();
    }
    if (busy) return Promise.resolve({ busy: true });
    busy = true;

    return new Promise((resolve) => {
      let child;
      try {
        child = spawnFn('pg_dump', ['--dbname', databaseUrl, '--format=custom', '--compress=9', '--no-owner', '--no-privileges']);
      } catch (err) {
        busy = false;
        res.status(500).json({ error: 'backup_failed', message: err.message });
        return resolve();
      }

      let stderr = '';
      let closed = false;
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (err) => {
        if (closed) return;
        closed = true;
        busy = false;
        if (!res.headersSent) res.status(500).json({ error: 'backup_failed', message: String(err.message || err) });
        else res.destroy();
        resolve();
      });
      child.on('close', (code) => {
        if (closed) return;
        closed = true;
        busy = false;
        if (code !== 0) {
          if (!res.headersSent) res.status(500).json({ error: 'backup_failed', message: stderr.slice(-1000) });
          else res.destroy();
        }
        resolve();
      });

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="pool-tables-backup-${timestamp()}.dump"`);
      child.stdout.pipe(res);
    });
  }

  // Restores an uploaded custom-format archive.
  async function importFrom(buffer) {
    if (!databaseUrl) return { failed: 'database_url_missing' };
    if (busy) return { busy: true };
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { invalid: 'empty_upload' };
    busy = true;
    const file = path.join(os.tmpdir(), `pool-tables-restore-${Date.now()}.dump`);
    try {
      fs.writeFileSync(file, buffer);

      // 1) Validate the archive and check it looks like an app database.
      const listing = await run(spawnFn, 'pg_restore', ['--list', file]);
      if (listing.code !== 0) {
        return { invalid: 'invalid_archive', message: listing.stderr.slice(-500) };
      }
      const missing = REQUIRED_TABLES.filter((table) => !listing.stdout.includes(`"${table}"`));
      if (missing.length > 0) {
        return { invalid: 'not_app_backup', missing };
      }

      // 2) Restore atomically (single transaction; no owners/grants).
      const restore = await run(spawnFn, 'pg_restore', [
        '--dbname', databaseUrl,
        '--clean', '--if-exists',
        '--no-owner', '--no-privileges',
        '--single-transaction', '--exit-on-error',
        file
      ]);
      if (restore.code !== 0) {
        return { failed: 'restore_failed', message: restore.stderr.slice(-1500) };
      }

      // 3) Bring the schema up to date (backups from older versions) and drop
      // the Prisma pool so new connections see the restored objects.
      const migrate = await run(spawnFn, 'npx', ['prisma', 'migrate', 'deploy']);
      let disconnected = false;
      try {
        if (prisma && typeof prisma.$disconnect === 'function') {
          await prisma.$disconnect();
          disconnected = true;
        }
      } catch { /* the pool reconnects lazily */ }

      return {
        ok: true,
        sizeBytes: buffer.length,
        migrations: { code: migrate.code, output: (migrate.stdout + migrate.stderr).slice(-1000) },
        disconnected
      };
    } finally {
      fs.unlink(file, () => {});
      busy = false;
    }
  }

  return { exportTo, importFrom, isBusy: () => busy };
}

module.exports = { createBackupService, REQUIRED_TABLES };
