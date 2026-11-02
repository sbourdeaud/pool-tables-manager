CREATE TABLE "VenueEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description TEXT,
  event_date DATE NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  start_time TEXT,
  end_time TEXT,
  table_type_ids_json TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CHECK (
    (all_day AND start_time IS NULL AND end_time IS NULL)
    OR
    (NOT all_day AND start_time ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$' AND end_time ~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$' AND end_time > start_time)
  )
);

CREATE INDEX "VenueEvent_event_date_idx" ON "VenueEvent" (event_date);
