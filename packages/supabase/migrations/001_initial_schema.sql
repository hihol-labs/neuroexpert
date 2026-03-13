-- 001_initial_schema.sql
-- НейроЭксперт — полная схема БД (15 таблиц)
-- Все таблицы в схеме public, UUID PK, индексы, CHECK-ограничения

-- ============================================================
-- Расширения
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- 1. niches (ниши) — должна быть создана ДО profiles
-- ============================================================
CREATE TABLE public.niches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  slug            TEXT NOT NULL UNIQUE,
  icon            TEXT,
  is_focus        BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  seed_keywords   TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. profiles (профили экспертов)
-- ============================================================
CREATE TABLE public.profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT NOT NULL,
  full_name               TEXT NOT NULL,
  slug                    TEXT UNIQUE NOT NULL,
  phone                   TEXT,
  telegram_id             BIGINT UNIQUE,
  telegram_username       TEXT,
  avatar_url              TEXT,
  bio                     TEXT,
  qualification           TEXT,
  city                    TEXT,
  -- E-E-A-T поля
  alumni_of               TEXT,
  works_for               TEXT,
  knows_about             TEXT[],
  years_experience        INTEGER,
  consultation_price      INTEGER,
  consultation_url        TEXT,
  niche_id                UUID REFERENCES public.niches(id),
  sub_niche               TEXT,
  subscription_tier       TEXT NOT NULL DEFAULT 'free'
                            CHECK (subscription_tier IN ('free','starter','pro','expert','business','enterprise')),
  subscription_expires_at TIMESTAMPTZ,
  trust_score             REAL DEFAULT 0,
  is_verified             BOOLEAN DEFAULT FALSE,
  is_published            BOOLEAN DEFAULT FALSE,
  onboarding_completed    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_slug ON public.profiles(slug);
CREATE INDEX idx_profiles_niche ON public.profiles(niche_id);
CREATE INDEX idx_profiles_telegram ON public.profiles(telegram_id);
CREATE INDEX idx_profiles_tier ON public.profiles(subscription_tier);

-- ============================================================
-- 3. questions (вопросы / спрос)
-- ============================================================
CREATE TABLE public.questions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id                UUID NOT NULL REFERENCES public.niches(id),
  question_text           TEXT NOT NULL,
  slug                    TEXT NOT NULL,
  source                  TEXT NOT NULL CHECK (source IN ('wordstat','serpapi','yandex_kyu','manual')),
  monthly_volume          INTEGER,
  competition             TEXT CHECK (competition IN ('low','medium','high')),
  gap_score               SMALLINT CHECK (gap_score BETWEEN 0 AND 10),
  ai_response_chatgpt     TEXT,
  ai_response_perplexity  TEXT,
  ai_response_yandexgpt   TEXT,
  has_expert_name         BOOLEAN,
  has_specific_examples   BOOLEAN,
  has_source_link         BOOLEAN,
  gap_analyzed_at         TIMESTAMPTZ,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),

  UNIQUE(niche_id, question_text)
);

CREATE INDEX idx_questions_niche ON public.questions(niche_id);
CREATE INDEX idx_questions_gap ON public.questions(gap_score DESC);
CREATE INDEX idx_questions_volume ON public.questions(monthly_volume DESC);

-- ============================================================
-- 4. orders (заказы — подборка дыр для эксперта)
-- ============================================================
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  question_id     UUID NOT NULL REFERENCES public.questions(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','recording','processing','review','published','rejected','expired')),
  week_number     INTEGER NOT NULL,
  recommendation  TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(expert_id, question_id)
);

