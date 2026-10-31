# API Reference

Pool Tables Manager exposes a REST API used by the staff app, the player table view and the public
status board.

## Authentication

- Most admin endpoints require a **signed-in session** (session cookie `connect.sid`).
  - Local admin: `POST /auth/local/login` with `{ "username": "admin", "password": "…" }`.
  - OIDC installs: `GET /auth/login` starts the provider flow.
- In the Swagger UI (`/api-docs` on your installation) you can call `POST /auth/local/login` with
  “Try it out” — the browser keeps the same-origin session cookie for subsequent calls.
- **Public endpoints** (no session):
  - `GET /api/i18n/:locale`, `GET /health`, `GET /api/auth/info`
  - `GET /api/drinks`
  - `GET /api/public/tables`, `GET /api/public/table/:tableNumber?pin=…`,
    `POST /api/public/table/:tableNumber/order`
  - `POST /api/webhooks/stripe` (signature-verified)
- `GET /api/settings` is public but returns a **public-safe subset** (`app_name`, `currency`,
  `public_base_url`, `subscriber_discount`, `dashboard_layout`, `table_type_order`). Secrets and the
  local admin hash are only returned to an authenticated admin (and `smtp_pass` is never returned).
- Everything else returns `401` without a session: settings updates, table types/tables, sessions and
  tab items, payments/cash shifts/credit notes, reports, closures, backups, admin actions.

## Interactive documentation

Each installation serves an interactive Swagger UI at **`/api-docs`**, backed by
`/openapi.json` (OpenAPI 3.0.3). Replace `/api-docs` with your instance URL, e.g.
`http://your-server:3000/api-docs`.

## Endpoint groups

| Group | Prefix | Notes |
|---|---|---|
| Auth | `/api/auth/info`, `/auth/local/login`, `/auth/login`, `/auth/logout` | Session handling |
| Settings | `/api/settings` | Public-safe read; admin write |
| Table types & tables | `/api/table-types`, `/api/tables` | Inventory; renumbering returns 409 on duplicates |
| Sessions | `/api/sessions` | Start/end/checkout/settle/switch, tab items |
| Drinks | `/api/drinks`, `/api/admin/drinks` | Categorised menu |
| Subscriptions / patrons | `/api/subscriptions`, `/api/patrons` | Monthly memberships |
| Payments & cash | `/api/payments`, `/api/cash-shifts`, `/api/credit-notes`, `/api/webhooks/stripe` | Optional POS feature |
| Reports | `/api/reports/…`, `/api/closures` | Financial, VAT/TVA, reconciliation, CSV/PDF |
| Admin | `/api/admin/…` | SMTP/OIDC tests, clear history, database backup/restore |
| Public | `/api/public/…` | Player view and status board |

## Database backup/restore

- `GET /api/admin/backup/export` — compressed `pg_dump` custom-format archive.
- `POST /api/admin/backup/import` — upload that archive (`application/octet-stream`). Validated and
  restored into the app tables in a single transaction, then Prisma migrations are applied.
