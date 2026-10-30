# Frontend (React + Tailwind + shadcn-style)

The full app UI, served by the Express backend. The previous client is archived (unlinked) at
`/classic/` (static copy in `backend/public/classic/`) for reference only.

| URL      | Entry            | Description                                        |
| -------- | ---------------- | -------------------------------------------------- |
| `/`      | `index.html`     | Staff SPA (Dashboard, Admin, Settings) — React Router |
| `/tableN`| `table.html`     | Player-facing table view + drink ordering (PIN)    |
| `/status`| `status.html`    | Public live availability board                     |
| `/classic/` | legacy        | Archived previous UI (not linked anywhere)         |

## Stack

- React 18 + TypeScript + Vite 5 (Node 18 compatible)
- Tailwind CSS 3 with shadcn-style tokens (`src/index.css`); dark mode via `.dark` + `data-theme="dark"`
- shadcn-style primitives vendored in `src/components/ui/` (Radix UI under the hood)
- QR codes rendered from the existing `/vendor/qrcode.js` (copy lives in `backend/public/vendor/`)

## Development

```bash
npm install
npm run dev        # http://localhost:5173/ — proxies /api, /auth and /vendor to localhost:3000
```

Start the backend (`docker compose up -d db` + `npm run dev` in `backend/`).

## Build

```bash
npm run build      # type-checks (tsc) then writes index.html, table.html, status.html + assets/ to ../backend/public/
```

The backend serves the build directly from `backend/public/`. If running from Docker, rebuild the
image so the new static files are copied in: `docker compose up -d --build app`.

## Structure

```
src/
  main.tsx                    staff SPA: providers, auth gate, router
  pages/                      dashboard, admin-home, drinks, tables, subscriptions, reports, settings, login
  table/                      player table app (entry src/table/main.tsx)
  status/                     public status board (entry src/status/main.tsx)
  components/ui/              shadcn-style primitives (button, input, card, dialog, select, switch, ...)
  components/settings/        settings sections + field/switch helpers
  lib/                        api client, auth context, theme, formatting, QR helpers
```

## Auth

Local admin login/setup is handled by `src/pages/login.tsx`. OIDC-enabled installs are redirected to
`/auth/login` by the server flow. All `/api/*` writes remain protected server-side.

## Notes

- Checkout, player settlement, receipt printing (estimate / invoice / settlement) and financial
  reports (charts, PDF, Excel, email) are all migrated.
- The reports page is lazy-loaded: chart.js/jsPDF/XLSX only download when it is opened.
- The Reports page also exposes the VAT (TVA) report (per-rate/per-category breakdown, CSV ledger
  export) and accounting-closure workflow (close a period, list closed periods) — these APIs had no
  UI in the previous client.
- Audio cues (click / pool-ball / new-order chime) respect the "Audio Cues" device toggle.
- Drinks have a `category` (cold / warm / alcoholic / other): the player menu shows category tabs,
  grouped sections, search (long menus) and a sticky order bar; the admin page and the dashboard's
  add-drink dialog use the same grouping.
- Table numbers can be edited inline in Admin → Table Types & Inventory (duplicate numbers return 409).
- Optional POS (Settings → General → “Payments (POS)”): split cash/card payments, card-terminal flow
  (Stripe Terminal server-driven or `PAYMENT_PROVIDER=fake`), cash-shift reconciliation, refunds with
  VAT credit notes, day close and per-method CSV export (Admin → Cash & Payments).
- Dashboard layout is configurable in Settings → General: **Sections** (collapsible groups + flag
  navigator, collapse state per device) or **Tabs** (one type at a time; drag the grips to reorder).
- The dashboard can also be reordered by dragging groups/sections; order is stored in the
  `table_type_order` setting and shared with the status board and admin tables page.

## shadcn CLI

The project is configured for the official shadcn CLI (`components.json`, package.json `imports`
with `#components/*` / `#lib/*`). Add or refresh components with:

```bash
npm run ui:add -- button dialog   # add components from the registry
npm run ui:update -- --all        # re-fetch components you already use (overwrite)
```

`scripts/fix-shadcn-imports.mjs` runs automatically after either command: the CLI emits
`import { cn } from "cn"` regardless of the configured alias, and the script rewrites it to
`#lib/utils` so generated files build without manual edits.

## Known environment quirk (WSL2 / DrvFS mounts)

On this machine, Node's large single-write path truncates files at exactly 512 KiB when writing to
`/mnt/*` mounts. That corrupts both `npm install` (esbuild binary) and Vite build output (big
chunks). Reliable workflow: build on the native filesystem, then **copy** the artifacts in:

```bash
rsync -a --exclude node_modules ./ /home/$USER/pool-frontend/
cd /home/$USER/pool-frontend && npm install
npm run build -- --outDir ./dist --emptyOutDir
cp dist/index.html dist/table.html dist/status.html /mnt/d/git/pool-tables-manager/backend/public/
rm -rf /mnt/d/git/pool-tables-manager/backend/public/assets
mkdir -p /mnt/d/git/pool-tables-manager/backend/public/assets
cp -r dist/assets/. /mnt/d/git/pool-tables-manager/backend/public/assets/
```

Building from native Windows (NTFS) is unaffected.
