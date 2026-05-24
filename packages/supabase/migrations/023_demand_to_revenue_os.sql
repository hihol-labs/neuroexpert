-- 023_demand_to_revenue_os.sql
-- Demand-to-Revenue OS foundation: shared demand signals, Solo proof layer,
-- Local Sales OS data model, Marketing OS workflows, and agency-ready exports.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS proof_of_human JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS machine_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_components JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS intent_type TEXT CHECK (
    intent_type IS NULL OR intent_type IN ('informational', 'comparative', 'recommendation', 'transactional')
  ),
  ADD COLUMN IF NOT EXISTS demand_stage TEXT CHECK (
    demand_stage IS NULL OR demand_stage IN ('discover', 'compare', 'decide', 'act')
  ),
  ADD COLUMN IF NOT EXISTS trend_score NUMERIC NOT NULL DEFAULT 0 CHECK (trend_score >= 0 AND trend_score <= 100),
  ADD COLUMN IF NOT EXISTS trend_direction TEXT CHECK (
    trend_direction IS NULL OR trend_direction IN ('rising', 'stable', 'falling', 'seasonal')
  ),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_account_id UUID,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'new' CHECK (
    lifecycle_status IN (
      'new', 'qualified', 'invoice_sent', 'paid', 'onboarding',
      'audit_in_progress', 'audit_ready', 'setup', 'managed',
      'closed_lost', 'closed_won'
    )
  ),
  ADD COLUMN IF NOT EXISTS package_label TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'invoice_sent', 'paid', 'refunded', 'cancelled')
  ),
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS receipt_status TEXT,
  ADD COLUMN IF NOT EXISTS next_step TEXT,
  ADD COLUMN IF NOT EXISTS next_step_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_reason TEXT,
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.proof_of_human_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type    TEXT NOT NULL CHECK (
    asset_type IN ('identity', 'diploma', 'certificate', 'case', 'review', 'voice', 'video', 'publication', 'license')
  ),
  title         TEXT NOT NULL,
  issuer        TEXT,
  evidence_url  TEXT,
  status        TEXT NOT NULL DEFAULT 'needs_review' CHECK (
    status IN ('needs_review', 'verified', 'rejected', 'archived')
  ),
  source        TEXT NOT NULL DEFAULT 'manual',
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence    NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demand_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment           TEXT NOT NULL CHECK (segment IN ('solo', 'b2b', 'agency')),
  entity_type        TEXT NOT NULL CHECK (entity_type IN ('question', 'service', 'niche', 'local_query', 'competitor', 'page')),
  entity_id          UUID,
  niche_id           UUID REFERENCES public.niches(id) ON DELETE SET NULL,
  city               TEXT,
  query_text         TEXT NOT NULL,
  intent_type        TEXT CHECK (
    intent_type IS NULL OR intent_type IN ('informational', 'comparative', 'recommendation', 'transactional')
  ),
  demand_stage       TEXT CHECK (
    demand_stage IS NULL OR demand_stage IN ('discover', 'compare', 'decide', 'act')
  ),
  monthly_volume     INTEGER,
  trend_score        NUMERIC NOT NULL DEFAULT 0 CHECK (trend_score >= 0 AND trend_score <= 100),
  trend_direction    TEXT CHECK (
    trend_direction IS NULL OR trend_direction IN ('rising', 'stable', 'falling', 'seasonal')
  ),
  commercial_intent  NUMERIC NOT NULL DEFAULT 0 CHECK (commercial_intent >= 0 AND commercial_intent <= 1),
  gap_score          NUMERIC,
  ai_visibility_score NUMERIC NOT NULL DEFAULT 0 CHECK (ai_visibility_score >= 0 AND ai_visibility_score <= 100),
  opportunity_score  NUMERIC NOT NULL DEFAULT 0,
  recommended_action TEXT,
  source             TEXT NOT NULL DEFAULT 'manual',
  source_url         TEXT,
  collected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence         NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual          BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  legal_name      TEXT,
  niche           TEXT,
  city            TEXT,
  website         TEXT,
  avg_check       NUMERIC,
  current_leads_month INTEGER,
  machine_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  proof_of_business JSONB NOT NULL DEFAULT '{}'::jsonb,
  local_sales_index NUMERIC NOT NULL DEFAULT 0 CHECK (local_sales_index >= 0 AND local_sales_index <= 100),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'onboarding', 'audit', 'setup', 'managed', 'paused', 'archived')
  ),
  source          TEXT NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'operator', 'viewer')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'service_orders_business_account_id_fkey'
  ) THEN
    ALTER TABLE public.service_orders
      ADD CONSTRAINT service_orders_business_account_id_fkey
      FOREIGN KEY (business_account_id)
      REFERENCES public.business_accounts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.add_business_owner_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (business_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_business_owner_member ON public.business_accounts;
CREATE TRIGGER trg_add_business_owner_member
  AFTER INSERT ON public.business_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.add_business_owner_member();

CREATE TABLE IF NOT EXISTS public.business_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  city            TEXT,
  district        TEXT,
  address         TEXT,
  phone           TEXT,
  website         TEXT,
  yandex_maps_url TEXT,
  two_gis_url     TEXT,
  avito_url       TEXT,
  vk_url          TEXT,
  telegram_url    TEXT,
  connection_status TEXT NOT NULL DEFAULT 'manual' CHECK (
    connection_status IN ('manual', 'imported', 'connected', 'failed')
  ),
  source          TEXT NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  location_id        UUID REFERENCES public.business_locations(id) ON DELETE CASCADE,
  channel            TEXT NOT NULL CHECK (
    channel IN ('yandex_maps', 'two_gis', 'google_maps', 'avito', 'vk', 'telegram', 'website', 'messenger', 'phone', 'ai_answer')
  ),
  profile_url        TEXT,
  rating             NUMERIC,
  reviews_count      INTEGER,
  photos_count       INTEGER,
  services_count     INTEGER,
  visibility_score   NUMERIC NOT NULL DEFAULT 0 CHECK (visibility_score >= 0 AND visibility_score <= 100),
  conversion_score   NUMERIC NOT NULL DEFAULT 0 CHECK (conversion_score >= 0 AND conversion_score <= 100),
  connection_status  TEXT NOT NULL DEFAULT 'manual' CHECK (
    connection_status IN ('manual', 'imported', 'connected', 'failed')
  ),
  source             TEXT NOT NULL DEFAULT 'manual',
  source_url         TEXT,
  collected_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence         NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual          BOOLEAN NOT NULL DEFAULT FALSE,
  raw_snapshot       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, location_id, channel)
);