CREATE INDEX idx_orders_expert ON public.orders(expert_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- ============================================================
-- 5. voice_recordings (голосовые записи)
-- ============================================================
CREATE TABLE public.voice_recordings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id               UUID NOT NULL REFERENCES public.profiles(id),
  order_id                UUID REFERENCES public.orders(id),
  file_path               TEXT NOT NULL,
  file_size               INTEGER,
  duration_seconds        INTEGER,
  source                  TEXT NOT NULL CHECK (source IN ('telegram','web')),
  mime_type               TEXT NOT NULL,
  transcript              TEXT,
  transcription_provider  TEXT,
  transcription_status    TEXT DEFAULT 'pending'
                            CHECK (transcription_status IN ('pending','processing','completed','failed')),
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_expert ON public.voice_recordings(expert_id);

-- ============================================================
-- 6. content_packages (контент-пакеты)
-- ============================================================
CREATE TABLE public.content_packages (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id               UUID NOT NULL REFERENCES public.profiles(id),
  order_id                UUID REFERENCES public.orders(id),
  voice_id                UUID REFERENCES public.voice_recordings(id),
  question_id             UUID REFERENCES public.questions(id),
  status                  TEXT NOT NULL DEFAULT 'generating'
                            CHECK (status IN ('generating','review','approved','published','rejected','failed')),
  title                   TEXT,

  -- 5 форматов контента
  format_telegram_post    TEXT,
  format_seo_article      TEXT,
  format_cards            JSONB,
  format_reels_script     TEXT,
  format_faq              JSONB,

  -- SEO-метаданные
  meta_title              TEXT,
  meta_description        TEXT,
  slug                    TEXT,
  keywords                TEXT[],
  expert_quotes           TEXT[],

  -- AIO-метрики контента
  word_count              INTEGER,
  has_tldr                BOOLEAN DEFAULT FALSE,
  has_table               BOOLEAN DEFAULT FALSE,
  passage_count           INTEGER,

  -- Публикация
  published_at            TIMESTAMPTZ,
  published_url           TEXT,

  -- Content Freshness
  last_refreshed_at       TIMESTAMPTZ,
  refresh_status          TEXT DEFAULT 'fresh'
                            CHECK (refresh_status IN ('fresh','needs_refresh','refreshing')),

  -- LLM-метаданные
  llm_provider            TEXT,
  llm_model               TEXT,
  generation_cost         REAL,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_expert ON public.content_packages(expert_id);
CREATE INDEX idx_content_status ON public.content_packages(status);
CREATE INDEX idx_content_slug ON public.content_packages(slug);
CREATE INDEX idx_content_published ON public.content_packages(published_at DESC) WHERE status = 'published';

-- ============================================================
-- 7. citation_checks (трекинг цитирования)
-- ============================================================
CREATE TABLE public.citation_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id        UUID NOT NULL REFERENCES public.content_packages(id),
  expert_id         UUID NOT NULL REFERENCES public.profiles(id),
  ai_platform       TEXT NOT NULL CHECK (ai_platform IN ('chatgpt','perplexity','yandexgpt','google_ai','gigachat')),
  question_text     TEXT NOT NULL,
  ai_response       TEXT,
  is_cited          BOOLEAN DEFAULT FALSE,
  citation_type     TEXT CHECK (citation_type IN ('name','url','content_match','none')),
  similarity_score  REAL,
  checked_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_citations_content ON public.citation_checks(content_id);
CREATE INDEX idx_citations_expert ON public.citation_checks(expert_id);
CREATE INDEX idx_citations_date ON public.citation_checks(checked_at DESC);

-- ============================================================
-- 8. serp_positions (позиции в поиске)
-- ============================================================
CREATE TABLE public.serp_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      UUID NOT NULL REFERENCES public.content_packages(id),
  search_engine   TEXT NOT NULL CHECK (search_engine IN ('yandex','google')),
  query           TEXT NOT NULL,
  position        SMALLINT,
  url             TEXT,
  checked_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_serp_content ON public.serp_positions(content_id);
CREATE INDEX idx_serp_date ON public.serp_positions(checked_at DESC);

-- ============================================================
-- 9. leads (заявки / лиды)
-- ============================================================
CREATE TABLE public.leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  content_id      UUID REFERENCES public.content_packages(id),
  client_name     TEXT NOT NULL,
  client_contact  TEXT NOT NULL,
  client_message  TEXT,
  source          TEXT NOT NULL CHECK (source IN ('page_button','catalog','direct')),
  referrer        TEXT,
  status          TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','notified','accepted','rejected','completed')),
  notified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_expert ON public.leads(expert_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_date ON public.leads(created_at DESC);

-- ============================================================
-- 10. payments (платежи)
-- ============================================================
CREATE TABLE public.payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id               UUID NOT NULL REFERENCES public.profiles(id),
  type                    TEXT NOT NULL CHECK (type IN ('audit','subscription','lead_fee','commission')),
  amount                  INTEGER NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'RUB',
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','succeeded','failed','refunded')),
  yukassa_payment_id      TEXT UNIQUE,
  yukassa_subscription_id TEXT,
  description             TEXT,
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_expert ON public.payments(expert_id);
CREATE INDEX idx_payments_yukassa ON public.payments(yukassa_payment_id);

-- ============================================================
-- 11. email_subscribers (email-подписчики)
-- ============================================================
CREATE TABLE public.email_subscribers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  email           TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(expert_id, email)
);

CREATE INDEX idx_email_subs_expert ON public.email_subscribers(expert_id);

-- ============================================================
-- 12. jobs (очередь задач)
-- ============================================================
CREATE TABLE public.jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL CHECK (type IN (
    'collect_demand','find_gaps','generate_orders','expand_query',
    'transcribe','generate_content','validate_content',
    'track_citations','track_serp','submit_sitemap','crosspost','crosspost_social',
    'calculate_trust_score','send_email_digest',
    'refresh_content','check_cwv','optimize_images'
  )),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed','retry')),
  payload         JSONB NOT NULL DEFAULT '{}',
  result          JSONB,
  error           TEXT,
  attempts        SMALLINT DEFAULT 0,
  max_attempts    SMALLINT DEFAULT 3,
  priority        SMALLINT DEFAULT 5,
  scheduled_at    TIMESTAMPTZ DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_status ON public.jobs(status, priority, scheduled_at);
CREATE INDEX idx_jobs_type ON public.jobs(type);

-- ============================================================
-- 13. sub_queries (подзапросы — Query Fan-Out)
-- ============================================================
CREATE TABLE public.sub_queries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_question_id  UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  sub_query_text      TEXT NOT NULL,
  ai_response         TEXT,
  gap_score           SMALLINT CHECK (gap_score BETWEEN 0 AND 10),
  analyzed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subqueries_parent ON public.sub_queries(parent_question_id);
CREATE INDEX idx_subqueries_gap ON public.sub_queries(gap_score DESC);

-- ============================================================
-- 14. cwv_metrics (Core Web Vitals)
-- ============================================================
CREATE TABLE public.cwv_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id          UUID REFERENCES public.content_packages(id),
  page_url            TEXT NOT NULL,
  lcp_ms              REAL,
  fid_ms              REAL,
  cls_score           REAL,
  fcp_ms              REAL,
  performance_score   REAL,
  is_passing          BOOLEAN DEFAULT FALSE,
  checked_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cwv_content ON public.cwv_metrics(content_id);
CREATE INDEX idx_cwv_date ON public.cwv_metrics(checked_at DESC);

-- ============================================================
-- 15. Триггер updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_questions
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_content_packages
  BEFORE UPDATE ON public.content_packages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
