-- 034_expert_notifications.sql
-- R-08 (2026-09-26). Уведомления эксперту и привязка Telegram.
-- 1) expert_notifications - дедуп уведомлений эксперту: повтор job notify_expert не шлёт второй раз.
--    Строка «забирается» до отправки; если не дошёл ни один канал, worker её удаляет (повтор job
--    отправит снова). Доступ только service role (RLS включён, политик нет).
-- 2) profiles.telegram_link_nonce / telegram_link_expires_at - одноразовый номер подписанной ссылки
--    привязки Telegram; бот гасит его при использовании.
-- 3) Тип job notify_expert в CHECK jobs.
-- 4) cron weekly-email-digest: раз в неделю письмо подписчикам эксперта о статьях за 7 дней
--    (E-AUTO-9; handler send_email_digest уже есть в worker). Подписчиков на 2026-09-26 - 0.
-- Идемпотентно и транзакционно. Данные не меняются. Rollback: DROP TABLE public.expert_notifications;
-- ALTER TABLE public.profiles DROP COLUMN telegram_link_nonce, DROP COLUMN telegram_link_expires_at;
-- CHECK jobs - прежний список из 026; SELECT cron.unschedule('weekly-email-digest').
BEGIN;

CREATE TABLE IF NOT EXISTS public.expert_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('draft_ready', 'published', 'lead', 'booking')),
  ref_id      uuid NOT NULL,
  telegram    text CHECK (telegram IN ('sent', 'failed', 'skipped')),
  email       text CHECK (email IN ('sent', 'failed', 'skipped')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz,
  UNIQUE (expert_id, kind, ref_id)
);
ALTER TABLE public.expert_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.expert_notifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expert_notifications TO service_role;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_link_nonce text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_link_expires_at timestamptz;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_type_check CHECK (type IN (
  'collect_demand','find_gaps','generate_orders','expand_query',
  'transcribe','generate_content','validate_content',
  'track_citations','track_serp','submit_sitemap','crosspost','crosspost_social',
  'calculate_trust_score','send_email_digest',
  'refresh_content','check_cwv','optimize_images','track_geo_services',
  'generate_daily_growth_tasks','generate_local_weekly_report','generate_b2b_page_draft',
  'analyze_behavior_signals','calculate_unit_economics','generate_agency_report',
  'run_audit','notify_expert'
));

-- cron: та же проверка базы, что в 031 (иначе задание регистрируется и не исполняется).
DO $$
BEGIN
  IF current_setting('cron.database_name', true) IS DISTINCT FROM current_database() THEN
    RAISE EXCEPTION 'cron.database_name (%) does not match current database (%)', current_setting('cron.database_name', true), current_database();
  END IF;
END $$;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'weekly-email-digest';
SELECT cron.schedule('weekly-email-digest', '0 7 * * 1',
  $$INSERT INTO public.jobs (type, payload, priority)
    SELECT 'send_email_digest', jsonb_build_object('expert_id', cp.expert_id, 'content_id', cp.id), 8
    FROM public.content_packages cp
    WHERE cp.status = 'published' AND cp.published_at >= now() - interval '7 days'
      AND EXISTS (SELECT 1 FROM public.email_subscribers s WHERE s.expert_id = cp.expert_id AND s.is_active)
      -- Повторный запуск (ручной, перекрытие окна) не ставит второе письмо по той же статье.
      AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.type = 'send_email_digest' AND j.payload->>'content_id' = cp.id::text)$$
);

COMMIT;
