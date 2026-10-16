-- 026_package_orders.sql
-- G-018 (план утверждён 2026-09-03, .itd-memory/contracts/G-018.md): автономный
-- заказ и оплата пакета «Аудит Старт». Отдельная таблица — заказы экспертам
-- (public.orders) и ручная лид-форма (public.service_orders) не смешиваются с
-- автономным платёжным контуром; public.payments (expert-центричная) не трогается.
--
-- Инварианты, которые держит схема:
--   * один платёж ЮKassa -> ровно один заказ (yukassa_payment_id UNIQUE);
--   * повторный webhook не создаёт второй job: job_id пишется один раз (UNIQUE);
--   * неоплаченный заказ не может нести job (CHECK: job_id только при status paid).

CREATE TABLE IF NOT EXISTS public.package_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  package             TEXT NOT NULL CHECK (package IN ('audit_start')),
  amount_rub          INTEGER NOT NULL CHECK (amount_rub > 0),
  niche_id            UUID NOT NULL REFERENCES public.niches(id),
  city                TEXT NOT NULL CHECK (length(btrim(city)) BETWEEN 2 AND 80),
  email               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','failed','refunded')),
  yukassa_payment_id  TEXT UNIQUE,
  confirmation_url    TEXT,
  job_id              UUID UNIQUE REFERENCES public.jobs(id) ON DELETE SET NULL,
  failure_reason      TEXT,
  -- Дозаполнение на экране ожидания (решение AF-1 №2): сайт, конкуренты,
  -- заметки. Читается исполнением отчёта (G-019); ключи валидирует API.
  details             JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at             TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT package_orders_job_requires_paid
    CHECK (job_id IS NULL OR status IN ('paid','refunded'))
);

CREATE INDEX IF NOT EXISTS idx_package_orders_owner ON public.package_orders(owner_id);
CREATE INDEX IF NOT EXISTS idx_package_orders_status ON public.package_orders(status);

ALTER TABLE public.package_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can view own package orders" ON public.package_orders;
CREATE POLICY "Owner can view own package orders"
  ON public.package_orders FOR SELECT
  USING (auth.uid() = owner_id);
-- Запись только через service_role (API/webhook): политик INSERT/UPDATE для
-- authenticated нет намеренно — клиент не может создать «оплаченный» заказ сам.

-- updated_at: тот же триггер, что у остальных таблиц (001: set_updated_at), если он есть.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS package_orders_set_updated_at ON public.package_orders';
    EXECUTE 'CREATE TRIGGER package_orders_set_updated_at BEFORE UPDATE ON public.package_orders
             FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END $$;

-- Тип job для выполнения аудита (обработчик — G-019; в G-018 job только ставится
-- webhook'ом после оплаты). Полный список повторяет 024 + run_audit.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_type_check CHECK (type IN (
  'collect_demand','find_gaps','generate_orders','expand_query',
  'transcribe','generate_content','validate_content',
  'track_citations','track_serp','submit_sitemap','crosspost','crosspost_social',
  'calculate_trust_score','send_email_digest',
  'refresh_content','check_cwv','optimize_images','track_geo_services',
  'generate_daily_growth_tasks','generate_local_weekly_report','generate_b2b_page_draft',
  'analyze_behavior_signals','calculate_unit_economics','generate_agency_report',
  'run_audit'
));
