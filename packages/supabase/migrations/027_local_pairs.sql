-- 027_local_pairs.sql
-- G-018b шаг 2 (план утверждён 2026-09-04, .itd-memory/contracts/G-018b.md):
-- on-demand пара «вертикаль × город» по спецификации локальных вертикалей v1
-- (SELF_SERVE_PLAN.md, §1/§2/§4/§5/§6).
--
-- Инварианты, которые держит схема:
--   * шаблоны seed keywords — ДАННЫЕ (таблица local_verticals), не код; ровно 8
--     на вертикаль и каждый содержит «{город}» (CHECK local_verticals_templates_8);
--   * пара = строка niches с vertical + city и id с префиксом b (CHECK
--     niches_local_pair_shape); экспертные ниши a0000000-… не затрагиваются
--     (vertical/city/demand_status у них NULL);
--   * cron 003 (weekly-demand: WHERE is_active = TRUE) НЕ меняется — пары
--     создаются с is_active = false и в еженедельный сбор не попадают по
--     построению; активация — ручная операция владельца после канарейки (§5);
--   * один ожидающий email на пару (UNIQUE pair_requests_niche_email);
--     запись только через service_role (RLS без политик).

-- ------------------------------------------------------------ вертикали (данные)
CREATE OR REPLACE FUNCTION public.local_templates_valid(templates TEXT[])
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT cardinality(templates) = 8
     AND (SELECT bool_and(t LIKE '%{город}%' AND length(btrim(t)) > 7)
            FROM unnest(templates) AS t);
$$;

CREATE TABLE IF NOT EXISTS public.local_verticals (
  id                      TEXT PRIMARY KEY CHECK (id ~ '^[a-z]{3,32}$'),
  name                    TEXT NOT NULL UNIQUE,
  seed_keyword_templates  TEXT[] NOT NULL,
  sort                    SMALLINT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT local_verticals_templates_8 CHECK (public.local_templates_valid(seed_keyword_templates))
);

-- Канонический источник шаблонов (спецификация §4). Повторный прогон
-- обновляет шаблоны до спецификации (идемпотентно).
INSERT INTO public.local_verticals (id, name, seed_keyword_templates, sort) VALUES
  ('dental', 'Стоматология', ARRAY[
    'стоматология {город}', 'имплантация зубов {город}', 'виниры цена {город}',
    'детский стоматолог {город}', 'протезирование зубов {город}', 'брекеты цена {город}',
    'удаление зуба мудрости {город}', 'лечение кариеса цена {город}'
  ], 1),
  ('clinic', 'Частная клиника', ARRAY[
    'частная клиника {город}', 'платный терапевт {город}', 'узи платно {город}',
    'сдать анализы {город}', 'гинеколог платно {город}', 'кардиолог приём {город}',
    'медосмотр для работы {город}', 'вызов врача на дом {город}'
  ], 2),
  ('autoservice', 'Автосервис', ARRAY[
    'автосервис {город}', 'ремонт двигателя {город}', 'замена масла {город}',
    'шиномонтаж {город}', 'диагностика автомобиля {город}', 'кузовной ремонт {город}',
    'ремонт ходовой {город}', 'автоэлектрик {город}'
  ], 3)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      seed_keyword_templates = EXCLUDED.seed_keyword_templates,
      sort = EXCLUDED.sort;

ALTER TABLE public.local_verticals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read local verticals" ON public.local_verticals;
CREATE POLICY "Anyone can read local verticals"
  ON public.local_verticals FOR SELECT USING (TRUE);
-- Запись — только service_role (миграции); политик INSERT/UPDATE намеренно нет.

-- ------------------------------------------------------------ пара в niches
ALTER TABLE public.niches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.niches ADD COLUMN IF NOT EXISTS vertical TEXT REFERENCES public.local_verticals(id);
ALTER TABLE public.niches ADD COLUMN IF NOT EXISTS demand_status TEXT
  CHECK (demand_status IN ('queued','running','filled','empty'));
ALTER TABLE public.niches ADD COLUMN IF NOT EXISTS demand_collected_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'niches_local_pair_shape') THEN
    ALTER TABLE public.niches ADD CONSTRAINT niches_local_pair_shape CHECK (
      (vertical IS NULL AND city IS NULL AND demand_status IS NULL AND demand_collected_at IS NULL)
      OR
      (vertical IS NOT NULL AND city IS NOT NULL
        AND length(btrim(city)) BETWEEN 2 AND 80
        AND id::text LIKE 'b%')
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_niches_local_pair
  ON public.niches (vertical, city) WHERE vertical IS NOT NULL;

-- §5: пара РОЖДАЕТСЯ вне cron независимо от вызывающего кода (дефолт
-- niches.is_active = TRUE из 001 иначе утянул бы её в weekly-demand при
-- первом же INSERT без явного is_active). Активация — только последующий
-- UPDATE владельцем после зелёной канарейки; триггер его не блокирует.
CREATE OR REPLACE FUNCTION public.niches_local_pair_born_inactive()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.vertical IS NOT NULL THEN
    NEW.is_active := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS niches_local_pair_born_inactive ON public.niches;
CREATE TRIGGER niches_local_pair_born_inactive
  BEFORE INSERT ON public.niches
  FOR EACH ROW EXECUTE FUNCTION public.niches_local_pair_born_inactive();

-- ------------------------------------------------------------ ожидающие пары
CREATE TABLE IF NOT EXISTS public.pair_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id     UUID NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  email        TEXT NOT NULL CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','notified')),
  notified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pair_requests_niche_email UNIQUE (niche_id, email)
);

CREATE INDEX IF NOT EXISTS idx_pair_requests_pending
  ON public.pair_requests (niche_id) WHERE status = 'pending';

ALTER TABLE public.pair_requests ENABLE ROW LEVEL SECURITY;
-- Политик нет намеренно: email ожидающих читает и пишет только service_role
-- (API при запросе пары, worker при уведомлении).