CREATE TABLE IF NOT EXISTS public.local_competitors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  website          TEXT,
  city             TEXT,
  channels         JSONB NOT NULL DEFAULT '{}'::jsonb,
  strengths        JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses       JSONB NOT NULL DEFAULT '[]'::jsonb,
  offer_summary    TEXT,
  trust_signals    JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_visibility_score NUMERIC NOT NULL DEFAULT 0 CHECK (ai_visibility_score >= 0 AND ai_visibility_score <= 100),
  source           TEXT NOT NULL DEFAULT 'manual',
  source_url       TEXT,
  collected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence       NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_queries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  location_id          UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  query_text           TEXT NOT NULL,
  service_name         TEXT,
  city                 TEXT,
  district             TEXT,
  intent_type          TEXT CHECK (
    intent_type IS NULL OR intent_type IN ('informational', 'comparative', 'recommendation', 'transactional')
  ),
  monthly_volume       INTEGER,
  trend_score          NUMERIC NOT NULL DEFAULT 0 CHECK (trend_score >= 0 AND trend_score <= 100),
  trend_direction      TEXT CHECK (
    trend_direction IS NULL OR trend_direction IN ('rising', 'stable', 'falling', 'seasonal')
  ),
  gap_score            NUMERIC,
  competitor_visible   BOOLEAN NOT NULL DEFAULT FALSE,
  recommended_page_type TEXT CHECK (
    recommended_page_type IS NULL OR recommended_page_type IN ('service', 'district', 'faq', 'comparison', 'review', 'landing')
  ),
  recommended_cta      TEXT,
  priority_score       NUMERIC NOT NULL DEFAULT 0,
  source               TEXT NOT NULL DEFAULT 'manual',
  source_url           TEXT,
  collected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence           NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual            BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_visibility_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  location_id    UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  query_id       UUID REFERENCES public.local_queries(id) ON DELETE SET NULL,
  competitor_id  UUID REFERENCES public.local_competitors(id) ON DELETE SET NULL,
  channel        TEXT NOT NULL,
  query_text     TEXT NOT NULL,
  position       INTEGER,
  is_visible     BOOLEAN NOT NULL DEFAULT FALSE,
  answer_excerpt TEXT,
  evidence_url   TEXT,
  source         TEXT NOT NULL DEFAULT 'manual',
  collected_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence     NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  raw_payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  location_id   UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  channel       TEXT NOT NULL,
  rating        NUMERIC,
  text          TEXT,
  sentiment     TEXT CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative')),
  pain_points   JSONB NOT NULL DEFAULT '[]'::jsonb,
  needs_reply   BOOLEAN NOT NULL DEFAULT FALSE,
  reply_status  TEXT NOT NULL DEFAULT 'none' CHECK (
    reply_status IN ('none', 'drafted', 'approved', 'published')
  ),
  source        TEXT NOT NULL DEFAULT 'manual',
  source_url    TEXT,
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence    NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lost_leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  location_id          UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  channel              TEXT NOT NULL CHECK (
    channel IN ('phone', 'form', 'telegram', 'whatsapp', 'vk', 'avito', 'website', 'offline', 'email')
  ),
  client_name          TEXT,
  client_contact       TEXT,
  lead_status          TEXT NOT NULL DEFAULT 'new' CHECK (
    lead_status IN (
      'new', 'missed', 'no_answer', 'waiting_reply', 'price_sent',
      'not_closed', 'booked', 'visited', 'no_show', 'repeat_touch_needed',
      'recovered', 'lost'
    )
  ),
  reason               TEXT,
  last_contact_at      TIMESTAMPTZ,
  next_touch_at        TIMESTAMPTZ,
  avg_check            NUMERIC,
  conversion_probability NUMERIC NOT NULL DEFAULT 0.2 CHECK (conversion_probability >= 0 AND conversion_probability <= 1),
  potential_revenue    NUMERIC,
  recovered_revenue    NUMERIC NOT NULL DEFAULT 0,
  ai_suggestion        TEXT,
  source               TEXT NOT NULL DEFAULT 'manual',
  source_url           TEXT,
  collected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence           NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual            BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_outcomes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  lost_lead_id      UUID REFERENCES public.lost_leads(id) ON DELETE SET NULL,
  outcome_type      TEXT NOT NULL CHECK (
    outcome_type IN ('new_lead', 'qualified', 'booked', 'paid', 'recovered', 'lost', 'repeat_purchase')
  ),
  amount            NUMERIC,
  channel           TEXT,
  notes             TEXT,
  source            TEXT NOT NULL DEFAULT 'manual',
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence        NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.growth_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id        UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  location_id        UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  related_entity_type TEXT,
  related_entity_id  UUID,
  title             TEXT NOT NULL,
  description       TEXT,
  channel           TEXT,
  task_type         TEXT NOT NULL DEFAULT 'manual' CHECK (
    task_type IN ('page', 'profile', 'review', 'lost_lead', 'follow_up', 'cro', 'ai_visibility', 'paid_visibility', 'data_quality', 'manual')
  ),
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status            TEXT NOT NULL DEFAULT 'todo' CHECK (
    status IN ('todo', 'in_progress', 'needs_review', 'done', 'skipped', 'blocked')
  ),
  owner_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at            TIMESTAMPTZ,
  expected_impact   TEXT,
  evidence          JSONB NOT NULL DEFAULT '[]'::jsonb,
  source            TEXT NOT NULL DEFAULT 'manual',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.local_weekly_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  summary          TEXT NOT NULL,
  wins             JSONB NOT NULL DEFAULT '[]'::jsonb,
  losses           JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_tasks  JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_tasks       JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics          JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'needs_review', 'approved', 'sent', 'archived')
  ),
  source           TEXT NOT NULL DEFAULT 'manual',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavior_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  content_id       UUID REFERENCES public.content_packages(id) ON DELETE CASCADE,
  session_hash     TEXT,
  event_type       TEXT NOT NULL CHECK (
    event_type IN ('view', 'cta_view', 'cta_click', 'form_start', 'form_submit', 'phone_click', 'messenger_click', 'route_click', 'exit')
  ),
  page_url         TEXT,
  channel          TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  source           TEXT NOT NULL DEFAULT 'web',
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavior_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  content_id       UUID REFERENCES public.content_packages(id) ON DELETE CASCADE,
  signal_type      TEXT NOT NULL CHECK (
    signal_type IN ('views_without_leads', 'cta_without_lead', 'phone_without_sale', 'faq_gap', 'lead_sla_risk', 'high_intent_drop')
  ),
  severity         TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  summary          TEXT NOT NULL,
  recommended_action TEXT,
  source           TEXT NOT NULL DEFAULT 'neuroexpert',
  collected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence       NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'task_created', 'resolved', 'archived')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agency_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_id      UUID REFERENCES public.business_accounts(id) ON DELETE SET NULL,
  report_type      TEXT NOT NULL CHECK (
    report_type IN ('local_sales_audit', 'blind_spots', 'ai_visibility', 'demand_map', 'weekly_report')
  ),
  title           TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  white_label     BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'needs_review', 'approved', 'shared', 'archived')
  ),
  source          TEXT NOT NULL DEFAULT 'neuroexpert',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proof_assets_profile ON public.proof_of_human_assets(profile_id);
