-- Menu category for grouping drinks (cold / warm / alcoholic / other).
ALTER TABLE "Drink" ADD COLUMN "category" TEXT;

-- Best-effort classification of existing menu items.
UPDATE "Drink" SET "category" = 'alcoholic'
WHERE lower("name_en") IN ('beer', 'bière', 'biere', 'wine', 'vin', 'whisky', 'vodka', 'rum', 'gin', 'cocktail', 'cider', 'cidre');

UPDATE "Drink" SET "category" = 'cold'
WHERE "category" IS NULL
  AND lower("name_en") IN ('soda', 'coca', 'cola', 'water', 'eau', 'juice', 'jus', 'lemonade', 'limonade', 'iced tea', 'thé glacé');

UPDATE "Drink" SET "category" = 'warm'
WHERE "category" IS NULL
  AND lower("name_en") IN ('coffee', 'café', 'cafe', 'tea', 'thé', 'the', 'hot chocolate', 'chocolat chaud', 'espresso');
