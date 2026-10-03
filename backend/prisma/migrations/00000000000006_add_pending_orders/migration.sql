-- Pending drink orders placed by players from the table view, awaiting staff fulfillment
CREATE TABLE "PendingOrder" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  table_id uuid NOT NULL,
  items_json text NOT NULL,
  total_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  fulfilled_at timestamp
);

CREATE INDEX "PendingOrder_session_id_idx" ON "PendingOrder" (session_id);
CREATE INDEX "PendingOrder_status_idx" ON "PendingOrder" (status);
