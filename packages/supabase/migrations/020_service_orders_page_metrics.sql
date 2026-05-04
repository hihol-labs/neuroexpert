-- 020_service_orders_page_metrics.sql
-- Managed launch requests and daily page-result metrics.

CREATE TABLE IF NOT EXISTS public.service_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  contact       TEXT NOT NULL,
  email         TEXT,
  niche         TEXT,
  website       TEXT,
  goal          TEXT,
  package_type  TEXT NOT NULL DEFAULT 'launch_30d'
                  CHECK (package_type IN ('audit', 'launch_30d', 'managed_monthly', 'b2b')),
  status        TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  source        TEXT NOT NULL DEFAULT 'launch_page',
  referrer      TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_expert ON public.service_orders(expert_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_created ON public.service_orders(created_at DESC);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create service orders"
  ON public.service_orders FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Expert can view own service orders"
  ON public.service_orders FOR SELECT
  USING (expert_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.page_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id   UUID NOT NULL REFERENCES public.content_packages(id) ON DELETE CASCADE,
  expert_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  views        INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  cta_views    INTEGER NOT NULL DEFAULT 0 CHECK (cta_views >= 0),
  cta_clicks   INTEGER NOT NULL DEFAULT 0 CHECK (cta_clicks >= 0),
  leads_count  INTEGER NOT NULL DEFAULT 0 CHECK (leads_count >= 0),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_page_metrics_expert ON public.page_metrics(expert_id);
CREATE INDEX IF NOT EXISTS idx_page_metrics_content ON public.page_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_page_metrics_date ON public.page_metrics(metric_date DESC);

ALTER TABLE public.page_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can view own page metrics"
  ON public.page_metrics FOR SELECT
  USING (expert_id = auth.uid());

CREATE OR REPLACE FUNCTION public.increment_page_metric(
  p_content_id UUID,
  p_event_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expert_id UUID;
BEGIN
  IF p_event_type NOT IN ('view', 'cta_view', 'cta_click', 'lead') THEN
    RAISE EXCEPTION 'Unsupported page metric event: %', p_event_type;
  END IF;

  SELECT expert_id INTO v_expert_id
  FROM public.content_packages
  WHERE id = p_content_id
    AND status = 'published';

  IF v_expert_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.page_metrics (
    content_id,
    expert_id,
    metric_date,
    views,
    cta_views,
    cta_clicks,
    leads_count
  )
  VALUES (
    p_content_id,
    v_expert_id,
    CURRENT_DATE,
    CASE WHEN p_event_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'cta_view' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'cta_click' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'lead' THEN 1 ELSE 0 END
  )
  ON CONFLICT (content_id, metric_date)
  DO UPDATE SET
    views = page_metrics.views + EXCLUDED.views,
    cta_views = page_metrics.cta_views + EXCLUDED.cta_views,
    cta_clicks = page_metrics.cta_clicks + EXCLUDED.cta_clicks,
    leads_count = page_metrics.leads_count + EXCLUDED.leads_count,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_page_metric(UUID, TEXT) TO anon, authenticated, service_role;
