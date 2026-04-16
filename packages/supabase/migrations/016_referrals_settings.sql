-- Migration 016: referrals table + settings key-value store
-- Step 1.4 from LAUNCH_PLAN.md — Architectural preparation

-- Referrals (CPA tracking)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cash_reward NUMERIC DEFAULT 0,
  payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'approved', 'paid', 'rejected')),
  payout_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(payout_status);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Settings key-value store (platform configuration)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Settings are read-only for authenticated users, write via service_role
CREATE POLICY "Authenticated users can read settings" ON settings
  FOR SELECT USING (true);

-- Initial CPA settings (disabled by default)
INSERT INTO settings (key, value) VALUES
  ('cpa_rate_rub', '0'),
  ('cpa_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Rollback:
-- DROP TABLE IF EXISTS referrals CASCADE;
-- DROP TABLE IF EXISTS settings CASCADE;
