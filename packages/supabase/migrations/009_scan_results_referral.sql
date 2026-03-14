-- Scanner results table
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  visibility_percent INTEGER NOT NULL DEFAULT 0,
  total_platforms INTEGER NOT NULL DEFAULT 0,
  mentioned_count INTEGER NOT NULL DEFAULT 0,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_results_slug ON scan_results(slug);

-- No RLS on scan_results — public read via admin client only

-- Referral tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_profiles_referrer ON profiles(referrer_id) WHERE referrer_id IS NOT NULL;
