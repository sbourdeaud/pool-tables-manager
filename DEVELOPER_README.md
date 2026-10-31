# Pool Tables Manager - Developer Documentation

## Project Overview

Pool Tables Manager is a full-stack web application for managing pool hall operations, including table sessions, tab tracking, player settlements, subscriptions, and financial reporting.

**Tech Stack:**
- **Backend:** Node.js 22, Express 5, Prisma ORM 7 (driver adapter `@prisma/adapter-pg`), openid-client 6
- **Database:** PostgreSQL 18
- **Frontend:** React 19 + TypeScript 7 + Vite 8 + Tailwind CSS 4, shadcn-style components (Radix UI)
- **Deployment:** Docker & Docker Compose
- **UI:** Light/dark themes, tile-based dashboards, shadcn-style design tokens

## Architecture

### High-Level Structure

```
pool-tables-manager/
├── frontend/                     # React app (staff SPA, player app, status board)
│   ├── src/
│   │   ├── pages/                # dashboard, admin pages, reports, settings, login
│   │   ├── table/                # player-facing table app (entry table.html)
│   │   ├── status/               # public status board (entry status.html)
│   │   ├── components/           # shadcn-style ui/ primitives + settings/dashboard components
│   │   └── lib/                  # api client, auth context, theme, menu, receipts, audio, qr
│   ├── components.json           # shadcn CLI configuration
│   ├── scripts/fix-shadcn-imports.mjs
│   └── package.json              # React/Vite/Tailwind dependencies
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── migrations/            # Database migrations
│   ├── public/                   # Static output served by Express
│   │   ├── index.html            # Built staff SPA
│   │   ├── table.html            # Built player app
│   │   ├── status.html           # Built public board
│   │   ├── assets/               # Built JS/CSS bundles
│   │   ├── classic/              # Archived previous vanilla-JS UI
│   │   └── i18n/, sounds/, vendor/
│   ├── prisma.config.ts          # Prisma 7 CLI config (datasource URL)
│   ├── src/
│   │   └── prismaClient.js       # Prisma client (driver adapter)
│   ├── server.js                 # Express API server
│   └── Dockerfile                # Container definition
└── docker-compose.yml            # Service orchestration
```

### Database Schema

**Core Tables:**
- `TableType` - Pool table types (American, Snooker, etc.) with hourly rates and VAT rate
- `PoolTable` - Individual tables with status (available, occupied, maintenance)
- `Session` - Active/ended table sessions with timestamps, player count, PIN
- `TabLineItem` - Tab items (drinks, charges, settlements) linked to sessions, with VAT snapshot and soft-void/correction audit fields
- `Drink` - Menu items with prices, VAT rate and menu `category` (`cold`, `warm`, `alcoholic`, `other`)
- `Subscription` - Player subscriptions for discounts
- `Setting` - Application settings (currency, app name, discount %, public base URL, fiscal info, dashboard layout `dashboard_layout`, table-type order `table_type_order`, etc.)
- `PendingOrder` - Player-submitted drink orders awaiting staff fulfillment
- `Payment` - Card/cash payments (optional POS): provider, method, amount, status, refunded amount, provider refs, idempotency key
- `CashShift` - Cash-drawer shifts: opening float, expected/counted/variance
- `CreditNote` - VAT credit notes (avoir) created when refunding invoiced payments (sequential per year)
- `PaymentEvent` - Webhook event log for idempotency/audit (unique `event_id`)
- `Receipt` - Sequentially-numbered receipts issued at checkout (per calendar year)
- `ClosurePeriod` - Locked VAT accounting period snapshots (day/month/quarter/year); day closures created by the POS day-close store a `reconciliation_json` snapshot

**Key Relationships:**
- Session → PoolTable (many-to-one)
- Session → TabLineItem (one-to-many)
- Session → PendingOrder (one-to-many)
- PoolTable → TableType (many-to-one)
- Subscription → Session (many-to-one, optional)

