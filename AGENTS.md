# Repository guidance

## Setup and boundaries

- There is no root npm workspace: run `npm ci` and package commands separately in `backend/` and `frontend/`.
- Run `nvm install && nvm use` at the repository root. `.nvmrc` drives CI; keep it aligned with both Node image tags in `backend/Dockerfile`. Keep manifest engine ranges and lockfile root engines aligned across packages.
- `backend/server.js` is the Express entrypoint and exports the app without listening when imported by tests. Domain modules in `backend/src/` share its Prisma instance. Preserve middleware/route registration order when extracting handlers; `backend/src/venue-events.js` demonstrates dependency injection with separate staff/public registrations.
- The current UI is in `frontend/`; `backend/public/classic/` is the archived client, not the UI to modify.

## Verification commands

Run in the indicated package directory; neither package defines a formatter script.

| Package | Checks | Focused test |
| --- | --- | --- |
| `backend/` | `npm run lint` then `npm test` | `npm test -- --runTestsByPath tests/events.test.js` |
| `frontend/` | `npm run lint`, `npm test`, `npx tsc --noEmit` | `node --experimental-strip-types --test scripts/reports.test.mjs` |

- Backend uses Jest serially with `NODE_ENV=test`; frontend uses `node:test`, not Jest/Vitest. Existing component tests transform TSX with Vite and mock modules/hooks in a VM.
- For mocked API tests, mock `src/prismaClient` before requiring `server.js`. Use `tests/helpers/csrfRequest` instead of raw Supertest for ordinary mutations: CSRF remains active in tests. Use raw Supertest for rejection/security tests.
- Stateful mock reset order: `jest.resetAllMocks()` → `restoreStatefulMocks(prisma)` → reset relevant `prisma.state` fields → `setupAuthBypass(prisma)`; see `backend/tests/subscriptions.test.js`.
- PostgreSQL suites skip unless explicitly enabled. `SESSION_TEST_POSTGRES_URL` must point to a migrated disposable DB: tests delete table contents. `PAYMENT_TEST_POSTGRES_URL` and `BACKUP_TEST_POSTGRES_URL` create/drop databases and need creation privileges; backup tests also need `psql`, `pg_dump`, and `pg_restore`. Never use the application DB for these.
- Full PostgreSQL CI setup/order is in `.github/workflows/ci.yml`: PostgreSQL 18, `npm ci` → lint → Prisma generate → migrate deploy → tests. The separate `backend-tests.yml` workflow runs without a database service.

## Builds and local deployment

- In `frontend/`, `npm run build` typechecks, writes the three HTML entries and hashed assets into `backend/public/`, and copies `USER_GUIDE*.md` into `backend/public/help/`. Generated frontend files are tracked; do not hand-edit bundles.
- Vite uses `emptyOutDir: false` because `backend/public/` also contains non-generated resources. Never empty that directory wholesale; preserve `classic/`, `vendor/`, and other static resources when refreshing assets.
- Docker builds from `backend/` only and does **not** compile the frontend. To test UI changes locally, build the frontend first, then `docker compose build app && docker compose up -d --no-build --pull never app` from the root. Probe `curl --fail http://localhost:3000/health`.
- App startup automatically applies Prisma migrations. Reuse the existing Compose project and `db_data_v18` volume; back up before deployment and do not use `down -v` as a rebuild shortcut.
- On this WSL `/mnt/*` checkout, large Node writes can truncate at 512 KiB and native dependencies can be unusable. Install/build on a native Linux filesystem, then copy artifacts back; follow `frontend/README.md`'s WSL workflow. Verify large bundles before publishing.
- Builds outside the Git checkout need truthful `BUILD_COMMIT_SHA` and `BUILD_GIT_STATUS` overrides (`clean`, `dirty`, or `unknown`); see `frontend/vite.config.ts`. Help-copy paths can be set with `DOCS_SOURCE_DIR`/`DOCS_OUT_DIR`.

## Codegen and publishing

- Prisma 7 reads `DATABASE_URL` from `backend/prisma.config.ts`, not the schema. Even `npx prisma generate` needs it, but does not connect: from `backend/`, use `DATABASE_URL=postgres://build:build@localhost:5432/build npx prisma generate` for generation only. Migration commands must target the intended real database.
- Use `npm run ui:add -- <component>` / `npm run ui:update -- <component>` in `frontend/`, not bare shadcn: the wrappers repair generated `cn` imports to `#lib/utils`.
- Pushes to `master`/`main` trigger automatic version/tag/release creation and image publication; `release` pushes run CI without that release trigger. Check `.github/workflows/release-on-merge.yml` before release operations.
