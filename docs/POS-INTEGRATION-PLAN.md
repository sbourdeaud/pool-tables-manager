# Point of Sale (POS) Integration Plan

Status: **Phase 1 implemented** · Branch: `pos-integration`

## 1. Decisions taken (answers to the open questions)

| # | Question | Decision |
|---|----------|----------|
| 1 | Existing bar POS / menu source of truth | **Greenfield — none.** This app remains the system of record for the menu, tabs, sales, VAT and reporting. External POS interoperability (Phase 3 in the original plan) is **deferred / out of scope** for now. |
| 2 | Which card terminal | **Stripe Terminal** (see §3). No hardware owned yet; development and CI do not require a device. |
| 3 | Split payments / tips / refunds / cash drawer | **Include split payments, refunds and cash-shift reconciliation in v1.** **Tips are deferred** (see §5) — they have French VAT/accounting nuances and are not needed to launch. |
| 4 | Internet reliability | **Cloud terminal assumed OK.** Add a small retry queue for transient failures; **cash remains the offline fallback**. |
| 5 | Certified cash register (NF525) | **This app remains the sales/payment register** (source of truth). The card reader is an acceptance device only. Start an expert-comptable review / NF525 attestation workstream **before** enabling card payments in production; do **not** advertise the software as "certified", and do **not** add a second certified POS (dual systems create double entry). |

Consequence of #1: the scope of this branch is **Shape A — payments at checkout**, built provider-agnostically so a different terminal vendor can be added later.

> **The whole feature is optional and off by default.** Enable it in **Settings → General → “Payments
> (POS)”** (`pos_enabled` setting). While disabled, checkout behaves exactly as before (no payment
> step, no payment rows, no Cash & Payments page) and the payment/cash-shift APIs return
> `409 pos_disabled`.

## 2. Goal

Close a table with **cash and/or card**, split across payers, with refunds/voids, while keeping the
existing VAT machinery untouched: sequential receipts, per-item VAT snapshots, immutable ledger and
period closures must continue to hold.

## 3. Recommended terminal: Stripe Terminal (server-driven)

| Criterion | Stripe Terminal | SumUp | Adyen | Zettle |
|---|---|---|---|---|
| Works in France/EU | ✅ | ✅ (very common in FR) | ✅ | ✅ |
| Server-driven flow (no browser secure-context requirement — important for a self-hosted HTTP LAN app) | ✅ PaymentIntent → registered reader | ⚠️ Cloud API + reader pairing via app | ✅ Terminal API | ⚠️ limited public API |
| Test without hardware | ✅ **simulated readers** + test-mode PaymentIntents | ⚠️ sandbox, fewer tools | ✅ test terminals (enterprise onboarding) | ❌ |
| Webhooks / refunds / partial capture | ✅ first-class | ✅ basic | ✅ first-class | ⚠️ |
| Integration effort for this app | Low–medium | Low–medium | Medium–high | High (little API) |

Rationale: Stripe's **server-driven integration** fits an app served over plain HTTP on the LAN (the
backend talks to Stripe's API; the reader is pre-registered in the Stripe Dashboard and connected to
Wi-Fi/Ethernet). It also provides **simulated readers**, so the entire flow can be developed and
tested before buying hardware. Shop for one reader (e.g. WisePOS E) only for the pilot.

### Testing without hardware

- **Unit/contract tests**: a `FakePaymentProvider` adapter (deterministic: success, decline, timeout,
  duplicate webhook, refund) used by Jest and the browser E2E harness.
- **Stripe test mode + simulated readers**: create test PaymentIntents against a simulated reader id;
  exercise success/decline/cancel and webhook replay without a device.
- **E2E in CI/local**: browser flows use the fake adapter; a manual sandbox run against Stripe test
  mode validates the real adapter before the pilot.

## 4. Architecture

