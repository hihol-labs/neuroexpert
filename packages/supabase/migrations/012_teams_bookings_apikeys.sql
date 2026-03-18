-- 012: Teams (B2B), Bookings, API keys

-- Teams for B2B accounts
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_tier TEXT DEFAULT 'business',
  max_experts INTEGER DEFAULT 5,
  logo_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

-- Team members (experts belonging to a team)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, expert_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_expert ON team_members(expert_id);

-- Bookings (client books a slot with expert)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_contact TEXT NOT NULL,
  client_message TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_expert ON bookings(expert_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);

-- Expert schedule (available slots)
CREATE TABLE IF NOT EXISTS expert_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(expert_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_expert_schedule ON expert_schedule(expert_id);

-- API keys for Knowledge API
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read'],
  rate_limit_per_hour INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys(owner_id);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Teams: owner can do everything
CREATE POLICY "Team owner full access" ON teams
  FOR ALL USING (owner_id = auth.uid());

-- Team members: team owner and member can read
CREATE POLICY "Team members readable by team" ON team_members
  FOR SELECT USING (
    expert_id = auth.uid() OR
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Team owner manages members" ON team_members
  FOR ALL USING (
    team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid())
  );

-- Bookings: expert can see their bookings
CREATE POLICY "Expert sees own bookings" ON bookings
  FOR ALL USING (expert_id = auth.uid());

-- Schedule: expert manages own schedule
CREATE POLICY "Expert manages schedule" ON expert_schedule
  FOR ALL USING (expert_id = auth.uid());

-- Public read for schedule (clients need to see available slots)
CREATE POLICY "Schedule publicly readable" ON expert_schedule
  FOR SELECT USING (is_active = true);

-- API keys: owner manages own keys
CREATE POLICY "Owner manages API keys" ON api_keys
  FOR ALL USING (owner_id = auth.uid());
