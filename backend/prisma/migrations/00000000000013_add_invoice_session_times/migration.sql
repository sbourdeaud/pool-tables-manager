ALTER TABLE "Receipt"
  ADD COLUMN "session_started_at" TIMESTAMPTZ(3),
  ADD COLUMN "session_ended_at" TIMESTAMPTZ(3);

UPDATE "Receipt" AS receipt
SET
  "session_started_at" = session."started_at",
  "session_ended_at" = COALESCE(session."ended_at", receipt."created_at")
FROM "Session" AS session
WHERE session.id = receipt.session_id;
