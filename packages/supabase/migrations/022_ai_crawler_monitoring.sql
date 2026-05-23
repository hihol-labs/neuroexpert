-- 022_ai_crawler_monitoring.sql
-- Storage for AI crawler/referrer observations parsed from reverse-proxy access logs.

CREATE TABLE IF NOT EXISTS public.ai_crawler_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_name      TEXT NOT NULL,
  method        TEXT,
  path          TEXT NOT NULL,
  status_code   INTEGER,
  user_agent    TEXT,
  referrer      TEXT,
  ip_hash       TEXT,
  source        TEXT NOT NULL DEFAULT 'access_log',
  collected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_crawler_logs_bot_date
  ON public.ai_crawler_logs(bot_name, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_crawler_logs_path
  ON public.ai_crawler_logs(path);

ALTER TABLE public.ai_crawler_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert ai crawler logs"
  ON public.ai_crawler_logs;

CREATE POLICY "Service role can insert ai crawler logs"
  ON public.ai_crawler_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can read ai crawler logs"
  ON public.ai_crawler_logs;

CREATE POLICY "Service role can read ai crawler logs"
  ON public.ai_crawler_logs FOR SELECT
  USING (auth.role() = 'service_role');

CREATE OR REPLACE VIEW public.ai_crawler_daily AS
SELECT
  date_trunc('day', collected_at)::date AS metric_date,
  bot_name,
  count(*)::integer AS hits,
  count(*) FILTER (WHERE status_code >= 200 AND status_code < 400)::integer AS successful_hits,
  count(*) FILTER (WHERE status_code >= 400)::integer AS failed_hits,
  count(DISTINCT path)::integer AS unique_paths
FROM public.ai_crawler_logs
GROUP BY 1, 2;

GRANT INSERT, SELECT ON public.ai_crawler_logs TO service_role;
GRANT SELECT ON public.ai_crawler_daily TO service_role;

NOTIFY pgrst, 'reload schema';
