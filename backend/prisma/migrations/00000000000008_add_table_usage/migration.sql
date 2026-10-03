-- Track pool table usage over time so tables can be flagged for maintenance.
-- total_used_seconds          : lifetime usage, never reset.
-- used_since_maintenance_seconds : usage since the table last left maintenance (reset on exit).
-- TableType.max_used_hours    : optional per-type maintenance threshold (NULL = no limit).

ALTER TABLE "TableType" ADD COLUMN max_used_hours integer;

ALTER TABLE "PoolTable" ADD COLUMN total_used_seconds integer NOT NULL DEFAULT 0;
ALTER TABLE "PoolTable" ADD COLUMN used_since_maintenance_seconds integer NOT NULL DEFAULT 0;
