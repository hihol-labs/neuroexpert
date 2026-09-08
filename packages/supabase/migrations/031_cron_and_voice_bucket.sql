-- 031_cron_and_voice_bucket.sql
-- R-05 (ADR-004). Хранилище и cron экспертов. Диагноз прода 2026-09-08: расширение pg_cron
-- никогда не создавалось (cron.job отсутствует), расписания 003/008 не существуют, хотя леджер
-- считает миграции применёнными; bucket voice создан вручную и публичный.
-- Идемпотентно и транзакционно. Rollback (ЧАСТИЧНЫЙ, осознанно): DROP FUNCTION public.infra_status();
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('weekly-demand','weekly-generate-orders');
-- Расширение pg_cron и bucket voice не удаляем и public=true не возвращаем: bucket может содержать
-- записи экспертов, а публичность - регрессия безопасности; вернуть public только решением владельца.
-- Требование cron.database_name (GUC) = БД миграции проверяется guard-блоком ниже (на проде обе
-- 'postgres', read-only проверка 2026-09-08; guard - исполняемое доказательство при apply).
BEGIN;

-- 0. Guard: pg_cron исполняет задания только в БД из GUC cron.database_name. При несовпадении
--    cron.schedule молча зарегистрирует задания, которые никогда не запустятся (тот же класс
--    отказа, что E-AUTO-12) - поэтому миграция падает громко, а не притворяется применённой.
DO $$
BEGIN
  IF current_setting('cron.database_name', true) IS DISTINCT FROM current_database() THEN
    RAISE EXCEPTION 'cron.database_name (%) != current_database (%): pg_cron не будет исполнять задания в этой БД',
      current_setting('cron.database_name', true), current_database();
  END IF;
END $$;

-- 1. pg_cron (в supabase/postgres предзагружен в shared_preload_libraries, но CREATE EXTENSION не делался).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Расписания Business-контура: тела те же, что в 003/008. Сначала снимаем одноимённые (если есть),
--    чтобы повторный прогон не плодил дубли.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('weekly-demand', 'weekly-generate-orders');
SELECT cron.schedule('weekly-demand', '0 3 * * 1',
  $$INSERT INTO public.jobs (type, payload) SELECT 'collect_demand', jsonb_build_object('niche_id', id) FROM public.niches WHERE is_active = TRUE$$
);
SELECT cron.schedule('weekly-generate-orders', '0 4 * * 1',
  $$INSERT INTO public.jobs (type, payload, priority) SELECT 'generate_orders', jsonb_build_object('niche_id', id), 3 FROM public.niches WHERE is_active = TRUE$$
);
-- Остальные расписания 003 (citations/serp/trust/sitemap/freshness) - R-08/R-11, здесь не включаются.

-- 3. Bucket voice: приватный, аудио экспертов читается только service role (worker transcribe, web).
--    Лимит 25 МБ (голосовое Telegram <= 20 МБ, web-запись до 10 мин) и только audio/* (wildcard -
--    браузер шлёт audio/webm;codecs=opus, точный список отклонил бы такой тип).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('voice', 'voice', false, 26214400, ARRAY['audio/*'])
  ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400, allowed_mime_types = ARRAY['audio/*'];

-- 4. RPC для health: PostgREST не видит схемы cron и storage - читаем через SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.infra_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ext boolean;
  v_jobs jsonb := '{}'::jsonb;
  v_bucket text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_ext;
  IF v_ext THEN
    SELECT COALESCE(jsonb_object_agg(j.jobname, jsonb_build_object(
        'schedule', j.schedule,
        'active', j.active,
        'last_status', r.status,
        'last_run_at', r.start_time
      )), '{}'::jsonb)
    INTO v_jobs
    FROM cron.job j
    LEFT JOIN LATERAL (
      SELECT d.status, d.start_time FROM cron.job_run_details d
      WHERE d.jobid = j.jobid ORDER BY d.start_time DESC LIMIT 1
    ) r ON true;
  END IF;
  SELECT CASE WHEN b.public THEN 'public' ELSE 'private' END INTO v_bucket
    FROM storage.buckets b WHERE b.id = 'voice';
  RETURN jsonb_build_object(
    'cron', jsonb_build_object('extension', v_ext, 'jobs', v_jobs),
    'storage', jsonb_build_object('voice_bucket', COALESCE(v_bucket, 'missing'))
  );
END $$;
REVOKE ALL ON FUNCTION public.infra_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.infra_status() TO service_role;

COMMIT;
