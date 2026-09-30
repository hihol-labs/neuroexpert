-- 035_billing_and_analytics.sql
-- R-09 (2026-09-30). Тарифы, срок подписки, аналитика цитирования для всех, ниши экспертов с сайта.
-- 1) cron daily-subscription-expiry: платный тариф возвращается к free, когда subscription_expires_at
--    прошёл (E-AUTO-15; автосписаний нет, раньше один платёж давал тариф навсегда).
-- 2) cron weekly-citations / weekly-serp / monthly-trust: расписания из 003 на проде никогда не
--    существовали (pg_cron поднят только в 031); создаются заново БЕЗ гейта по тарифу - решение
--    владельца 2026-09-06 «аналитику открыть для всех» (E-AUTO-11). Guard: не ставить job, пока
--    предыдущий для того же эксперта ещё pending/processing (worker простаивал - очередь не растёт).
-- 3) expert_niches: регистрация на сайте пишет только profiles.niche_id, а подбор тем читает
--    expert_niches - эксперт с сайта тем не получал никогда. Backfill + триггер синхронизации (только
--    для экспертов без строк expert_niches, чтобы не превысить лимит ниш тарифа).
-- 4) Защита биллинга от самого пользователя (security-аудит R-09): политика 002 «Users can update own
--    profile» без WITH CHECK и без ограничения колонок - authenticated мог сам поставить
--    subscription_tier = 'enterprise' или is_published = true. Триггер отклоняет такие изменения для
--    всех ролей, кроме серверных (postgres, service_role, supabase_admin); политика пересоздаётся с
--    WITH CHECK.
-- 5) Счётчик лимита «пакетов в месяц» - неудаляемый леджер expert_package_ledger (триггер AFTER
--    INSERT на content_packages, доступ только service role): владелец content_packages (FOR ALL по
--    002) мог удалить пакет или сдвинуть created_at и обнулить счётчик.
-- 6) RLS на expert_niches (в 007 не включался): чтение - владелец, запись - только service role
--    (бот/триггер); иначе authenticated мог менять ниши любого эксперта в обход лимита.
-- Идемпотентно и транзакционно. Данные: добавление строк expert_niches и expert_package_ledger
-- (ON CONFLICT DO NOTHING).
-- Rollback: SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('daily-subscription-expiry',
-- 'weekly-citations','weekly-serp','monthly-trust'); DROP TRIGGER profiles_sync_expert_niche ON public.profiles;
-- DROP FUNCTION public.sync_expert_niche_from_profile(); DROP TRIGGER profiles_protect_billing ON public.profiles;
-- DROP FUNCTION public.protect_billing_columns(); DROP TRIGGER content_packages_ledger ON public.content_packages;
-- DROP FUNCTION public.record_package_in_ledger(); DROP TABLE public.expert_package_ledger;
-- ALTER TABLE public.expert_niches DISABLE ROW LEVEL SECURITY; строки expert_niches можно оставить.
BEGIN;

-- Миграцию применяет серверная роль: расписания cron исполняются от роли, создавшей задание, а триггер
-- защиты биллинга пропускает только postgres / service_role / supabase_admin (иначе sweep молча упал бы).
DO $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'apply 035 as postgres or supabase_admin (current role: %)', current_user;
  END IF;
END $$;

-- cron: та же проверка базы, что в 031/034 (иначе задание регистрируется и не исполняется).
DO $$
BEGIN
  IF current_setting('cron.database_name', true) IS DISTINCT FROM current_database() THEN
    RAISE EXCEPTION 'cron.database_name (%) does not match current database (%)', current_setting('cron.database_name', true), current_database();
  END IF;
END $$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('daily-subscription-expiry', 'weekly-citations', 'weekly-serp', 'monthly-trust');

-- 1) Срок подписки: ежедневно 00:15 UTC. NULL-срок не трогаем (тариф, выданный вручную без срока).
SELECT cron.schedule('daily-subscription-expiry', '15 0 * * *',
  $$UPDATE public.profiles SET subscription_tier = 'free', updated_at = now()
    WHERE subscription_tier <> 'free' AND subscription_expires_at IS NOT NULL AND subscription_expires_at < now()$$);

-- 2) Аналитика для всех опубликованных экспертов (без условия по тарифу).
SELECT cron.schedule('weekly-citations', '0 4 * * 3',
  $$INSERT INTO public.jobs (type, payload)
    SELECT 'track_citations', jsonb_build_object('expert_id', p.id) FROM public.profiles p
    WHERE p.is_published = TRUE
      AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.type = 'track_citations' AND j.status IN ('pending', 'processing') AND j.payload->>'expert_id' = p.id::text)$$);

