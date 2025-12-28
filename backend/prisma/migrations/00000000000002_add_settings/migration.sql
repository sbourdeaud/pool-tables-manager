CREATE TABLE "Setting" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL
);

-- Seed default currency setting
INSERT INTO "Setting" (key, value) VALUES ('currency', '$') ON CONFLICT (key) DO NOTHING;
