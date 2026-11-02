CREATE TABLE "WaitlistEntry" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patron_name TEXT NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  table_type_id UUID NOT NULL,
  table_type_name TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE INDEX "WaitlistEntry_table_type_id_created_at_idx" ON "WaitlistEntry" (table_type_id, created_at);
