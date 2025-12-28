-- Add uuid generator (pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "User" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'user',
  preferred_language text,
  preferred_theme text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "TableType" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_fr text,
  base_hourly_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "PoolTable" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_type_id uuid NOT NULL REFERENCES "TableType"(id) ON DELETE CASCADE,
  number integer NOT NULL,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON "PoolTable" (table_type_id);

CREATE TABLE "Drink" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_fr text,
  price_cents integer NOT NULL,
  taxable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "Session" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES "PoolTable"(id) ON DELETE CASCADE,
  patron_id uuid REFERENCES "User"(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON "Session" (table_id);

CREATE TABLE "TabLineItem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES "Session"(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  total_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON "TabLineItem" (session_id);

CREATE TABLE "Transaction" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES "User"(id),
  session_id uuid REFERENCES "Session"(id),
  amount_cents integer NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON "Transaction" (created_at);
