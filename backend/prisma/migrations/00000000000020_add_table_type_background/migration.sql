ALTER TABLE "TableType" ADD COLUMN "background" TEXT;
ALTER TABLE "TableType" ADD COLUMN "background_opacity" INTEGER NOT NULL DEFAULT 70,
    ADD CONSTRAINT "TableType_background_opacity_check" CHECK ("background_opacity" BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS "TableBackgroundImage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content_type" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TableBackgroundImage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TableBackgroundImage_content_type_check" CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT "TableBackgroundImage_bytes_check" CHECK (octet_length("bytes") BETWEEN 1 AND 5242880)
);
