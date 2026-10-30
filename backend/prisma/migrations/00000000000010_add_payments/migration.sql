-- Optional POS/payments feature (gated behind the "pos_enabled" setting).

CREATE TABLE "Payment" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "receipt_id" UUID,
  "provider" TEXT NOT NULL DEFAULT 'cash',
  "method" TEXT NOT NULL DEFAULT 'cash',
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" TEXT NOT NULL DEFAULT 'captured',
  "provider_ref" TEXT,
  "details_json" TEXT,
  "idempotency_key" TEXT,
  "refunded_cents" INTEGER NOT NULL DEFAULT 0,
  "created_by" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "Payment_provider_ref_key" ON "Payment"("provider_ref");
CREATE UNIQUE INDEX "Payment_idempotency_key_key" ON "Payment"("idempotency_key");
CREATE INDEX "Payment_session_id_idx" ON "Payment"("session_id");
CREATE INDEX "Payment_receipt_id_idx" ON "Payment"("receipt_id");
CREATE INDEX "Payment_created_at_idx" ON "Payment"("created_at");

CREATE TABLE "CashShift" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "opening_float_cents" INTEGER NOT NULL DEFAULT 0,
  "opened_by" TEXT,
  "opened_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "counted_cents" INTEGER,
  "expected_cents" INTEGER,
  "variance_cents" INTEGER,
  "closed_by" TEXT,
  "closed_at" TIMESTAMPTZ,
  "notes" TEXT
);

CREATE INDEX "CashShift_opened_at_idx" ON "CashShift"("opened_at");
