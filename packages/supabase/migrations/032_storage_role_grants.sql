-- 032_storage_role_grants.sql
-- R-05 bugfix (2026-09-18). Штатные гранты Supabase для Storage, которых нет на этой self-hosted БД.
-- Инцидент: бот не смог сохранить голосовое - storage-api ответил 403 «new row violates row-level
-- security policy». storage-api подключается как supabase_storage_admin и переключается на роль из JWT
-- (service_role у бота, web и worker). На нашей БД supabase_storage_admin не был членом
-- anon/authenticated/service_role, а у service_role не было прав на схему storage - переключение
-- и вставка невозможны, ошибка отдаётся клиенту как отказ RLS. Следствие: в bucket voice 0 объектов
-- за всё время (web-загрузка «best effort» до R-05 падала молча).
-- Проверено на проде в транзакциях с ROLLBACK: после этих грантов INSERT под service_role проходит,
-- anon по-прежнему получает «permission denied for table objects».
-- Идемпотентно и транзакционно. Rollback: REVOKE тех же грантов и возврат infra_status() из 031
-- (после отката загрузка аудио снова невозможна).
BEGIN;

-- 1. storage-api обязан уметь переключаться на роль из JWT.
GRANT anon, authenticated, service_role TO supabase_storage_admin;

-- 2. Доступ к схеме storage. Права на таблицы - только service_role и только на две рабочие таблицы:
--    anon/authenticated остаются без прав на таблицы (и без единой RLS-политики), всё чтение и запись
--    идёт через service role. Сознательно НЕ «ALL TABLES IN SCHEMA» (штатный грант Supabase шире):
--    служебная storage.migrations сервисной роли не нужна. Если новая версия storage-api добавит
--    рабочие таблицы, грант на них выдаётся отдельной миграцией - health.upload_ready проверяет только
--    objects и buckets, поэтому такой апгрейд сопровождается прогоном канарейки голосового.
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
-- Только DML на объекты: TRUNCATE / REFERENCES / TRIGGER storage-api не нужны. На buckets - только
-- чтение: bucket создаётся миграцией (031), приложению менять его незачем.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE storage.objects TO service_role;
GRANT SELECT ON TABLE storage.buckets TO service_role;

-- 3. health: право записи через API проверяется, а не предполагается (оракул --stage=infra).
CREATE OR REPLACE FUNCTION public.infra_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_ext boolean;
  v_jobs jsonb := '{}'::jsonb;
  v_bucket text;
  v_upload boolean;
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
  -- Работа через storage-api возможна только при всех условиях (инцидент 2026-09-18); проверяется
  -- ровно тот набор, который выдаёт эта миграция, - частичный отзыв прав не даст ложного true.
  v_upload := pg_has_role('supabase_storage_admin', 'service_role', 'MEMBER')
    AND has_schema_privilege('service_role', 'storage', 'USAGE')
    -- По одной привилегии на вызов: список через запятую в has_table_privilege означает «любая из».
    AND has_table_privilege('service_role', 'storage.objects', 'SELECT')
    AND has_table_privilege('service_role', 'storage.objects', 'INSERT')
    AND has_table_privilege('service_role', 'storage.objects', 'UPDATE')
    AND has_table_privilege('service_role', 'storage.objects', 'DELETE')
    AND has_table_privilege('service_role', 'storage.buckets', 'SELECT');
  RETURN jsonb_build_object(
    'cron', jsonb_build_object('extension', v_ext, 'jobs', v_jobs),
    'storage', jsonb_build_object('voice_bucket', COALESCE(v_bucket, 'missing'), 'upload_ready', v_upload)
  );
END $$;
REVOKE ALL ON FUNCTION public.infra_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.infra_status() TO service_role;

COMMIT;
