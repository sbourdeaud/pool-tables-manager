ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE "TableType" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE "PoolTable" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE "Drink" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE "TabLineItem" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz DEFAULT now();
