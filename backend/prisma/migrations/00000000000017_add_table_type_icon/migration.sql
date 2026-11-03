ALTER TABLE "TableType" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'american';

UPDATE "TableType"
SET "icon" = CASE
  WHEN lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%snooker%' THEN 'snooker'
  WHEN lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%pyramid%' THEN 'pyramid'
  WHEN lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%carom%'
    OR lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%carambole%'
    OR lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%french%'
    OR lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%français%'
    OR lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%francais%' THEN 'carom'
  WHEN lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%english%'
    OR lower(btrim(coalesce("name_en", ''))) = 'pool' THEN 'english_pool'
  WHEN lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%american%'
    OR lower(coalesce("name_en", '') || ' ' || coalesce("name_fr", '')) LIKE '%améric%' THEN 'american'
  ELSE "icon"
END;
