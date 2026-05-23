-- 021_marketing_os_foundation.sql
-- Foundation for operational Marketing OS workflows.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voice_profile JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.content_packages
  ADD COLUMN IF NOT EXISTS generation_framework JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.sub_queries
  ADD COLUMN IF NOT EXISTS aeo_cluster TEXT CHECK (
    aeo_cluster IS NULL OR aeo_cluster IN ('informational', 'comparative', 'recommendation', 'transactional')
  ),
  ADD COLUMN IF NOT EXISTS user_intent TEXT,
  ADD COLUMN IF NOT EXISTS desired_answer TEXT,
  ADD COLUMN IF NOT EXISTS next_cta TEXT;

CREATE TABLE IF NOT EXISTS public.marketing_workflow_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  workflow_key           TEXT NOT NULL,
  agent_role             TEXT,
  entity_type            TEXT,
  entity_id              UUID,
  status                 TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'queued', 'running', 'needs_review', 'approved', 'completed', 'failed')),
  input                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  output                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence               JSONB NOT NULL DEFAULT '[]'::jsonb,
  human_review_required  BOOLEAN NOT NULL DEFAULT TRUE,
  source                 TEXT NOT NULL DEFAULT 'neuroexpert',
  error                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now(),
  completed_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_marketing_workflow_runs_owner ON public.marketing_workflow_runs(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketing_workflow_runs_key ON public.marketing_workflow_runs(workflow_key);
CREATE INDEX IF NOT EXISTS idx_marketing_workflow_runs_status ON public.marketing_workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_marketing_workflow_runs_created ON public.marketing_workflow_runs(created_at DESC);

ALTER TABLE public.marketing_workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own marketing workflow runs"
  ON public.marketing_workflow_runs FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own marketing workflow runs"
  ON public.marketing_workflow_runs FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own marketing workflow runs"
  ON public.marketing_workflow_runs FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.page_quality_checks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id            UUID REFERENCES public.content_packages(id) ON DELETE CASCADE,
  expert_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_url              TEXT,
  check_type            TEXT NOT NULL DEFAULT 'cro_audit',
  scores                JSONB NOT NULL DEFAULT '[]'::jsonb,
  critical_issues       JSONB NOT NULL DEFAULT '[]'::jsonb,
  hypotheses            JSONB NOT NULL DEFAULT '[]'::jsonb,
  ice_score             NUMERIC,
  status                TEXT NOT NULL DEFAULT 'needs_review'
                        CHECK (status IN ('needs_review', 'approved', 'implemented', 'archived')),
  source                TEXT NOT NULL DEFAULT 'neuroexpert',
  confidence            NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_quality_checks_content ON public.page_quality_checks(content_id);
CREATE INDEX IF NOT EXISTS idx_page_quality_checks_expert ON public.page_quality_checks(expert_id);
CREATE INDEX IF NOT EXISTS idx_page_quality_checks_status ON public.page_quality_checks(status);

ALTER TABLE public.page_quality_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can view own page quality checks"
  ON public.page_quality_checks FOR SELECT
  USING (expert_id = auth.uid());

CREATE POLICY "Experts can update own page quality checks"
  ON public.page_quality_checks FOR UPDATE
  USING (expert_id = auth.uid())
  WITH CHECK (expert_id = auth.uid());
