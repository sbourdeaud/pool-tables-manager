# Upgrade Guide

How the stack was upgraded from Node.js 18 / PostgreSQL 15 / Prisma 5 to
Node.js 22 / PostgreSQL 18.6 / Prisma 6, and how to perform similar upgrades
in the future.

## Versions after this upgrade

| Component          | Before            | After                          |
| ------------------ | ----------------- | ------------------------------ |
| Node.js (image)    | 18 (`node:18-bullseye-slim`) | 22 (`node:22-bookworm-slim`) |
| PostgreSQL         | 15.x              | 18.6 (`postgres:18`)           |
| Prisma ORM / CLI   | 5.22.0 / 5.3.x    | 6.19.3                         |
| express            | 4.22.1            | 4.22.3                         |
| nodemailer         | 6.10.x            | 10.0.13                        |

Security posture after the upgrade: `npm audit` reports **0 vulnerabilities**
in the full dependency tree, and the production image (`npm install
--production`) reports 0 as well.

## Why each change

- **Node.js 18 → 22**: Node 18 is EOL and `nodemailer@10` requires Node >= 20.
  The base image moved from `node:18-bullseye-slim` to
  `node:22-bookworm-slim`. Debian Bullseye is also EOL — its security mirror
  had started 404-ing pinned package versions, which broke the image build.
  The `libssl1.1` apt install was dropped: Bookworm ships OpenSSL 3, which
  Prisma supports natively.
- **PostgreSQL 15 → 18**: freshness and supported lifetime. Nothing in the app
  is 15-specific. Because a major version bump changes the on-disk format, the
  data was migrated with `pg_dump`/`pg_restore` (see below).
- **Prisma 5.22 → 6.19.3**: Prisma 5's officially supported PostgreSQL range
  predates 17/18; Prisma 6 supports modern Postgres. Prisma 7/8 were not used
  because their CLI dependency trees currently reintroduce `high` npm
  advisories (`mysql2`, `deepmerge-ts`). The remaining `deepmerge-ts` advisory
  in Prisma 6's CLI is mitigated with an `overrides` pin in
  `backend/package.json` (verified against the CLI, see below). These are
  dev-CLI dependencies only — they are not installed in the production image
  (`npm install --production`), which only ships `@prisma/client`.

## What changed in the repo

- `docker-compose.yml`
  - `db` image: `postgres:15` → `postgres:18`.
  - Volume mount moved from `/var/lib/postgresql/data` to
    `/var/lib/postgresql` (required by the 18+ images, see gotcha below).
  - Named volume renamed `db_data` → `db_data_v18` (the old `db_data` volume
    was kept on the host as a rollback artifact).
- `backend/Dockerfile`: base image `node:22-bookworm-slim`, apt install
  reduced to `ca-certificates openssl`.
- `backend/package.json`: `prisma`/`@prisma/client` `^6.19.3`, plus
  `"overrides": { "deepmerge-ts": "^8.0.0" }`.
- Documentation updated (this file, README, DEVELOPER_README).

## Gotchas encountered