**Special Fields:**
- `Session.pin` - 4-digit PIN for public table access
- `Session.number_of_players` - Player count for charge splitting
- `TabLineItem.type` - Categories: `menu_item`/`drink`, `custom_charge`, `meta`, `settlement`, `table_settlement`, `table_time`, `discount`
- `TabLineItem.vatRatePercent` / `vatAmountCents` - VAT rate and amount snapshotted at the time of sale (independent of later rate changes)
- `TabLineItem.voidedAt` / `voidedBy` / `voidReason` / `correctedFromId` - Anti-tamper audit trail: line items are never hard-deleted or overwritten. Deleting or correcting an item soft-voids the original and, if a replacement is needed, inserts a new row linked back via `correctedFromId`
- `Drink.vatRatePercent` / `TableType.vatRatePercent` - VAT rate applied to that item/table-time when sold (20% standard, 10% reduced, 0% exempt)
- `PoolTable.totalUsedSeconds` - lifetime usage in seconds; never reset
- `PoolTable.usedSinceMaintenanceSeconds` - usage in seconds since the table last left maintenance; reset to 0 when an admin moves a table from `maintenance` back to `available`
- `TableType.maxUsedHours` - optional maintenance threshold in hours (NULL = no limit). The dashboard flags a table when its current-cycle usage (stored `usedSinceMaintenanceSeconds` + the active session's elapsed time) reaches this value

## Backend API

### Core Endpoints

**Settings**
- `GET /api/settings` - Get all settings (the `smtp_pass` value is never returned; `smtp_pass_set` indicates whether one is stored)
- `PATCH /api/settings` - Update settings (SMTP keys: `smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_pass`, `smtp_from`; also `maintenance_alert_email`)

**Email**
- `POST /api/admin/smtp/test` - Send a test email using the configured SMTP settings (`{ to }`)
- `POST /api/reports/email` - Email a financial report (`{ to, format: 'html'|'pdf', report, pdfBase64? }`); the PDF is generated client-side and sent as a base64 attachment

**Table Types**
- `GET /api/table-types` - List all table types
- `POST /api/table-types` - Create table type (accepts optional `maxUsedHours`)
- `PUT /api/table-types/:id` - Update table type (accepts optional `maxUsedHours`; blank/null clears the limit)
- `DELETE /api/table-types/:id` - Delete table type

**Tables**
- `GET /api/tables` - List all tables (includes `totalUsedSeconds` and `usedSinceMaintenanceSeconds`)
- `POST /api/tables` - Create single table
- `POST /api/tables/bulk` - Create multiple tables (quantity-based)
- `PUT /api/tables/:id` - Update table (number, type, status). Renumbering to an existing number returns `409 number_in_use`
- `DELETE /api/tables/:id` - Delete table

**Sessions**
- `GET /api/sessions` - List all sessions (includes `subscriberCount`)
- `GET /api/sessions/:id` - Get session details with tab items
- `POST /api/sessions` - Start new session (generates PIN)
- `PATCH /api/sessions/:id` - Update session (`numberOfPlayers`, `subscriberCount` — clamped to the player count and stored as the subscriber-count meta line item)
- `PATCH /api/sessions/:id/end` - End session without generating a receipt (no VAT/table-time persistence; prefer `/checkout`)
- `POST /api/sessions/:id/checkout` - End session, persist the table-time charge and any discount (VAT-tagged), issue a sequential receipt, and free the table
- `POST /api/sessions/:id/settle` - Player settlement (reduce items/charges via soft-void + replacement row)
- `POST /api/sessions/:id/transfer` - Transfer session to different table

**Tab Items**
- `POST /api/tab-items` - Add item to session tab
- `PUT /api/tab-items/:id` - Update tab item (implemented as soft-void of the original + insertion of a corrected row)
- `DELETE /api/tab-items/:id` - Soft-void a tab item (never hard-deleted)

**Drinks (Menu)**
- `GET /api/drinks` - List drinks (with language support), includes `vatRatePercent` and `category`
- `POST /api/admin/drinks` - Create drink (accepts `vatRatePercent` and `category`)
- `GET /api/admin/drinks/:id` - Get drink details
- `PUT /api/admin/drinks/:id` - Update drink (accepts `vatRatePercent` and `category`)
- `DELETE /api/admin/drinks/:id` - Delete drink

**Subscriptions**
- `GET /api/subscriptions` - List all subscriptions
- `POST /api/subscriptions` - Create subscription

**Pending Orders (player self-service)**
- `POST /api/public/table/:tableNumber/order` - Player submits a drink order from the table view (requires session PIN); snapshots each item's current VAT rate
- `GET /api/pending-orders` - List pending orders for the admin dashboard panel
- `POST /api/pending-orders/:id/fulfill` - Mark an order fulfilled; creates the corresponding VAT-tagged `TabLineItem`s on the table's tab
- `POST /api/pending-orders/:id/cancel` - Cancel a pending order without adding it to the tab

**Reports**
- `GET /api/reports/financial` - Financial report by period (day/week/month/quarter/year)
- `GET /api/reports` - Chart data for analytics
- `GET /api/reports/vat` - VAT (TVA) breakdown by rate and category for a period (day/month/quarter/year), based on persisted (non-voided) `TabLineItem`s
- `GET /api/reports/vat/export` - CSV export of the detailed VAT ledger for a period

**Closures**
- `POST /api/closures` - Lock a VAT period; snapshots totals into `ClosurePeriod` and protects its sessions from `clear-history`
- `GET /api/closures` - List past closures

**Payments & cash (optional POS)**
- `GET /api/payments/config` - Feature/provider status (`pos_enabled`, `card_enabled`, provider)
- `POST /api/payments/card` - Start a card payment on the terminal (amount capped at the server-computed total; pass `idempotencyKey` — retries return the existing payment)
- `GET /api/payments/:id` / `POST /api/payments/:id/cancel` - Poll / cancel an in-progress card payment
- `POST /api/payments/:id/refund` - Refund (provider refund for cards); invoiced payments also get a `CreditNote`
- `GET /api/payments` - Recent payments with table numbers (cash screen); stale `presenting` card payments are re-synced with the provider on load
- `GET /api/credit-notes` - Issued credit notes (avoir) with receipt/table references and VAT lines
- `GET|POST /api/cash-shifts…` - Shift current/open/close/list (expected total and variance)
- `POST /api/webhooks/stripe` - Signature-verified, idempotent Stripe webhook
- `GET /api/reports/reconciliation?date=` - Day reconciliation (payments by method, credit notes, cash shifts, and Stripe settlement totals when available)
- `POST /api/reports/day-close` - Close the day (creates a day `ClosurePeriod` with reconciliation snapshot)
- `GET /api/reports/payments/export?from=&to=` - Per-method payments CSV (payments + credit notes)

**Public Access**
- `GET /api/public/tables` - Unauthenticated live table-status board data: table number, type, and status (`available`/`occupied`/`maintenance`); includes `numberOfPlayers` and `startedAt` only when occupied. Never exposes PINs, session IDs, or tab data
- `GET /api/public/table/:tableNumber` - Get table session info (requires PIN)
- `POST /api/public/table/:tableNumber/order` - Submit a drink order (requires PIN) — see Pending Orders above

**Admin**
- `DELETE /api/admin/clear-history` - Clear all ended sessions and tab data (sessions inside a closed `ClosurePeriod` are preserved)
- `GET /api/admin/backup/export` - Stream a consistent compressed `pg_dump` custom-format archive
- `POST /api/admin/backup/import` - Upload that archive (`application/octet-stream`, ≤256 MB) and restore it
  (validated against the app tables, restored with `pg_restore --single-transaction --clean --if-exists`,
  then `prisma migrate deploy`; the Prisma pool is disconnected so pooled connections see restored objects).
  Implementation: `backend/src/backup.js`; requires the `postgresql-client` tools installed in the image.

### UUID Handling Pattern

The application uses PostgreSQL UUIDs extensively. Due to mixing Prisma ORM with raw SQL, a specific pattern is required:

**For WHERE clauses with string parameters:**
```javascript
// Cast column to text for comparison
WHERE id::text = $1  // Parameter is string
```

**For INSERT statements:**
```javascript
// Generate UUID and cast parameter
const id = crypto.randomUUID();
INSERT INTO "Table" (id, ...) VALUES ($1::uuid, ...)
```

**For SELECT with UUID from database:**
```javascript
// No cast needed - database returns UUID type
WHERE pt.id = ${sess.table_id}  // sess.table_id is already UUID
```

## Frontend Architecture

### React Application

The frontend lives in `frontend/` and is a multi-entry Vite build served statically by Express:

| URL       | Entry        | Description                                              |
| --------- | ------------ | -------------------------------------------------------- |
| `/`       | `index.html` | Staff SPA with React Router (Dashboard, Admin, Settings) |
| `/tableN` | `table.html` | Player table view + drink ordering (PIN protected)       |
| `/status` | `status.html`| Public live availability board                           |

**Staff SPA (`frontend/src/`):**
- `pages/dashboard.tsx` — table grid, layouts, dialogs (start session, add drinks, transfer, checkout, settlement, QR)
- `pages/{admin-home,drinks,tables,subscriptions,reports,settings,login}.tsx`
- `components/ui/` — shadcn-style primitives (Button, Input, Card, Dialog, AlertDialog, Select, Switch, Tabs, Collapsible…)
- `lib/api.ts` — typed fetch client; `lib/auth.tsx` — session/`/api/auth/info` gate; `lib/theme.ts` — shared `localStorage.theme`
- `lib/receipts.ts` — browser-print receipts (estimate, final invoice, settlement); `lib/audio.ts` — click/pool-ball/chime cues

**State and data:** no global store — per-page `useState`/`useEffect` polling (sessions/orders), a
`SettingsProvider` (cached `/api/settings`) and a `ToastProvider` for feedback. The reports page is
lazy-loaded so chart.js/jsPDF/SheetJS only download when opened.

### shadcn CLI

`components.json` + `package.json#imports` (`#components/*`, `#lib/*`) configure the official CLI.
Add or refresh components with `npm run ui:add -- <name>` / `npm run ui:update -- --all`; a post-step
(`scripts/fix-shadcn-imports.mjs`) rewrites the CLI's `from "cn"` import to `#lib/utils`. See
[frontend/README.md](frontend/README.md).

### Dashboard layouts

The `dashboard_layout` setting selects:
- **Sections** (default): collapsible type groups with a top flag navigator (jump-and-expand); collapse
  state is stored per device in `localStorage.dashboard_collapsed_types`.
- **Tabs**: one table type per tab, with drag-to-reorder grips.

Group/tab order is persisted in the `table_type_order` setting (list of type names) and is shared with
the public status board and the table inventory page.

### Key UI Features

**Dashboard:**
- Grouped by table type with flag badges and real-time duration updates (every second)
- Quick actions: Start Session, Add drink, Transfer, Checkout, player +/- (minus opens settlement), QR code
- Pending Orders panel polls every 10s and plays the new-order chime
- Maintenance-due warnings based on table usage vs the type's `maxUsedHours`

**Session Management:**
- Multiple players per table, subscriber discount system (50% default)
- Dynamic charge calculation based on elapsed time, hourly rounding (ceil)

**Settlement System:**
- Player settles their portion and leaves; item selection (partial quantities), table-share or full charge
- Negative `table_settlement` line items, player count decremented, optional printed receipt

**Public Table View (`table.html`):**
- PIN-protected access per session, auto-refresh every 60 seconds, live timer and tab
- Menu grouped by category with tabs, search (long menus) and a sticky order bar

**Public Status Board (`status.html`, `/status`):**
- No authentication or PIN required; polls `/api/public/tables` every 5 seconds
- Tiles grouped by table type (same order as the dashboard), color-coded; occupied tiles show player count and a live duration

## Key Workflows

### Session Lifecycle

1. **Start Session**
   - Select available table
   - Set player count and subscriber count
   - System generates 4-digit PIN
   - Table marked as occupied
   - Session starts with timestamp

2. **During Session**
   - Add drinks/items to tab
   - Add custom charges
   - View real-time accumulated charges
   - Transfer to different table if needed

3. **Player Settlement** (optional)
   - Player selects items to pay for
   - Choose table share (equal split) or full charge
   - System creates negative line items
   - Items reduced or removed from tab
   - Player count decremented

4. **Checkout (End Session)**
   - Review final charges, adjust discount if needed
   - `POST /api/sessions/:id/checkout` persists the table-time charge and discount (VAT-tagged), issues a sequential receipt (per calendar year), ends the session, and frees the table — all in one transaction
   - Optional receipt printing
   - If checkout fails for any reason, the UI falls back to a bare session-end so staff are never blocked from freeing a table

### Revenue Calculation

**Table Charges:**
- Base: `hourlyRate * ceiledHours`
- With subscribers playing: Apply discount % to non-subscribers
- All subscribers: No charge
- VAT rate applied is the table type's configured `vatRatePercent`, snapshotted onto the persisted `table_time` line item at checkout

**Tab Items:**
- Direct sum of item totals
- Excludes: `meta`, `settlement`, `table_settlement` types
- Each item has its `vatRatePercent`/`vatAmountCents` snapshotted at creation time

**Report Exclusions:**
- Settlement line items (negative) are filtered out
- Voided/corrected line items (`voidedAt` set) are always excluded — the original row is kept for audit purposes but never counted twice
- Only actual charges counted in revenue

### Subscriber Discount Logic

```javascript
if (subscriberCount > 0 && nonSubscriberCount > 0) {
  // Mixed group: discount for non-subscribers
  charge = baseCharge * (1 - discountPercent / 100);
} else if (subscriberCount > 0 && nonSubscriberCount === 0) {
  // All subscribers: no charge
  charge = 0;
} else {
  // No subscribers: full charge
  charge = baseCharge;
}
```

## Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js **22.12+** (Prisma 7 and openid-client 6 requirements; matches the container image)
- PostgreSQL (via Docker)

### Running with Docker

```bash
docker compose up -d --build
```

Access at: `http://localhost:3000`. The entrypoint waits for the database, applies migrations,
generates the Prisma client and starts the server.

### Running the backend natively

```bash
docker compose up -d db
cd backend
npm install
DATABASE_URL=postgres://postgres:example@localhost:5432/pool_tables npx prisma generate
DATABASE_URL=postgres://postgres:example@localhost:5432/pool_tables npx prisma migrate deploy
DATABASE_URL=postgres://postgres:example@localhost:5432/pool_tables npm run dev
```

Prisma 7 reads the datasource URL from `prisma.config.ts` (the schema no longer contains `url`);
`prisma generate` therefore needs `DATABASE_URL` set (any value works — it does not connect).

### Frontend development

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173/ with /api and /auth proxied to :3000
npm run build    # type-checks and writes the built app into ../backend/public/
```

### Database Migrations

Migrations are in `backend/prisma/migrations/`. To create a new migration:

```bash
DATABASE_URL=... npx prisma migrate dev --name migration_name
```

### Environment Variables

Docker Compose sets:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)

## Features

### Admin Features
- Table type management (add/edit/delete with hourly rates and VAT rate)
- Table inventory (bulk creation, inline renumbering, maintenance mode, drag/arrow ordering)
- Drink menu management (multilingual, VAT rate and category per drink)
- Subscription management
- Financial reports (day/week/month/quarter/year), with a "Send" button to email the report as HTML or a client-generated PDF
- SMTP configuration (Settings) plus a test-email button
- Table maintenance alerts emailed once per cycle when a table's usage crosses its type's max
- VAT (TVA) reports with CSV export and period closures (French compliance)
- Settings (currency, app name, subscriber discount, public base URL for QR codes, dashboard layout, fiscal/legal information)
- Clear session history (closed VAT periods are protected from deletion)

### Operator Features
- Start/end sessions with PIN generation
- Real-time session monitoring
- Quick drink additions
- Pending Orders panel (player self-service orders, with audio notification) and fulfillment into the tab
- Player settlements
- Table transfers
- Custom charges
- Checkout with sequential receipt numbering
- Receipt printing

### Player Features
- Public table view with PIN access
- QR code for one-tap access to the table view, pre-filled with the session PIN
- Self-service drink ordering from the table view (PIN required)
- Real-time tab viewing
- Auto-refresh every 60 seconds

### Auto-Seeding
On server startup, the system automatically creates:
- Default table types: American (30€), Pool (25€), Snooker (40€), French (35€)
- Default drinks: Beer (6€), Soda (3€)

Only seeds if database is empty.

## API documentation

- Interactive **Swagger UI** at `/api-docs`, backed by the OpenAPI 3.0.3 spec
  `backend/public/openapi.json` (vendored Swagger UI assets in `backend/public/vendor/swagger-ui/`).
- **Auth model:** admin endpoints require the session cookie `connect.sid`; try `POST
  /auth/local/login` in Swagger UI first so same-origin calls carry the cookie. Public endpoints:
  `/health`, `/api/i18n/*`, `/api/auth/info`, `GET /api/drinks`, `/api/public/*`, Stripe webhooks.
  `GET /api/settings` returns only a public-safe subset (`app_name`, `currency`, `public_base_url`,
  `subscriber_discount`, `dashboard_layout`, `table_type_order`) unless authenticated.
- `clear-history`, SMTP/OIDC tests, session detail/transfer and patron creation require auth.

## In-app help

The **Help** menu (`/help`) renders `USER_GUIDE.md` with a generated table of contents
(react-markdown + rehype-slug). `frontend/scripts/copy-docs.mjs` copies the guide into
`backend/public/help/` during `npm run build` (env: `DOCS_SOURCE_DIR`, `DOCS_OUT_DIR`).

## Wiki

`docs/wiki/` holds the wiki pages (`Home`, `API-Reference`); `scripts/sync-wiki.sh` pushes them plus
the User Guide to the GitHub wiki. One-time prerequisite: enable the wiki and create its first page in
the GitHub UI (the wiki git repository does not exist before that).

## Testing

Backend API integration tests run with Jest + Supertest without a live database (stateful Prisma
mock; `openid-client` is stubbed because OIDC flows are not unit-tested; backup tests inject a fake
`spawn`). Current suite: **16 files / 70 tests**, run with `cd backend && npm test` (Node 22). See
[backend/tests/README.md](backend/tests/README.md) for the mocking strategy and CI setup.

## Data Integrity

### Transaction Safety
Critical operations use Prisma transactions:
- Session creation (table lock + session insert)
- Session checkout (calculate + update + release table)
- Table transfer (validate + update + swap statuses)

### Validation
- Table availability checked before session start
- PIN validation for public access (403 on failure)
- Player count minimum 1
- UUID format validation on all ID parameters

### Edge Cases Handled
- Negative settlement amounts (prevented)
- Over-settlement (cannot settle more items than exist)
- Concurrent table access (database locks)
- Orphaned occupied tables (reset on startup)
- Sale records are never hard-deleted or overwritten: deletions/corrections soft-void the original row (`voidedAt`/`voidedBy`/`voidReason`) and, where a replacement charge is needed, insert a new linked row (`correctedFromId`) — this underpins the VAT anti-tamper/audit-trail requirements
- Receipt numbering race conditions avoided via `pg_advisory_xact_lock` inside the checkout transaction

## Performance Considerations

- **Parallel Fetches:** Dashboard loads types, tables, sessions in parallel
- **Indexed Queries:** Database indexes on foreign keys and status fields
- **Minimal DOM Updates:** Duration updates only modify text content
- **Debounced Refresh:** Auto-refresh limited to 60-second intervals

## Security

- Admin dashboard requires authentication (local admin password or OIDC); `/api/admin/*` and all sale-mutating endpoints (tab item edit/delete, session settle/checkout, closures) require an authenticated session
- PIN protection for public table views and self-service drink ordering
- SQL injection prevention via parameterized queries
- CORS not configured (same-origin only)

## Known Limitations

- Staff UI strings are English-only (menu/localized endpoints support English and French)
- No real-time WebSocket updates (polling-based; sessions 15s, pending orders 10s, status board 5s)
- Manual receipt printing (browser print dialog)
- No payment integration
- Checkout-modal quantity adjustments are cosmetic/display-only and are not sent to the server (pre-existing, unrelated to VAT work)
- VAT reporting for sales recorded before the VAT-compliance feature shipped falls back to a default 20% rate assumption, since those legacy rows have no per-item VAT snapshot; see [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md)
- Table-time revenue is only persisted for VAT/receipt purposes when a session is ended via `POST /api/sessions/:id/checkout` (the "Complete Payment" button) — the legacy `PATCH /api/sessions/:id/end` route does not record a table-time sale line

## Future Enhancements

- Real-time push (WebSocket/SSE) for pending orders and session updates (currently polling)
- Full i18n of the React staff UI (locale bundles already exist for menu/locale endpoints)

## Troubleshooting

**Common Issues:**

1. **"Failed to start session"**
   - Check Docker logs: `docker logs pool-tables-manager-app-1`
   - Usually UUID casting or missing ID errors

2. **UUID operator errors**
   - Ensure using `id::text = $1` pattern for string params
   - Use `crypto.randomUUID()` for raw SQL inserts

3. **Settlement math incorrect**
   - Check that settlement/table_settlement items are excluded from revenue
   - Verify player share uses correct (net or gross) charge

4. **Database connection issues**
   - Verify PostgreSQL container is running
   - Check `DATABASE_URL` environment variable

## Contributing

When modifying the codebase:
1. Follow existing UUID casting patterns
2. Test session lifecycle thoroughly
3. Verify report calculations after data model changes
4. Update both README files for feature additions
5. Rebuild Docker containers: `docker-compose up --build -d`

## License

[Add your license information]