CREATE INDEX IF NOT EXISTS idx_demand_signals_segment ON public.demand_signals(segment);
CREATE INDEX IF NOT EXISTS idx_demand_signals_niche ON public.demand_signals(niche_id);
CREATE INDEX IF NOT EXISTS idx_demand_signals_city ON public.demand_signals(city);
CREATE INDEX IF NOT EXISTS idx_demand_signals_priority ON public.demand_signals(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_business_accounts_owner ON public.business_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_business ON public.business_locations(business_id);
CREATE INDEX IF NOT EXISTS idx_local_profiles_business ON public.local_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_local_competitors_business ON public.local_competitors(business_id);
CREATE INDEX IF NOT EXISTS idx_local_queries_business ON public.local_queries(business_id);
CREATE INDEX IF NOT EXISTS idx_local_queries_priority ON public.local_queries(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_local_visibility_business ON public.local_visibility_checks(business_id);
CREATE INDEX IF NOT EXISTS idx_local_reviews_business ON public.local_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_lost_leads_business ON public.lost_leads(business_id);
CREATE INDEX IF NOT EXISTS idx_lost_leads_status ON public.lost_leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_lead_outcomes_business ON public.lead_outcomes(business_id);
CREATE INDEX IF NOT EXISTS idx_growth_tasks_business ON public.growth_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_growth_tasks_status ON public.growth_tasks(status);
CREATE INDEX IF NOT EXISTS idx_local_reports_business ON public.local_weekly_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_business ON public.behavior_events(business_id);
CREATE INDEX IF NOT EXISTS idx_behavior_signals_business ON public.behavior_signals(business_id);
CREATE INDEX IF NOT EXISTS idx_agency_reports_owner ON public.agency_reports(owner_id);

ALTER TABLE public.proof_of_human_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_visibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles can manage own proof assets"
  ON public.proof_of_human_assets FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Service role can manage demand signals"
  ON public.demand_signals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Business members can view accounts"
  ON public.business_accounts FOR SELECT
  USING (owner_id = auth.uid() OR public.is_business_member(id));

CREATE POLICY "Users can create own business accounts"
  ON public.business_accounts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Business owners can update accounts"
  ON public.business_accounts FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Business members can view members"
  ON public.business_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_business_member(business_id));

CREATE POLICY "Business owners can manage members"
  ON public.business_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_accounts ba
      WHERE ba.id = business_id AND ba.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_accounts ba
      WHERE ba.id = business_id AND ba.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business members can manage locations"
  ON public.business_locations FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage local profiles"
  ON public.local_profiles FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage competitors"
  ON public.local_competitors FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage local queries"
  ON public.local_queries FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage visibility checks"
  ON public.local_visibility_checks FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage local reviews"
  ON public.local_reviews FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage lost leads"
  ON public.lost_leads FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage lead outcomes"
  ON public.lead_outcomes FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage growth tasks"
  ON public.growth_tasks FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage weekly reports"
  ON public.local_weekly_reports FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can view behavior events"
  ON public.behavior_events FOR SELECT
  USING (business_id IS NOT NULL AND public.is_business_member(business_id));

CREATE POLICY "Service role can insert behavior events"
  ON public.behavior_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Business members can manage behavior signals"
  ON public.behavior_signals FOR ALL
  USING (business_id IS NOT NULL AND public.is_business_member(business_id))
  WITH CHECK (business_id IS NOT NULL AND public.is_business_member(business_id));

CREATE POLICY "Agency report owners can view reports"
  ON public.agency_reports FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Agency report owners can manage reports"
  ON public.agency_reports FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Service role can manage agency reports"
  ON public.agency_reports FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage local sales data"
  ON public.business_accounts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT EXECUTE ON FUNCTION public.is_business_member(UUID) TO authenticated, service_role;
GRANT SELECT ON public.demand_signals TO service_role;

NOTIFY pgrst, 'reload schema';
