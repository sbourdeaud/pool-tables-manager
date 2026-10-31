-- Webhook events recorded for idempotency/audit (POS phase 2).

CREATE TABLE "PaymentEvent" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload_json" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "PaymentEvent_event_id_key" ON "PaymentEvent"("event_id");
CREATE INDEX "PaymentEvent_provider_created_at_idx" ON "PaymentEvent"("provider", "created_at");
