-- Add simple indexes to speed up reporting
CREATE INDEX IF NOT EXISTS idx_tablineitem_createdat ON "TabLineItem" (created_at);
CREATE INDEX IF NOT EXISTS idx_tablineitem_type ON "TabLineItem" (type);
