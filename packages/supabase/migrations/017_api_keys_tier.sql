-- Migration 017: Add tier and monthly_limit to api_keys
-- Step 1.4 from LAUNCH_PLAN.md — API tier-based access control

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS monthly_limit INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS requests_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS month_reset_at TIMESTAMPTZ DEFAULT now();

-- Rollback:
-- ALTER TABLE api_keys DROP COLUMN IF EXISTS tier;
-- ALTER TABLE api_keys DROP COLUMN IF EXISTS monthly_limit;
-- ALTER TABLE api_keys DROP COLUMN IF EXISTS requests_this_month;
-- ALTER TABLE api_keys DROP COLUMN IF EXISTS month_reset_at;
