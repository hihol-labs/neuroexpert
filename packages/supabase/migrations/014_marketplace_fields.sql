-- 014: Marketplace fields for split-payment and Yclients

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS yukassa_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS yclients_url TEXT;
