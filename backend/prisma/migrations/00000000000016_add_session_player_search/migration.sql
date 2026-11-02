ALTER TABLE "Session"
  ADD COLUMN "looking_for_players_count" INTEGER,
  ADD COLUMN "looking_for_players_up_to" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_looking_for_players_count_check"
  CHECK ("looking_for_players_count" IS NULL OR "looking_for_players_count" BETWEEN 1 AND 50);