```
React checkout ──► POST /api/payments ──► PaymentProvider adapter ──► Stripe Terminal API
       ▲                 │                        (cash | stripe | fake)
       │                 ├── reader: present / wait / capture / cancel
       │                 └── webhook /api/webhooks/stripe (signature + idempotency)
       └── status polling │
                         └── Prisma Payment rows ──► checkout finalisation ──► Receipt (unchanged)
```

- **Provider interface**: `createIntent`, `getStatus`, `cancel`, `refund`, `verifyWebhook`.
  Adapters: `cash`, `stripe`, `fake`.
- **Checkout flow**: compute totals (unchanged) → take one or more payments → only when covered,
  finalise via the existing checkout transaction (receipt numbering, VAT ledger, table release).
  A partially paid tab can remain open (parked) or be completed with a recorded remaining balance —
  decided in Phase 1; default: **must be fully covered**.
- **No card data** touches this app (Stripe reader handles it) → PCI scope stays minimal (SAQ A/A-EP).
- Outbound internet required from the backend to `api.stripe.com` and from readers to Stripe; cash is
  the fallback if either is down.

## 5. Data model (additive migrations)

- `Payment`: `id`, `sessionId`, `receiptId?`, `provider` (`cash|stripe|fake`), `amountCents`,
  `currency`, `status` (`pending|presenting|authorized|captured|failed|canceled|refunded|voided`),
  `providerRef` (unique), `methodDetails` (JSON: brand, last4, reader id), `idempotencyKey` (unique),
  `createdBy`, `createdAt`, `updatedAt`.
- `Receipt`: relation to payments (a receipt can have several), plus derived payment summary.
- `CashShift`: opening float, expected vs counted, variance, opened/closed by (cash reconciliation).
- Settings/secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, reader id — **environment variables**,
  never returned by `GET /api/settings` (also fix the existing exposure of OIDC secret / local admin
  hash in that endpoint while touching it).
- Tips (deferred): would add a `tipCents` field on `Payment` plus fiscal treatment review.

## 6. API changes

- `POST /api/payments` `{sessionId, amountCents, provider, idempotencyKey}` → `{paymentId, status, clientAction?}`
- `GET /api/payments/:id` → status (polling for reader presentation)
- `POST /api/payments/:id/cancel`, `POST /api/payments/:id/refund`
- `POST /api/webhooks/stripe` — raw-body signature verification, idempotent upsert by `providerRef`;
  never trusts amounts from the browser, only server totals.
- Checkout endpoint: link payments to the finalisation transaction; unchanged discount/VAT math.
- Reports: revenue **by payment method**; **day-close reconciliation** (app total vs reader/PSP total
  vs counted cash); VAT report/ledger unchanged.
- UI (checkout dialog): payment method selector, split rows ("add payment"), reader state machine
  (`presenting → success/declined/timeout/retry`), refund action in session history, cash-shift
  open/close screens.

## 7. Delivery phases

1. **Phase 0 — Decisions & spike (2–3 days)**
   - Confirm Stripe Terminal account eligibility and create the sandbox.
   - Spike a test PaymentIntent + simulated reader; verify webhook delivery through the venue's
     hostname/HTTPS strategy (webhooks only need server → Stripe reachability).
   - Expert-comptable review of NF525 applicability; decide the attestation track.
   - Fix secrets exposure in `GET /api/settings`.
2. **Phase 1 — Cash, split payments, payment methods, cash shift (3–5 days, no vendor dependency)**
   - `Payment` model (provider `cash`), split payments UI, methods on receipts, per-method reporting,
     cash-shift open/close with variance. Ships useful value immediately and de-risks Phase 2.
3. **Phase 2 — Stripe Terminal adapter (1–2 weeks)**
   - Reader registration via Dashboard; server-driven PaymentIntent flow; webhook handling
     (signature, replay, idempotency); refunds/voids; UI states; audit logging; fake adapter for tests.
4. **Phase 3 — Day-close & accounting**
   - Reconciliation tied to `ClosurePeriod`, per-method CSV export, variance alerts.
