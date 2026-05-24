-- 024_complete_demand_to_revenue_os.sql
-- Completes product contracts for Demand-to-Revenue OS across Solo, B2B,
-- Marketing OS, and Agency/Demand API.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS practice_limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (
    verification_status IN ('unverified', 'needs_review', 'verified', 'rejected')
  ),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.proof_of_human_assets
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS limitations JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.content_packages
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'neuroexpert',
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS result_loop_state JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confidence NUMERIC NOT NULL DEFAULT 0.9 CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revenue_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS revenue_status TEXT NOT NULL DEFAULT 'unknown' CHECK (
    revenue_status IN ('unknown', 'qualified', 'won', 'lost', 'refunded')
  );

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confidence NUMERIC NOT NULL DEFAULT 0.9 CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.page_metrics
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confidence NUMERIC NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS revenue_amount NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.business_accounts
  ADD COLUMN IF NOT EXISTS target_channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unit_economics JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_type_check CHECK (type IN (
  'collect_demand','find_gaps','generate_orders','expand_query',
  'transcribe','generate_content','validate_content',
  'track_citations','track_serp','submit_sitemap','crosspost','crosspost_social',
  'calculate_trust_score','send_email_digest',
  'refresh_content','check_cwv','optimize_images','track_geo_services',
  'generate_daily_growth_tasks','generate_local_weekly_report','generate_b2b_page_draft',
  'analyze_behavior_signals','calculate_unit_economics','generate_agency_report'
));

ALTER TABLE public.growth_tasks
  ADD COLUMN IF NOT EXISTS playbook_key TEXT,
  ADD COLUMN IF NOT EXISTS impact_score NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS result_metrics JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.result_loop_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_id       UUID REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  content_id        UUID REFERENCES public.content_packages(id) ON DELETE SET NULL,
  question_id       UUID REFERENCES public.questions(id) ON DELETE SET NULL,
  task_id           UUID REFERENCES public.growth_tasks(id) ON DELETE SET NULL,
  lead_id           UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lost_lead_id      UUID REFERENCES public.lost_leads(id) ON DELETE SET NULL,
  event_type        TEXT NOT NULL CHECK (
    event_type IN (
      'demand_found', 'task_created', 'published', 'updated', 'view',
      'cta_click', 'lead_created', 'lead_lost', 'lead_recovered',
      'revenue_won', 'report_sent', 'decision_keep', 'decision_improve',
      'decision_merge', 'decision_delete'
    )
  ),
  channel           TEXT,
  amount            NUMERIC,
  payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  source            TEXT NOT NULL DEFAULT 'neuroexpert',
  source_url        TEXT,
  collected_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence        NUMERIC NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.revenue_attribution (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_id      UUID REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  content_id       UUID REFERENCES public.content_packages(id) ON DELETE SET NULL,
  lead_id          UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_outcome_id  UUID REFERENCES public.lead_outcomes(id) ON DELETE SET NULL,
  channel          TEXT NOT NULL,
  amount           NUMERIC NOT NULL DEFAULT 0,
  attribution_model TEXT NOT NULL DEFAULT 'last_touch' CHECK (
    attribution_model IN ('first_touch', 'last_touch', 'linear', 'manual')
  ),
  evidence         JSONB NOT NULL DEFAULT '[]'::jsonb,
  source           TEXT NOT NULL DEFAULT 'neuroexpert',
  collected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence       NUMERIC NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_generated_pages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  local_query_id       UUID REFERENCES public.local_queries(id) ON DELETE SET NULL,
  location_id          UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  slug                TEXT,
  service_name        TEXT,
  city                TEXT,
  district            TEXT,
  price_from          NUMERIC,
  price_to            NUMERIC,
  faq                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviews             JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof               JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta                 TEXT NOT NULL DEFAULT 'Оставить заявку',
  content_draft       TEXT,
  meta_title          TEXT,
  meta_description    TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'needs_review', 'approved', 'published', 'paused', 'archived')
  ),
  decision_status     TEXT NOT NULL DEFAULT 'pending' CHECK (
    decision_status IN ('pending', 'keep', 'improve', 'merge', 'delete')
  ),
  metrics             JSONB NOT NULL DEFAULT '{}'::jsonb,
  source              TEXT NOT NULL DEFAULT 'neuroexpert',
  source_url          TEXT,
  collected_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence          NUMERIC NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

