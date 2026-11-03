CREATE TABLE "SessionPlayer" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES "Session"(id) ON DELETE CASCADE,
  player_number INTEGER NOT NULL,
  is_subscriber BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ(3),
  status TEXT NOT NULL DEFAULT 'active',
  settled_table_cents INTEGER NOT NULL DEFAULT 0,
  settled_at TIMESTAMPTZ(3),
  settled_by TEXT,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "SessionPlayer_session_id_player_number_key" ON "SessionPlayer"("session_id", "player_number");
CREATE INDEX "SessionPlayer_session_id_status_idx" ON "SessionPlayer"("session_id", "status");

-- Approximate the per-seat ledger for sessions that were already running when
-- this feature was deployed. Subscribers started with the session; non-subscriber
-- seats start at the legacy billing-start marker when one exists.
WITH active_sessions AS (
  SELECT
    s.id,
    s.started_at,
    COALESCE(s.number_of_players, 1) AS player_count,
    COALESCE((
      SELECT t.quantity::int
      FROM "TabLineItem" t
      WHERE t.session_id = s.id
        AND t.type = 'meta'
        AND t.description = 'subscriber_count'
        AND t.voided_at IS NULL
      LIMIT 1
    ), 0) AS subscriber_count,
    (
      SELECT t.created_at
      FROM "TabLineItem" t
      WHERE t.session_id = s.id
        AND t.type = 'meta'
        AND t.description = 'non_subscriber_started_at'
        AND t.voided_at IS NULL
      LIMIT 1
    ) AS non_subscriber_started_at
  FROM "Session" s
  WHERE s.status = 'active'
), expanded AS (
  SELECT
    a.id AS session_id,
    seat.number AS player_number,
    seat.number <= a.subscriber_count AS is_subscriber,
    CASE
      WHEN seat.number <= a.subscriber_count THEN a.started_at
      ELSE COALESCE(a.non_subscriber_started_at, a.started_at)
    END AS joined_at
  FROM active_sessions a
  CROSS JOIN LATERAL generate_series(
    1,
    GREATEST(a.player_count, a.subscriber_count)
  ) AS seat(number)
)
INSERT INTO "SessionPlayer" (
  id, session_id, player_number, is_subscriber, joined_at, status, created_at
)
SELECT
  gen_random_uuid(),
  session_id,
  player_number,
  is_subscriber,
  joined_at,
  'active',
  now()
FROM expanded
ON CONFLICT ("session_id", "player_number") DO NOTHING;
