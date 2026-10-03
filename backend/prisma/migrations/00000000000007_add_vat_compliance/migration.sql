-- French VAT / anti-fraud compliance: rate modeling, anti-tamper audit trail,
-- sequential receipts and period closures.

-- VAT rate per drink (alcoholic = 20%, non-alcoholic consumed on-site = 10%)
ALTER TABLE "Drink" ADD COLUMN vat_rate_percent integer NOT NULL DEFAULT 20;

-- Best-effort migration of existing data: the legacy "taxable" flag was used to
-- distinguish alcoholic (taxable=true) from non-alcoholic (taxable=false) drinks,
-- so map it to the correct French VAT rate. Review/adjust per-drink afterwards.
UPDATE "Drink" SET vat_rate_percent = 10 WHERE taxable = false;

-- VAT rate per table type (table/billiard rental is a standard-rated 20% service)
ALTER TABLE "TableType" ADD COLUMN vat_rate_percent integer NOT NULL DEFAULT 20;

-- Snapshot the VAT rate/amount on each tab line item at creation time so historical
-- reports stay accurate even if rates change later, and add a soft-void/correction
-- audit trail so no sale is ever hard-deleted or silently overwritten.
ALTER TABLE "TabLineItem" ADD COLUMN vat_rate_percent integer;
ALTER TABLE "TabLineItem" ADD COLUMN vat_amount_cents integer DEFAULT 0;
ALTER TABLE "TabLineItem" ADD COLUMN voided_at timestamp;
ALTER TABLE "TabLineItem" ADD COLUMN voided_by text;
ALTER TABLE "TabLineItem" ADD COLUMN void_reason text;
ALTER TABLE "TabLineItem" ADD COLUMN corrected_from_id text;

-- Note: an index on session_id already exists from the init migration
-- (auto-named "TabLineItem_session_id_idx"), so only the new voided_at index is needed here.
CREATE INDEX "TabLineItem_voided_at_idx" ON "TabLineItem" (voided_at);

-- Sequentially numbered receipts issued at checkout (once created, never modified/deleted)
CREATE TABLE "Receipt" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL,
  year integer NOT NULL,
  session_id uuid NOT NULL,
  items_json text NOT NULL,
  subtotal_ht_cents integer NOT NULL,
  vat_cents integer NOT NULL,
  total_ttc_cents integer NOT NULL,
  discount_cents integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "Receipt_year_number_key" ON "Receipt" (year, number);
CREATE INDEX "Receipt_session_id_idx" ON "Receipt" (session_id);

-- Locked accounting period snapshots (day/month/year)
CREATE TABLE "ClosurePeriod" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL,
  period_key text NOT NULL,
  from_date timestamp NOT NULL,
  to_date timestamp NOT NULL,
  totals_json text NOT NULL,
  total_ht_cents integer NOT NULL,
  total_vat_cents integer NOT NULL,
  total_ttc_cents integer NOT NULL,
  closed_at timestamp NOT NULL DEFAULT now(),
  closed_by text
);

CREATE UNIQUE INDEX "ClosurePeriod_period_type_period_key_key" ON "ClosurePeriod" (period_type, period_key);