CREATE TABLE IF NOT EXISTS public.local_page_sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id          UUID NOT NULL REFERENCES public.local_generated_pages(id) ON DELETE CASCADE,
  section_type     TEXT NOT NULL CHECK (
    section_type IN ('hero', 'price', 'faq', 'reviews', 'proof', 'comparison', 'cta', 'schema')
  ),
  title           TEXT,
  body            TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.local_page_result_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id          UUID NOT NULL REFERENCES public.local_generated_pages(id) ON DELETE CASCADE,
  business_id      UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  views            INTEGER NOT NULL DEFAULT 0,
  clicks           INTEGER NOT NULL DEFAULT 0,
  leads_count      INTEGER NOT NULL DEFAULT 0,
  revenue_amount   NUMERIC NOT NULL DEFAULT 0,
  decision         TEXT NOT NULL DEFAULT 'improve' CHECK (
    decision IN ('keep', 'improve', 'merge', 'delete')
  ),
  reason           TEXT,
  next_action      TEXT,
  source           TEXT NOT NULL DEFAULT 'neuroexpert',
  confidence       NUMERIC NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_playbooks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key            TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (
    category IN ('aeo', 'competitor', 'cro', 'weekly_report', 'unit_economics', 'agency_report', 'proof', 'local_sales')
  ),
  description    TEXT,
  human_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_playbook_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id     UUID NOT NULL REFERENCES public.marketing_playbooks(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,
  prompt_hash     TEXT,
  methodology     JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_summary  JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (playbook_id, version)
);

CREATE TABLE IF NOT EXISTS public.marketing_review_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id      UUID REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  workflow_run_id  UUID REFERENCES public.marketing_workflow_runs(id) ON DELETE CASCADE,
  entity_type      TEXT NOT NULL,
  entity_id        UUID,
  title            TEXT NOT NULL,
  summary          TEXT,
  risk_level       TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'changes_requested', 'published', 'archived')
  ),
  ai_output        JSONB NOT NULL DEFAULT '{}'::jsonb,
  human_notes      TEXT,
  reviewed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  source           TEXT NOT NULL DEFAULT 'neuroexpert',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_unit_economics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_id      UUID REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  spend            NUMERIC NOT NULL DEFAULT 0,
  impressions      INTEGER NOT NULL DEFAULT 0,
  clicks           INTEGER NOT NULL DEFAULT 0,
  leads_count      INTEGER NOT NULL DEFAULT 0,
  qualified_leads  INTEGER NOT NULL DEFAULT 0,
  customers_count  INTEGER NOT NULL DEFAULT 0,
  revenue_amount   NUMERIC NOT NULL DEFAULT 0,
  cpl              NUMERIC NOT NULL DEFAULT 0,
  cac              NUMERIC NOT NULL DEFAULT 0,
  cr               NUMERIC NOT NULL DEFAULT 0,
  romi             NUMERIC NOT NULL DEFAULT 0,
  payback_days     NUMERIC,
  evidence         JSONB NOT NULL DEFAULT '[]'::jsonb,
  source           TEXT NOT NULL DEFAULT 'manual',
  collected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence       NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  is_manual        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, channel, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS public.agency_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id      UUID REFERENCES public.business_accounts(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  contact         TEXT,
  niche           TEXT,
  city            TEXT,
  status          TEXT NOT NULL DEFAULT 'lead' CHECK (
    status IN ('lead', 'audit', 'active', 'paused', 'lost')
  ),
  source          TEXT NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agency_report_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id        UUID NOT NULL REFERENCES public.agency_reports(id) ON DELETE CASCADE,
  owner_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  export_format    TEXT NOT NULL DEFAULT 'json' CHECK (export_format IN ('json', 'pdf', 'docx', 'html')),
  public_token     TEXT UNIQUE,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'shared', 'revoked')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  shared_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.api_usage_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id       UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  owner_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  endpoint         TEXT NOT NULL,
  status_code      INTEGER NOT NULL DEFAULT 200,
  rows_returned    INTEGER NOT NULL DEFAULT 0,
  latency_ms       INTEGER,
  source           TEXT NOT NULL DEFAULT 'api',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_result_loop_owner ON public.result_loop_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_result_loop_business ON public.result_loop_events(business_id);
