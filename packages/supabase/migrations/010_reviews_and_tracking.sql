-- 010: Reviews system + lead tracking tokens

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content_packages(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_contact TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_expert ON reviews(expert_id);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(is_published) WHERE is_published = true;

-- Add average rating and review count to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating REAL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add tracking token to leads for client status tracking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Add is_featured flag for featured experts
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT
  USING (is_published = true);

CREATE POLICY "Anyone can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- Function to recalculate expert rating
CREATE OR REPLACE FUNCTION recalculate_expert_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    avg_rating = COALESCE((
      SELECT AVG(rating)::REAL FROM reviews
      WHERE expert_id = COALESCE(NEW.expert_id, OLD.expert_id)
        AND is_published = true
    ), 0),
    review_count = (
      SELECT COUNT(*) FROM reviews
      WHERE expert_id = COALESCE(NEW.expert_id, OLD.expert_id)
        AND is_published = true
    )
  WHERE id = COALESCE(NEW.expert_id, OLD.expert_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_recalculate_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_expert_rating();