5. **Phase 4 — Pilot & rollout**
   - Purchase one reader (WisePOS E or equivalent), pilot on a single table for a few days, then
     enable for all staff; keep cash path available at all times.

**Out of scope (revisit later):** external POS menu/sales sync (no existing POS), tips, customer
self-payment from the player phone (would need hosted checkout on the phone — separate project).

## 8. Security & compliance checklist

- Webhook signature verification, replay protection, idempotency keys on all payment mutations.
- Secrets in environment only; no provider secret in API responses or logs.
- Refunds/voids require authenticated admin; rate limiting already present.
- Receipt numbering, VAT snapshots, immutability and closures untouched — covered by existing tests.
- Do not display "NF525 certified" anywhere unless a certification/attestation is actually obtained.

## 9. Testing & acceptance

- Unit: payment state machine, amount reconciliation (`sum(payments) == receipt total`), refund and
  split invariants, webhook duplicate handling.
- Contract: `FakePaymentProvider` + webhook replay tests in Jest.
- E2E (browser): cash, split, card success/decline/timeout, retry, refund, cash-shift reconciliation.
- Regression gate: **VAT totals and receipt sequences unchanged** by payment flows.
- Acceptance: close a table with cash and/or card, receipt shows method(s), day-close reconciles to
  the cent, variance is surfaced.

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Internet outage during payment | Retry queue; cash fallback; clear UI message; parked tab until paid |
| NF525 applicability if we record payments | Attestation workstream before production; keep audit trail; accountant sign-off |
| Reader hardware unavailable for dev | Stripe simulated readers + fake adapter; buy one reader only for pilot |
| Scope creep into full POS | This plan's phases; external POS sync explicitly out of scope |
| Provider lock-in | Adapter interface; vendor-specific code isolated in one module |

## 10bis. Phase 3 — implementation status (this branch)

Implemented:

- **VAT credit notes (avoir)** — refunding an invoiced payment creates a sequentially numbered
  `CreditNote` (per year) with the refund allocated across the receipt's VAT-rate buckets; lines are
  stored negative. The VAT report subtracts them per rate (and adds a `refund` category), the VAT CSV
  ledger export includes the negative lines, the financial report shows a “Refunds (credit notes)”
  row (totals net of refunds), and the refund API response returns the credit-note number.
  Refunds before checkout (payment not yet invoiced) are recorded without a credit note.
- **Day close & reconciliation** — `GET /api/reports/reconciliation?date=` returns payments by method,
  credit notes and cash-shift expected/counted/variance; `POST /api/reports/day-close` creates a
  **day `ClosurePeriod`** with the reconciliation snapshot (`reconciliation_json`), refuses while a
  cash shift is open, and is idempotent (409 if already closed).
- **Per-method CSV export** — `GET /api/reports/payments/export?from=&to=` (payments + credit-note
  corrections) with an “Export CSV” button on the Cash & Payments page.
- **Variance alerts** — closing a cash shift with a non-zero variance emails the configured
  maintenance address (best effort; failures never block the close).
- **Tests** — new `backend/tests/pos-phase3.test.js` (credit-note VAT split, no-note refunds,
  VAT report subtraction, reconciliation totals, day-close guards/idempotency, CSV content):
  suite total **15 files / 57 tests**.

**Follow-up polish (done):** credit notes are listed on the Cash & Payments page and can be
**printed** (browser print / save as PDF) with the original receipt reference and VAT breakdown;
partial refunds with a reason are supported from the UI; the Cash page shows whether a card terminal
is configured; the VAT report labels the refund category correctly.

**Hardening (done):** card creation is idempotent (client key; retries reuse the payment); stale
`presenting` card payments are re-synced with the provider when the Cash page loads and can be
**cancelled** from the list; day-close reconciliation now shows **Stripe settlement totals**
(gross/refunds/fees from balance transactions) and the difference vs the app's card totals when the
live API is available. Tests: **15 suites / 61 tests**.

