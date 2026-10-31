# Pool Tables Manager

A full-featured pool hall management system with session tracking, billing, subscriptions, drink
ordering and reporting — with a modern React UI and a French VAT (TVA) compliant sale ledger.

> [!NOTE]
> **AI-generated code**: This application is coded using AI (built pair-programming style with [Kilo Code](https://github.com/Kilo-Org/kilocode), an agentic coding assistant). Review the code and test it in your own environment before using it in production.

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Technology Stack](#technology-stack)
- [Development](#development)
- [Updating](#updating)
- [Documentation](#documentation)
- [Support](#support)

## Features

- **Session Management**: Track active sessions, players and table usage with live timers
- **Billing System**: Time-based billing (rounded up per hour) with subscriber discounts
- **Subscriptions**: Monthly subscriptions with automatic discounts and renewal tracking
- **Drink Ordering**: Categorised menu (cold / warm / alcoholic / other) that players can order from their phone (PIN-protected); staff fulfil orders from the dashboard queue with an audio notification
- **QR Codes**: Every active table shows a QR code linking to its player view, with a configurable public hostname
- **Multiple Dashboard Layouts**: Collapsible sections with a flag navigator, or one table type per tab with drag-to-reorder — configurable in Settings
- **Reporting**: Financial reports by day/week/month/quarter/year with charts, PDF/Excel export and email delivery
- **Database Backups**: one-click export of a consistent, compressed snapshot and transactional restore — Admin → Database Backup
- **Optional Payments (POS)**: cash and card-terminal payments with split payers and change, payment methods on receipts, cash-shift reconciliation, refunds with **VAT credit notes (avoir)**, day-close reconciliation tied to accounting closures, and per-method CSV export — off by default, enable in Settings
- **French VAT (TVA) Compliance**: Per-item VAT rates, anti-tamper audit trail, sequential receipts, a VAT report with CSV ledger export, and period closures — see [VAT-COMPLIANCE.md](VAT-COMPLIANCE.md)
- **Authentication**: OIDC integration or local admin authentication (full-page login)
- **Multi-language**: English and French menu/locale support

## Screenshots

**Dashboard** — live sessions with timers, tabs, per-table QR codes, a flag navigator and collapsible groups:

![Dashboard with active sessions and collapsible type groups](docs/screenshots/dashboard.png)

**Dashboard (tabs layout)** — one table type per tab; drag the grips to reorder:

![Dashboard in tabs layout](docs/screenshots/dashboard-tabs.png)

**Dashboard (dark theme)** — the default look; the theme toggle also provides a light theme across the staff app and player pages:

![Dashboard in dark theme](docs/screenshots/dashboard-dark.png)

**Admin panel** — drinks menu, table types & inventory, subscriptions, reports and settings:

![Admin panel](docs/screenshots/admin-panel.png)

**Database backup** — download a compressed snapshot or restore one (Admin → Database Backup):

![Database backup](docs/screenshots/backup.png)

**Drink menu management** — categories group the menu on the player ordering screen:

![Drink menu management with categories](docs/screenshots/drinks-menu.png)

**Table inventory** — inline renumbering, maintenance mode and drag-ordered type groups:

![Table inventory](docs/screenshots/table-inventory.png)

**Settings** — branding, localization, dashboard layout, fiscal, email and security:

![Settings page](docs/screenshots/settings.png)

**Financial reports** — revenue summary with pie and time-series charts:

![Financial reports](docs/screenshots/reports-financial.png)

**VAT / TVA report** — per-rate breakdown, CSV ledger export and accounting period closures:

![VAT report](docs/screenshots/vat-report.png)

**Public table status board** (`/status`) — no login required, updates automatically:

![Public status board](docs/screenshots/public-status.png)

**Player table view** — reached by scanning a table's QR code (PIN-protected): live timer, tab and categorised drink ordering:

![Player table view](docs/screenshots/table-view.png)

**Payments (POS, optional)** — split cash/card payments at checkout, card-terminal flow and cash-shift reconciliation:

![Checkout with split cash/card payments](docs/screenshots/pos-checkout.png)

![Card terminal waiting for the customer](docs/screenshots/pos-card.png)

![Cash & Payments with day-close reconciliation](docs/screenshots/pos-cash.png)

**In-app documentation** — Help menu renders the User Guide with a table of contents; `/api-docs` is an interactive Swagger UI:

![In-app help](docs/screenshots/help.png)

![API reference (Swagger UI)](docs/screenshots/api-docs.png)

**Login** — full-page local admin login (OIDC deployments redirect to the identity provider):

![Login page](docs/screenshots/login.png)

## Quick Start

```bash
git clone <repository-url>
cd pool-tables-manager
```

**Option A — prebuilt image** (published to GHCR on every release, amd64 + arm64):

```bash
docker compose pull && docker compose up -d
```

Pin a version with `IMAGE_TAG`, e.g. `IMAGE_TAG=v1.1.0 docker compose pull && IMAGE_TAG=v1.1.0 docker compose up -d`.

**Option B — build from source:**

```bash
docker compose up -d --build
```

In both cases the application initialises the database (all migrations), generates the Prisma client
and starts the server automatically.

**Access**: <http://localhost:3000> — on first launch you are asked to define the local admin password
(or enable OIDC later in Settings → Security).

## Technology Stack

| Layer     | Stack                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------- |
| Frontend  | React 19 · TypeScript 7 · Vite 8 · Tailwind CSS 4 · shadcn-style components on Radix UI (CLI-enabled) |
| Backend   | Node.js 22 · Express 5 · Prisma ORM 7 (driver adapter) · openid-client 6 · nodemailer               |
| Database  | PostgreSQL 18                                                                                       |
| Testing   | Jest 30 + Supertest (API integration)                                                               |
| Packaging | Docker & Docker Compose                                                                            |

The React app is built into `backend/public/` and served by Express (staff SPA at `/`, player app at
`/tableN`, public board at `/status`). The previous vanilla-JS client is archived at `/classic/`
(unlinked) for reference and rollback.

## Development

```bash
# Backend API tests (Node 22 required)
cd backend && npm test

# Frontend dev server (proxies /api and /auth to :3000)
cd frontend && npm install && npm run dev

# Frontend production build (writes index.html/table.html/status.html + assets into backend/public/)
cd frontend && npm run build

# Database
docker exec -it pool-tables-manager-db-1 psql -U postgres -d pool_tables

# Logs
docker compose logs -f app
```

## Updating

```bash
git pull
docker compose up -d --build
```

Database migrations (if any) are applied automatically at container start — see
[UPGRADE-GUIDE.md](UPGRADE-GUIDE.md) for the database impact of each release.

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)**: deployment guide, backups, troubleshooting
- **[DEVELOPER_README.md](DEVELOPER_README.md)**: architecture, API reference and development guide
- **[USER_GUIDE.md](USER_GUIDE.md)**: staff and player documentation
- **[VAT-COMPLIANCE.md](VAT-COMPLIANCE.md)**: French VAT/anti-fraud conformity notes
- **[UPGRADE-GUIDE.md](UPGRADE-GUIDE.md)**: version history and upgrade checklists
- **[docs/POS-INTEGRATION-PLAN.md](docs/POS-INTEGRATION-PLAN.md)**: point-of-sale / card terminal integration plan
- **[frontend/README.md](frontend/README.md)**: React app, shadcn CLI workflow and build notes
- **[backend/tests/README.md](backend/tests/README.md)**: testing documentation and CI integration
- **In-app help**: the user guide is available at `/help` in the app (Help menu) and in the [repository wiki](https://github.com/sbourdeaud/pool-tables-manager/wiki)
- **API reference**: interactive Swagger UI at `/api-docs` (OpenAPI spec at [`openapi.json`](backend/public/openapi.json))

## Support

For deployment issues, see [DEPLOYMENT.md](DEPLOYMENT.md). For API documentation, see
[DEVELOPER_README.md](DEVELOPER_README.md).
