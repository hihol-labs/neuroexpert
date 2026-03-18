-- 013: Add has_specific_numbers marker to questions table

ALTER TABLE questions ADD COLUMN IF NOT EXISTS has_specific_numbers BOOLEAN;