**Phase 3 limits:** day close is per calendar day; terminal settlement comparison requires live
Stripe API access (test mode shows “unavailable”); variance alerts need SMTP configured.

## 11. Phase 2 — implementation status (this branch)

**Card payments via Stripe Terminal (server-driven)** are now implemented alongside the Phase 1 cash
flow. The card provider is optional and selected per deployment:

- `PAYMENT_PROVIDER=fake` — deterministic in-memory provider for tests/dev (no hardware, no network).
- `STRIPE_SECRET_KEY` set — Stripe Terminal. `STRIPE_TERMINAL_READER_ID` selects the (Dashboard-
  registered) reader; `STRIPE_WEBHOOK_SECRET` secures `POST /api/webhooks/stripe`.

Implemented:

- `POST /api/payments/card` — creates the PaymentIntent, starts the reader flow, records a `Payment`
  row (`presenting`), and **caps the amount at the server-computed total due**.
- `GET /api/payments/:id` — polls and syncs the live provider status.
- `POST /api/payments/:id/cancel` — cancels the terminal action + intent.
- `POST /api/payments/:id/refund` — card refunds through the provider (cash unchanged).
- Checkout **attaches captured card payments** (`payments: [{method:'card', paymentId}]`); attaching
  requires a captured, unattached payment belonging to the same session; totals must match.
- Webhook: signature verification (`stripe.webhooks.constructEvent`), raw body, **idempotent** via
  the `PaymentEvent` table (`event_id` unique), `payment_intent.succeeded/canceled/payment_failed`
  update payment statuses.
- Checkout dialog: card button per remaining balance, "present card…" state with cancel, decline
  banners, discount inputs locked while payments exist (prevents amount drift).

**Limits:** one pre-registered reader via env (multi-reader/pooling later); webhooks must reach the
server (public HTTPS/tunnel during pilot); only Stripe test mode until the pilot.

## 12. Phase 1 — implementation status (this branch)

Implemented behind the optional `pos_enabled` toggle:

- **Cash payments at checkout** with **split payments** (multiple cash payers, tendered amount and
  change); checkout refuses to complete while a balance remains.
- **Receipts** now carry payment lines (method, amount, change) on screen and in the printed invoice.
- **Cash & Payments admin page** (Admin → Cash & Payments, only shown when enabled): open/close a
  cash shift, expected drawer total (opening float + net cash), counted amount and **variance**,
  recent payments with **refunds** (payment-level, capped at the captured amount), closed-shift history.
- **Reports**: “Paid by cash/card” rows in the financial report summary and in the PDF/Excel exports.
- **API**: `GET /api/payments`, `POST /api/payments/:id/refund`,
  `GET|POST /api/cash-shifts…`, payment handling in `POST /api/sessions/:id/checkout`
  (`payments: [{method, amountCents, tenderedCents?}]`), `byPaymentMethod` in the financial report.
- **Tests**: `backend/tests/pos.test.js` (gating, cash-shift open/close/variance, refund limits,
  payments list, report gating) — suite total 13 files / 44 tests.

**Known Phase 1 limits (by design):**

- Cash only; card terminals arrive with the Stripe adapter (Phase 2).
- Refunds are recorded at payment level for drawer reconciliation; **VAT credit notes (avoir)** are
  part of the accounting phase — refunds should be exceptional and manager-approved until then.
- One venue/one register; multi-terminal reconciliation is out of scope.

## 12. Open items to confirm before Phase 2 code

- Stripe account ready + region/terminal eligibility.
- Webhook endpoint reachable (public HTTPS or tunnel during pilot; note: the app itself stays HTTP
  inside the LAN — only Stripe → server webhooks need reachability, which can be solved with a tunnel
  or reverse proxy during the pilot).
- Pilot reader model and mounting/networking at the bar.
- Expert-comptable verdict on NF525 attestation.