1. **`postgres:18` images changed the data-layout convention.** They expect a
   single mount at `/var/lib/postgresql` and store data in a
   major-version-specific subdirectory (`/var/lib/postgresql/18/docker`).
   Mounting the legacy `/var/lib/postgresql/data` path is refused at startup
   with an explanatory error (docker-library/postgres#1259). This is also what
   makes future `pg_upgrade --link` upgrades possible.
2. **Prisma 7/8 CLI dependencies are currently flagged** (`mysql2`,
   `deepmerge-ts`) by `npm audit`. If you upgrade beyond Prisma 6, re-run
   `npm audit` and consider overrides or waiting for upstream fixes.
3. **Beware stale shell working directories** when scripting the upgrade:
   `pg_dump -f` + `docker cp` is used instead of host redirection because the
   maintenance shell blocks output redirection.

## How the upgrade was performed (as executed)

### 0. Preconditions

- Tests green: `cd backend && npm test`.
- Prisma toolchain verified: `prisma validate` and `prisma generate` pass with
  the new version (run with `--schema backend/prisma/schema.prisma` if invoked
  from the repo root).

### 1. Freeze writes

```bash
docker compose stop app
```

### 2. Backup

```bash
docker exec pool-tables-manager-db-1 pg_dump -U postgres -Fc -f /tmp/dump pool_tables
docker cp pool-tables-manager-db-1:/tmp/dump ./pool_tables_15.dump
docker exec pool-tables-manager-db-1 rm /tmp/dump
```

Also snapshot row counts per table for verification later (single `SELECT
count(*) ... UNION ALL ...` over `PoolTable`, `TableType`, `Session`,
`TabLineItem`, `Drink`, `Receipt`, `Setting`, `PendingOrder`, and
`_prisma_migrations`).

Dumps contain customer data — keep them out of the repository and delete them
once the soak period ends.

### 3. Rehearse on scratch (strongly recommended)

Restore the dump into a throwaway `postgres:18` container, run the app image
against it, and verify before touching production:

```bash
docker run -d --name scratch-db -e POSTGRES_PASSWORD=example -e POSTGRES_DB=pool_tables postgres:18
docker cp pool_tables_15.dump scratch-db:/tmp/restore.dump
docker exec scratch-db pg_restore -U postgres -d pool_tables --no-owner --no-privileges /tmp/restore.dump
docker run -d --name scratch-app -p 3002:3000 \
  -e DATABASE_URL=postgres://postgres:example@scratch-db:5432/pool_tables \
  --network <scratch-network> pool-tables-manager-app:latest
# expect {"status":"ok"} and the settings payload on http://localhost:3002
```

Validation checklist used here (all passed):
- `SELECT version()` → `PostgreSQL 18.6 ...`.
- Row counts match the baseline snapshot exactly.
- `npx prisma migrate deploy` → "No pending migrations to apply".
- `/health` → `{"status":"ok"}`; `/api/settings` returns the stored settings
  (proves a live ORM round-trip on the new engine).
- Production install inside the image reports 0 vulnerabilities.

### 4. Cut over

1. Edit `docker-compose.yml` (image tag, new volume, mount at
   `/var/lib/postgresql`).
2. `docker compose up -d db --wait` — initializes a fresh 18.6 cluster in the
   new volume.
3. `docker cp <dump> pool-tables-manager-db-1:/tmp/restore.dump` and
   `docker exec pool-tables-manager-db-1 pg_restore -U postgres -d pool_tables --no-owner --no-privileges /tmp/restore.dump`.
4. `docker compose up -d --build --wait` — rebuilds the app image (Prisma 6
   client) and starts it.

### 5. Verify

- Row counts match the baseline; `_prisma_migrations` intact.
- Receipt numbering continuity: `SELECT year, max(number) FROM "Receipt" GROUP BY year`.
- `npx prisma migrate deploy` → no pending migrations.
- App smoke test: `/health`, dashboard loads, start/checkout a session if
  possible, reports render.
- `docker compose logs app` free of errors.

### 6. Rollback (if needed)

```bash
docker compose down
# point docker-compose.yml back at image postgres:15 + volume db_data, then:
docker compose up -d
```

The old `db_data` volume (Postgres 15) was intentionally left on the host as
the rollback artifact. Delete it only after a successful soak period (suggested:
1–2 weeks):

```bash
docker volume rm pool-tables-manager_db_data   # only after the soak period
```

## Future minor upgrades

- **PostgreSQL 18.x**: minor versions are drop-in — just bump the tag, no data
  migration required.
- **Node 22.x**: drop-in for the same Debian suite.
- **Prisma**: patch/minor upgrades are low risk; run `prisma validate`,
  `prisma generate`, `npm test`, and re-audit.

## Checklist for any future major upgrade

1. Read the upstream image release notes (especially mount-path and
   init-script changes).
2. Freeze writes (`docker compose stop app`).
3. `pg_dump -Fc` + snapshot row counts.
4. Rehearse restore on a scratch instance of the new major.
5. Cut over with a **new** named volume; keep the old one.
6. Verify counts, migrations, receipt continuity, app smoke tests.
7. Keep the old volume as rollback; delete after a soak period.
