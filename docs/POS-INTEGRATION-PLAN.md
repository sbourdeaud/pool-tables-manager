# Point of Sale (POS) Integration Plan

Status: **proposal** · Branch: `pos-integration` · No database changes proposed in this document yet.

## 1. Decisions taken (answers to the open questions)

| # | Question | Decision |
|---|----------|----------|
| 1 | Existing bar POS / menu source of truth | **Greenfield — none.** This app remains the system of record for the menu, tabs, sales, VAT and reporting. External POS interoperability (Phase 3 in the original plan) is **deferred / out of scope** for now. |
| 2 | Which card terminal | **Stripe Terminal** (see §3). No hardware owned yet; development and CI do not require a device. |
| 3 | Split payments / tips / refunds / cash drawer | **Include split payments, refunds and cash-shift reconciliation in v1.** **Tips are deferred** (see §5) — they have French VAT/accounting nuances and are not needed to launch. |
| 4 | Internet reliability | **Cloud terminal assumed OK.** Add a small retry queue for transient failures; **cash remains the offline fallback**. |
| 5 | Certified cash register (NF525) | **This app remains the sales/payment register** (source of truth). The card reader is an acceptance device only. Start an expert-comptable review / NF525 attestation workstream **before** enabling card payments in production; do **not** advertise the software as "certified", and do **not** add a second certified POS (dual systems create double entry). |

Consequence of #1: the scope of this branch is **Shape A — payments at checkout**, built provider-agnostically so a different terminal vendor can be added later.

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

## 11. Open items to confirm before Phase 2 code

- Stripe account ready + region/terminal eligibility.
- Webhook endpoint reachable (public HTTPS or tunnel during pilot; note: the app itself stays HTTP
  inside the LAN — only Stripe → server webhooks need reachability, which can be solved with a tunnel
  or reverse proxy during the pilot).
- Pilot reader model and mounting/networking at the bar.
- Expert-comptable verdict on NF525 attestation.
