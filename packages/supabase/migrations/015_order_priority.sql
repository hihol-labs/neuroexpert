-- 015: Add priority field to orders

ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;
