CREATE TABLE "Subscription" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patron_id uuid NOT NULL,
  plan_name text NOT NULL,
  monthly_fee_cents integer NOT NULL,
  active_from timestamptz NOT NULL,
  active_until timestamptz,
  auto_renew boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON "Subscription" (patron_id);
