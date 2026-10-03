# French VAT / Anti-Fraud Compliance — Conformity Notes

**⚠️ This document is informational only and is NOT legal or tax advice.**
Before relying on it (and before your first VAT filing), have your
**expert-comptable** review this application's record-keeping against your
specific situation (VAT regime, SIRET/APE code, turnover thresholds, etc.).

## 1. Legal context

Since **1 January 2018**, French tax law (article 286, I-3° bis of the *Code
général des impôts*, implementing the anti-fraud measure introduced by the
*loi de finances 2016*) requires any taxpayer subject to VAT who records
customer payments using software or a cash register system to use software
that guarantees:

- **Inaltérabilité** — data cannot be altered after the fact without leaving
  a trace.
- **Sécurisation** — the integrity of recorded data is protected.
- **Conservation** — data is retained for the legally required period.
- **Archivage** — data can be archived/exported for inspection.

Compliance must be evidenced either by a **certificate issued by an
accredited body (certification NF525 / LNE)** or by an **"attestation
individuelle de conformité"** issued by the software publisher.

This application is self-hosted, custom software, not a commercially
certified NF525 product. This document records, in good faith, how the
application attempts to satisfy the four ISCA criteria above, as a basis for
the attestation individuelle. **It does not replace an official NF525
certificate**, and a tax auditor may still require further justification.

## 2. How each criterion is implemented in this application

### 2.1 Inaltérabilité (immutability)

- Tab line items (`TabLineItem`) are **never hard-deleted or overwritten**
  once created. Any "delete", "edit quantity", or "settle partially" action
  in the admin UI instead:
  - marks the original row with `voided_at`, `voided_by` (the logged-in
    staff member), and `void_reason`, and
  - if a replacement charge is needed (e.g. a corrected quantity), inserts a
    **new** row linked back to the original via `corrected_from_id`.
- The original row's `total_cents`, `unit_price`, `vat_rate_percent`, and
  `vat_amount_cents` are never mutated after creation.
- Receipts (`Receipt`) are generated once at checkout with a sequential
  number and are never updated or deleted by the application.
- Closed accounting periods (`ClosurePeriod`) block the admin "Clear All
  Session History" tool from deleting any session that ended within a
  closed period's date range.

### 2.2 Sécurisation (security)

- All endpoints that can create, modify, void, or settle a sale, or close a
  VAT period, require an authenticated admin session (`requireAuth`
  middleware). Two previously-unauthenticated endpoints (item deletion and
  mid-session settlement) were closed off as part of this work.
- Every void/correction records the **actor** (`voided_by` / `closed_by`),
  resolved from the authenticated admin session or OIDC identity.
- The database itself (PostgreSQL) is not directly reachable from outside
  the Docker network; only the application container talks to it.

### 2.3 Conservation (retention)

- Ended sessions, their tab line items (including voided/corrected rows),
  receipts, and closure snapshots remain in the database indefinitely unless
  explicitly purged via the admin "Clear All Session History" tool — which
  itself now **refuses to delete anything inside a closed VAT period**.
- French law requires accounting records be kept for **at least 6 years**
  (10 years is commonly recommended for commercial records under the Code
  de commerce). Operationally, this means: do not clear history for data
  more recent than your applicable retention period, and keep regular
  database backups outside the container.

### 2.4 Archivage (archival / export)

- `GET /api/reports/vat/export` produces a CSV export of every non-voided
  sale line in a given period (date, session, type, description, quantity,
  unit price, VAT rate, VAT amount, HT amount) — suitable for handing to an
  accountant or for long-term archival outside the live database.
- `POST /api/closures` snapshots the full VAT breakdown for a period
  (`totals_json`, HT/VAT/TTC totals) into the `ClosurePeriod` table at the
  moment of closing, independent of later report recomputation.

## 3. What the application now provides for VAT reporting

| Feature | Where |
|---|---|
| Per-drink VAT rate (20% standard / 10% reduced / 0% exempt) | Admin → Drinks Menu |
| Per-table-type VAT rate (table/billiard rental) | Admin → Table Types & Inventory |
| VAT rate + amount snapshotted on every sale at the time of sale | Automatic (server-side) |
| Soft-void / correction audit trail instead of hard delete/update | Automatic (server-side) |
| Sequential, gap-free receipt numbering per calendar year | Automatic at "Complete Payment" (checkout) |
| TVA (VAT) report by period (day/month/quarter/year), broken down by rate and category | Admin → Reports → "TVA (VAT) Report" |
| CSV export of the underlying VAT ledger | Admin → Reports → "Export CSV" |
| Period closure / lock (prevents later deletion of filed data) | Admin → Reports → "🔒 Close Period" |
| Fiscal identity fields (legal name, SIRET/SIREN, TVA number, address, VAT regime, declaration periodicity) | Admin → Settings → "Fiscal / Legal Information" |

## 4. Known limitations — please read before relying on reports

1. **Historical data predating this feature.** Sales recorded before this
   update do not have a per-item VAT rate stored. The VAT report falls back
   to a default **20%** assumption for those legacy rows, and the one-time
   data migration mapped legacy "non-taxable" drinks to **10%** as a
   best-effort guess. **Review your historic drink list's VAT rates** in
   Admin → Drinks Menu, and treat any VAT figures for periods before this
   feature shipped as indicative only, not final.
2. **Table-time revenue requires using "Complete Payment".** Table/billiard
   rental charges are only durably persisted as a VAT-tagged sale when a
   session is ended via the **"✓ Checkout" → Complete Payment** flow (which
   also issues the sequential receipt). Ending a session via a raw "End
   Session" admin action does **not** record a table-time sale line, so it
   will be absent from the VAT report and from the receipt sequence. Always
   use Checkout for sessions that generated revenue.
3. **Checkout quantity adjustments are cosmetic.** In the checkout modal,
   changing an item's quantity field updates the on-screen total only; it is
   not sent to the server or reflected in the persisted sale. This is a
   pre-existing issue, unrelated to VAT, that should be fixed separately if
   you rely on adjusting quantities at checkout time.
4. **This is not a certified NF525 cash register system.** If your business
   circumstances require a certified system (consult your
   expert-comptable), this application's self-attestation may not be
   sufficient and a commercially certified product or module may be
   required instead.

## 5. Suggested operating procedure for the business owner

1. Each month (or quarter, depending on your VAT regime), open
   Admin → Reports → "TVA (VAT) Report", select the period you're about to
   declare, and review the HT / TVA / TTC breakdown by rate.
2. Export the CSV and keep it alongside your accounting records.
3. Once you have filed your CA3 (monthly/quarterly réel normal) or CA12
   (annual réel simplifié) declaration with the figures, click
   **"🔒 Close Period"** to lock that period against later deletion.
4. Keep regular backups of the PostgreSQL database (`pg_dump`), independent
   of this application, as your durable archive.

---
*Generated as part of implementing French VAT/anti-fraud compliance
features in this application. Last updated: see git history for this file.*