SELECT cron.schedule('weekly-serp', '0 5 * * 4',
  $$INSERT INTO public.jobs (type, payload)
    SELECT 'track_serp', jsonb_build_object('expert_id', p.id) FROM public.profiles p
    WHERE p.is_published = TRUE
      AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.type = 'track_serp' AND j.status IN ('pending', 'processing') AND j.payload->>'expert_id' = p.id::text)$$);

SELECT cron.schedule('monthly-trust', '0 2 1 * *',
  $$INSERT INTO public.jobs (type, payload)
    SELECT 'calculate_trust_score', jsonb_build_object('expert_id', p.id) FROM public.profiles p
    WHERE p.is_published = TRUE
      AND NOT EXISTS (SELECT 1 FROM public.jobs j WHERE j.type = 'calculate_trust_score' AND j.status IN ('pending', 'processing') AND j.payload->>'expert_id' = p.id::text)$$);

-- 3) Ниши эксперта: backfill из profiles.niche_id только тем, у кого строк expert_niches нет вовсе
--    (у выбравших ниши в боте profiles.niche_id уже входит в выбор; лишняя строка превысила бы лимит).
INSERT INTO public.expert_niches (expert_id, niche_id)
SELECT p.id, p.niche_id FROM public.profiles p
WHERE p.niche_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.expert_niches e WHERE e.expert_id = p.id)
ON CONFLICT DO NOTHING;

-- SECURITY DEFINER: триггер срабатывает и при UPDATE профиля самим пользователем (RLS), вставка в
-- expert_niches не должна зависеть от его прав. Только первая ниша эксперта (пока строк нет);
-- дальнейший набор ниш ведёт бот в пределах лимита тарифа.
CREATE OR REPLACE FUNCTION public.sync_expert_niche_from_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.niche_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.expert_niches e WHERE e.expert_id = NEW.id) THEN
    INSERT INTO public.expert_niches (expert_id, niche_id) VALUES (NEW.id, NEW.niche_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_sync_expert_niche ON public.profiles;
CREATE TRIGGER profiles_sync_expert_niche
  AFTER INSERT OR UPDATE OF niche_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_expert_niche_from_profile();

-- 4) Биллинг меняют только серверные роли. Функции НЕ SECURITY DEFINER: current_user должен быть ролью
--    вызывающего (PostgREST: anon / authenticated / service_role; cron и миграции: postgres).
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Публикацию профиля (is_published, is_verified) тоже ставит только сервер (publishContent R-07):
-- самопубликация включала бы профиль в еженедельную аналитику LLM/XMLRiver.
CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND (NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier
          OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
          OR NEW.trust_score IS DISTINCT FROM OLD.trust_score
          OR NEW.is_published IS DISTINCT FROM OLD.is_published
          OR NEW.is_verified IS DISTINCT FROM OLD.is_verified) THEN
    RAISE EXCEPTION 'billing columns are read-only for role %', current_user USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_protect_billing ON public.profiles;
CREATE TRIGGER profiles_protect_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_columns();

-- 5) Леджер пакетов: строка на каждый созданный content_package, переживает удаление пакета,
--    пишется только триггером, читается только service role (RLS без политик + REVOKE).
CREATE TABLE IF NOT EXISTS public.expert_package_ledger (
  package_id uuid PRIMARY KEY,
  expert_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expert_package_ledger_expert_month ON public.expert_package_ledger (expert_id, created_at);
ALTER TABLE public.expert_package_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.expert_package_ledger FROM PUBLIC, anon, authenticated;

-- created_at леджера - now() сервера, а не NEW.created_at: владелец может вставить пакет «задним числом»
-- по RLS 002 (FOR ALL), и такая строка выпала бы из месячного окна.
CREATE OR REPLACE FUNCTION public.record_package_in_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.expert_package_ledger (package_id, expert_id, created_at)
  VALUES (NEW.id, NEW.expert_id, now())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_package_in_ledger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_expert_niche_from_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS content_packages_ledger ON public.content_packages;
CREATE TRIGGER content_packages_ledger
  AFTER INSERT ON public.content_packages
  FOR EACH ROW EXECUTE FUNCTION public.record_package_in_ledger();

INSERT INTO public.expert_package_ledger (package_id, expert_id, created_at)
SELECT id, expert_id, created_at FROM public.content_packages
ON CONFLICT DO NOTHING;

-- 6) expert_niches: RLS (владелец читает; пишут бот и триггер под service role / postgres).
ALTER TABLE public.expert_niches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Expert can view own niches" ON public.expert_niches;
CREATE POLICY "Expert can view own niches"
  ON public.expert_niches FOR SELECT
  USING (auth.uid() = expert_id);

COMMIT;
