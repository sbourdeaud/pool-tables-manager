-- Credit notes (avoir) for refunds: revenue/VAT corrections referencing a receipt.

CREATE TABLE "CreditNote" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "number" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "receipt_id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "payment_id" UUID,
  "items_json" TEXT NOT NULL,
  "subtotal_ht_cents" INTEGER NOT NULL,
  "vat_cents" INTEGER NOT NULL,
  "total_ttc_cents" INTEGER NOT NULL,
  "reason" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "CreditNote_year_number_key" ON "CreditNote"("year", "number");
CREATE INDEX "CreditNote_receipt_id_idx" ON "CreditNote"("receipt_id");
CREATE INDEX "CreditNote_created_at_idx" ON "CreditNote"("created_at");

-- Day-close reconciliation snapshot attached to a closure.
ALTER TABLE "ClosurePeriod" ADD COLUMN "reconciliation_json" TEXT;