CREATE INDEX IF NOT EXISTS idx_result_loop_type ON public.result_loop_events(event_type);
CREATE INDEX IF NOT EXISTS idx_revenue_attr_business ON public.revenue_attribution(business_id);
CREATE INDEX IF NOT EXISTS idx_local_pages_business ON public.local_generated_pages(business_id);
CREATE INDEX IF NOT EXISTS idx_local_pages_status ON public.local_generated_pages(status);
CREATE INDEX IF NOT EXISTS idx_local_page_reviews_page ON public.local_page_result_reviews(page_id);
CREATE INDEX IF NOT EXISTS idx_marketing_review_owner ON public.marketing_review_queue(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketing_review_status ON public.marketing_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_unit_economics_business ON public.channel_unit_economics(business_id);
CREATE INDEX IF NOT EXISTS idx_agency_clients_owner ON public.agency_clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_exports_report ON public.agency_report_exports(report_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_owner ON public.api_usage_events(owner_id);

ALTER TABLE public.result_loop_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_generated_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_page_result_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_playbook_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_unit_economics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own result loop events"
  ON public.result_loop_events FOR SELECT
  USING (owner_id = auth.uid() OR (business_id IS NOT NULL AND public.is_business_member(business_id)));

CREATE POLICY "Service role can manage result loop events"
  ON public.result_loop_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Business members can view revenue attribution"
  ON public.revenue_attribution FOR SELECT
  USING (owner_id = auth.uid() OR (business_id IS NOT NULL AND public.is_business_member(business_id)));

CREATE POLICY "Service role can manage revenue attribution"
  ON public.revenue_attribution FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Business members can manage local pages"
  ON public.local_generated_pages FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Business members can manage local page sections"
  ON public.local_page_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.local_generated_pages p
      WHERE p.id = page_id AND public.is_business_member(p.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.local_generated_pages p
      WHERE p.id = page_id AND public.is_business_member(p.business_id)
    )
  );

CREATE POLICY "Business members can manage local page reviews"
  ON public.local_page_result_reviews FOR ALL
  USING (public.is_business_member(business_id))
  WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Authenticated users can view active playbooks"
  ON public.marketing_playbooks FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'active');

CREATE POLICY "Authenticated users can view active playbook versions"
  ON public.marketing_playbook_versions FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.marketing_playbooks p
      WHERE p.id = playbook_id AND p.status = 'active'
    )
  );

CREATE POLICY "Service role can manage playbooks"
  ON public.marketing_playbooks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage playbook versions"
  ON public.marketing_playbook_versions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Owners can manage review queue"
  ON public.marketing_review_queue FOR ALL
  USING (owner_id = auth.uid() OR (business_id IS NOT NULL AND public.is_business_member(business_id)))
  WITH CHECK (owner_id = auth.uid() OR (business_id IS NOT NULL AND public.is_business_member(business_id)));

CREATE POLICY "Business members can manage unit economics"
  ON public.channel_unit_economics FOR ALL
  USING (owner_id = auth.uid() OR (business_id IS NOT NULL AND public.is_business_member(business_id)))
  WITH CHECK (owner_id = auth.uid() OR (business_id IS NOT NULL AND public.is_business_member(business_id)));

CREATE POLICY "Agency owners can manage clients"
  ON public.agency_clients FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Agency owners can manage exports"
  ON public.agency_report_exports FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Service role can manage api usage"
  ON public.api_usage_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.marketing_playbooks (key, title, category, description, human_review_required)
VALUES
  ('aeo_check', 'AEO-check', 'aeo', 'Проверка страницы на answerability, FAQ, schema, citations и CTA.', TRUE),
  ('competitor_audit', 'Competitor audit', 'competitor', 'Сравнение офферов, доверия, каналов, отзывов и AI-видимости конкурентов.', TRUE),
  ('cro_audit', 'CRO audit', 'cro', 'Гипотезы по ценности, CTA, доказательствам, форме, FAQ и мобильному сценарию.', TRUE),
  ('local_weekly_report', 'Local weekly report', 'weekly_report', 'Отчёт: что сделали, что изменилось, где деньги и что делаем дальше.', TRUE),
  ('unit_economics', 'Unit economics', 'unit_economics', 'Расчёт CPL, CAC, CR, ROMI и payback по каналам.', TRUE),
  ('white_label_audit', 'White-label Local Sales Audit', 'agency_report', 'Агентский аудит локального спроса, конкурентов, AI-видимости и задач роста.', TRUE),
  ('proof_review', 'Proof-of-Human review', 'proof', 'Проверка доказательств эксперта: дипломы, кейсы, голос, ограничения практики.', TRUE),
  ('b2b_page_generator', 'B2B page generator', 'local_sales', 'Черновик страницы услуга + район + цена + FAQ + отзывы + CTA.', TRUE)
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  human_review_required = EXCLUDED.human_review_required,
  updated_at = now();

INSERT INTO public.marketing_playbook_versions (
  playbook_id, version, methodology, expected_output, status
)
SELECT id, '1.0',
  jsonb_build_object('source', 'neuroexpert', 'review_required', human_review_required),
  jsonb_build_object('format', 'structured_json', 'evidence_required', true),
  'active'
FROM public.marketing_playbooks
ON CONFLICT (playbook_id, version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
