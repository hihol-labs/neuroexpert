# PROJECT_ARCHITECTURE.md — НейроЭксперт

> Главный контекстный файл для AI-агента разработки.
> Версия: 1.1 · Март 2026 (обновлён на основе AIO-анализа внешних источников)

---

## 1. Описание продукта

**НейроЭксперт** — AIO-платформа (AI Optimization), которая делает экспертов видимыми для нейросетей и поисковиков и превращает эту видимость в клиентов.

**Домен:** `neuroexpertise.ru`

**Полный цикл:**
1. Находит вопросы с массовым спросом и слабыми AI-ответами (AI Gap Finder)
2. Доставляет эксперту как «заказ» через Telegram-бот
3. Эксперт наговаривает 3–10 минут голосом
4. Платформа транскрибирует и генерирует 5 форматов AIO-контента (Expert Voice Engine)
5. Публикует на индексируемых SSR-страницах с кнопкой «записаться» (AI Publishing Network)
6. Отслеживает цитирование нейросетями и приток клиентов (AI Citation Tracker)

**Целевая аудитория:** практикующие эксперты (психологи, юристы, нутрициологи, врачи, тренеры). Далее — B2B (клиники, юрфирмы, консалтинг).

**Формат разработки:** solo-вайбкодинг (Cursor + Claude Code). Минимум компонентов, self-hosted, итеративный запуск.

---

## 2. Технологический стек

### 2.1. Core

| Компонент | Технология | Версия | Назначение |
|-----------|-----------|--------|------------|
| Frontend + SSR/SSG | Next.js (App Router) | 14.2+ | Лендинг, ЛК эксперта, публичные страницы, SEO/AIO |
| Стили | Tailwind CSS | 3.4+ | Утилитарная стилизация |
| Backend / БД | Supabase (self-hosted) | Latest | PostgreSQL 15+, Auth, Edge Functions, Realtime, Storage |
| Telegram-бот | grammY | 1.x | Основной интерфейс для экспертов |
| Транскрипция (primary) | OpenAI Whisper API | whisper-1 | Голос → текст |
| Транскрипция (fallback) | YandexSpeechKit | v3 | Fallback при санкциях |
| LLM (primary) | Claude API | claude-sonnet-4-20250514 | Генерация контента, анализ дыр |
| LLM (bulk/cheap) | OpenAI API | gpt-4o-mini | Массовый анализ дыр |
| LLM (fallback RU) | YandexGPT API / GigaChat API | latest | Fallback при санкциях |
| Аналитика | Plausible (self-hosted) | latest | Без cookie, 152-ФЗ |
| Продуктовая аналитика | PostHog (self-hosted) | latest | Воронки, события |
| Оплата | ЮKassa SDK | latest | Подписки, split-payment (скользящая комиссия) |
| Хостинг | Coolify | latest | Self-hosted PaaS на собственных серверах |
| CDN | Cloudflare | — | Кеширование статических страниц |
| CI/CD | GitHub + Coolify auto-deploy | — | Push → деплой |
| Email-рассылки | Resend | latest | Транзакционные письма, email-захват |

### 2.2. Данные о спросе

| Источник | API / Метод | Стоимость |
|----------|------------|-----------|
| Яндекс Wordstat | XMLRiver API | ~25₽/1000 запросов |
| Google PAA / SERP | SerpAPI | $50/мес (5000 запросов) |
| Google Search Console | GSC API | Бесплатно |
| Bing Webmaster Tools | Bing API | Бесплатно |
| Яндекс Вебмастер | Webmaster API | Бесплатно |
| Google PageSpeed Insights | PSI API | Бесплатно (Core Web Vitals мониторинг) |

### 2.3. AI-мониторинг

| Задача | Инструмент |
|--------|-----------|
| Прогон вопросов через нейросети | Playwright + Node.js worker |
| Cron-задачи | pg_cron (Supabase) + Node.js worker |
| Мониторинг позиций в поиске | SerpAPI |
| Core Web Vitals мониторинг | Google PageSpeed Insights API |
| Content Freshness контроль | pg_cron + Node.js worker (обновление каждые 90 дней) |
| Query Fan-Out анализ | LLM (разбивка вопроса на подзапросы) |

### 2.4. Runtime-окружение

- **Node.js** 20 LTS
- **PostgreSQL** 15+
- **Docker** + Docker Compose (через Coolify)
- **OS:** Ubuntu 22.04/24.04 (сервер)

---

## 3. Структура проекта

```
neuroexpert/
├── apps/
│   ├── web/                          # Next.js приложение (frontend + SSR/SSG)
│   │   ├── app/
│   │   │   ├── (marketing)/          # Публичные страницы
│   │   │   │   ├── page.tsx          # Лендинг neuroexpertise.ru
│   │   │   │   ├── audit/
│   │   │   │   │   └── page.tsx      # Бесплатный аудит (выбор ниши → 3 дыры)
│   │   │   │   ├── scan/
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── page.tsx  # AI Visibility Scanner (публичный результат)
│   │   │   │   └── pricing/
│   │   │   │       └── page.tsx      # Тарифы
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/          # ЛК эксперта (защищённая зона)
│   │   │   │   ├── layout.tsx        # Sidebar + auth guard
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx      # Главная дашборда (метрики, AI-рейтинг)
│   │   │   │   ├── orders/
│   │   │   │   │   └── page.tsx      # Список заказов (дыры)
│   │   │   │   ├── content/
│   │   │   │   │   ├── page.tsx      # Мои контент-пакеты
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Просмотр/редактирование пакета
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx      # AI Citation Tracker дашборд
│   │   │   │   ├── leads/
│   │   │   │   │   └── page.tsx      # Заявки через «Записаться»
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx      # Профиль эксперта + настройки
│   │   │   │   └── billing/
│   │   │   │       └── page.tsx      # Подписка, платежи
│   │   │   ├── experts/              # Публичные SSG-страницы экспертов
│   │   │   │   ├── page.tsx          # Каталог экспертов (маркетплейс)
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx      # Профиль эксперта
│   │   │   │       └── [articleSlug]/
│   │   │   │           └── page.tsx  # Экспертная статья (SSG + Schema.org)
│   │   │   ├── api/                  # Next.js API routes (тонкие прокси)
│   │   │   │   ├── webhooks/
│   │   │   │   │   ├── yukassa/
│   │   │   │   │   │   └── route.ts  # Вебхук ЮKassa
│   │   │   │   │   └── telegram/
│   │   │   │   │       └── route.ts  # Вебхук Telegram-бота
│   │   │   │   ├── audit/
│   │   │   │   │   └── route.ts      # POST: запуск аудита
│   │   │   │   ├── voice/
│   │   │   │   │   └── route.ts      # POST: загрузка голосового файла (web)
│   │   │   │   ├── content/
│   │   │   │   │   └── route.ts      # POST: запуск генерации контента
│   │   │   │   ├── publish/
│   │   │   │   │   └── route.ts      # POST: публикация статьи
│   │   │   │   ├── leads/
│   │   │   │   │   └── route.ts      # POST: форма «записаться»
│   │   │   │   └── revalidate/
│   │   │   │       └── route.ts      # POST: ISR revalidation
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   ├── robots.ts             # Динамический robots.txt
│   │   │   └── sitemap.ts            # Динамический sitemap.xml
│   │   ├── components/
│   │   │   ├── ui/                   # Базовые UI-компоненты (Button, Input, Card...)
│   │   │   ├── marketing/            # Лендинг, аудит
│   │   │   ├── dashboard/            # ЛК эксперта
│   │   │   ├── expert-page/          # Публичная страница эксперта
│   │   │   └── forms/                # Формы (запись, аудит, профиль)
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts         # Supabase browser client
│   │   │   │   ├── server.ts         # Supabase server client (SSR)
│   │   │   │   └── admin.ts          # Supabase service_role client
│   │   │   ├── schema-org.ts         # Генерация JSON-LD (Article, FAQPage, Person, HowTo, BreadcrumbList, WebPage)
│   │   │   ├── seo.ts               # Meta-теги, Open Graph
│   │   │   ├── content-validator.ts  # Валидация структуры статьи (TL;DR, word_count, passage_count)
│   │   │   └── utils.ts
│   │   ├── middleware.ts             # Auth middleware (Supabase)
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── bot/                          # Telegram-бот (grammY)
│   │   ├── src/
│   │   │   ├── index.ts              # Точка входа, webhook/polling
│   │   │   ├── bot.ts                # Инстанс бота + middleware
│   │   │   ├── commands/
│   │   │   │   ├── start.ts          # /start — регистрация/привязка
│   │   │   │   ├── orders.ts         # /orders — показать заказы
│   │   │   │   ├── record.ts         # /record — начать запись
│   │   │   │   └── status.ts         # /status — мои метрики
│   │   │   ├── handlers/
│   │   │   │   ├── voice.ts          # Обработка голосовых сообщений
│   │   │   │   ├── callback.ts       # Inline-кнопки (✅ Опубликовать / ✏️ Редактировать)
│   │   │   │   └── leads.ts         # Уведомления о новых заявках
│   │   │   ├── services/
│   │   │   │   ├── transcription.ts  # Whisper / YandexSpeechKit
│   │   │   │   └── content-gen.ts    # Вызов LLM для генерации 5 форматов
│   │   │   └── keyboards.ts         # Inline-клавиатуры
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── worker/                       # Node.js воркер для длительных задач
│       ├── src/
│       │   ├── index.ts              # Точка входа, polling очереди jobs
│       │   ├── jobs/
│       │   │   ├── collect-demand.ts # Сбор спроса (Wordstat + SerpAPI)
│       │   │   ├── find-gaps.ts      # Прогон через нейросети, поиск дыр
│       │   │   ├── generate-orders.ts # Формирование заказов из дыр
│       │   │   ├── track-citations.ts # Еженедельный трекинг цитирования
│       │   │   ├── track-serp.ts     # Мониторинг позиций в поиске
│       │   │   ├── submit-sitemap.ts # Отправка sitemap в GSC/Вебмастер/Bing
│       │   │   ├── crosspost.ts      # Кросспост на Дзен/vc.ru (Фаза 3+)
│       │   │   ├── crosspost-social.ts # Размещение на Яндекс Кью, отзовиках, шеринг в Telegram-чаты (усиление бэклинков)
│       │   │   ├── expand-query.ts   # Query fan-out: разбивка вопроса на подзапросы
│       │   │   ├── validate-content.ts # Валидация структуры контента (TL;DR, word_count, таблицы)
│       │   │   ├── refresh-content.ts # Пометка устаревших статей (>90 дней) для обновления
│       │   │   ├── check-cwv.ts      # Core Web Vitals мониторинг через PageSpeed Insights API
│       │   │   └── optimize-images.ts # Конвертация изображений в WebP, сжатие до 150KB
│       │   ├── services/
│       │   │   ├── wordstat.ts       # XMLRiver API client
│       │   │   ├── serpapi.ts        # SerpAPI client
│       │   │   ├── ai-prober.ts      # Прогон вопросов через ChatGPT/Perplexity/YandexGPT
│       │   │   ├── gsc.ts           # Google Search Console API
│       │   │   ├── bing-webmaster.ts # Bing Webmaster Tools API
│       │   │   └── pagespeed.ts     # Google PageSpeed Insights API client
│       │   └── queue.ts             # Polling таблицы jobs из Supabase
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                       # Общий код между apps
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── database.ts       # Типы, сгенерированные из Supabase
│   │   │   │   ├── content.ts        # ContentPackage, Format, Order
│   │   │   │   └── index.ts
│   │   │   ├── llm/
│   │   │   │   ├── index.ts          # Абстрактный LLM-слой (интерфейс)
│   │   │   │   ├── claude.ts         # Claude adapter
│   │   │   │   ├── openai.ts         # OpenAI adapter
│   │   │   │   ├── yandexgpt.ts      # YandexGPT adapter
│   │   │   │   └── gigachat.ts       # GigaChat adapter
│   │   │   ├── transcription/
│   │   │   │   ├── index.ts          # Абстрактный STT-слой
│   │   │   │   ├── whisper.ts        # OpenAI Whisper adapter
│   │   │   │   └── yandex-stt.ts     # YandexSpeechKit adapter
│   │   │   ├── prompts/
│   │   │   │   ├── gap-analysis.ts   # Промпты для анализа дыр
│   │   │   │   ├── content-gen.ts    # Промпты для 5 форматов (включая TL;DR, Passage Ranking структуру)
│   │   │   │   ├── filter.ts         # Промпты для фильтрации вопросов
│   │   │   │   └── query-fanout.ts   # Промпт для разбивки запроса на подзапросы (query fan-out)
│   │   │   ├── content-structure.ts  # Шаблон структуры статьи (ARTICLE_STRUCTURE_TEMPLATE)
│   │   │   └── constants.ts          # Ниши, статусы, лимиты, AIO-параметры (длина, CWV пороги)
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── supabase/                     # Supabase конфигурация
│       ├── migrations/               # SQL-миграции
│       │   ├── 001_initial_schema.sql
│       │   ├── 002_rls_policies.sql
│       │   └── ...
│       ├── functions/                # Supabase Edge Functions
│       │   ├── audit-free/           # Бесплатный аудит (3 дыры) → CTA на Starter
│       │   │   └── index.ts
│       │   ├── generate-content/     # Генерация контент-пакета
│       │   │   └── index.ts
│       │   └── cron-scheduler/       # Запуск периодических задач
│       │       └── index.ts
│       ├── seed.sql                  # Начальные данные (ниши, ключевые слова)
│       └── config.toml               # Supabase config
│
├── docker/
│   ├── docker-compose.yml            # Все сервисы
│   ├── web.Dockerfile
│   ├── bot.Dockerfile
│   ├── worker.Dockerfile
│   └── nginx/
│       └── nginx.conf
│
├── scripts/
│   ├── seed-niches.ts               # Заполнение 20 ниш + ключевых слов
│   ├── generate-types.sh            # Генерация типов из Supabase
│   ├── validate-aio.ts              # Скрипт мониторинга AIO: прогон страниц через нейросети + отчёт
│   └── deploy.sh                    # Деплой-скрипт
│
├── .env.example
├── .gitignore
├── turbo.json                       # Turborepo конфиг (monorepo)
├── package.json                     # Root package.json
└── README.md
```

---

## 4. Схема базы данных

Все таблицы в схеме `public` PostgreSQL (Supabase). UUID как первичные ключи. RLS (Row Level Security) на всех пользовательских таблицах.

### 4.1. Пользователи и аутентификация

Аутентификация через **Supabase Auth** (`auth.users`). Профиль эксперта — отдельная таблица.

```sql
-- Расширение профиля auth.users
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,              -- URL: /experts/{slug}
  phone           TEXT,
  telegram_id     BIGINT UNIQUE,                     -- Telegram user ID
  telegram_username TEXT,
  avatar_url      TEXT,
  bio             TEXT,                               -- Описание эксперта (до 1000 символов)
  qualification   TEXT,                               -- "Клинический психолог, КПТ, 8 лет опыта"
  city            TEXT,
  -- E-E-A-T поля (редактируемые в ЛК, используются в Schema.org Person)
  alumni_of       TEXT,                               -- Образование: "МГУ, факультет психологии" → Schema.org alumniOf
  works_for       TEXT,                               -- Место работы: "Клиника «Альянс»" → Schema.org worksFor
  knows_about     TEXT[],                             -- Области экспертизы: ["КПТ","тревожные расстройства"] → Schema.org knowsAbout
  years_experience INTEGER,                           -- Стаж в годах (для блока «Об авторе»)
  consultation_price INTEGER,                        -- Цена консультации в рублях
  consultation_url TEXT,                              -- Внешняя ссылка для записи (Yclients и т.д.)
  niche_id        UUID REFERENCES public.niches(id),
  sub_niche       TEXT,                               -- Свободный текст поднишы
  subscription_tier TEXT NOT NULL DEFAULT 'free'
                    CHECK (subscription_tier IN ('free','starter','pro','expert','business','enterprise')),
  subscription_expires_at TIMESTAMPTZ,
  trust_score     REAL DEFAULT 0,                    -- Expert Trust Score (0–100)
  is_verified     BOOLEAN DEFAULT FALSE,             -- Верификация образования
  is_published    BOOLEAN DEFAULT FALSE,             -- Показывать в каталоге
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_slug ON public.profiles(slug);
CREATE INDEX idx_profiles_niche ON public.profiles(niche_id);
CREATE INDEX idx_profiles_telegram ON public.profiles(telegram_id);
CREATE INDEX idx_profiles_tier ON public.profiles(subscription_tier);
```

### 4.2. Ниши

```sql
CREATE TABLE public.niches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,              -- "Психология и психотерапия"
  slug            TEXT NOT NULL UNIQUE,              -- "psychology"
  icon            TEXT,                               -- Emoji или иконка
  is_focus        BOOLEAN DEFAULT FALSE,             -- Фокусная (5 денежных ниш)
  is_active       BOOLEAN DEFAULT TRUE,
  seed_keywords   TEXT[] NOT NULL DEFAULT '{}',      -- Корневые ключевые слова для Wordstat
  created_at      TIMESTAMPTZ DEFAULT now()
);
-- 20 ниш заполняются через seed.sql
```

### 4.3. Вопросы (спрос)

```sql
CREATE TABLE public.questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_id        UUID NOT NULL REFERENCES public.niches(id),
  question_text   TEXT NOT NULL,                     -- "Как перестать срываться на ребёнка"
  slug            TEXT NOT NULL,                     -- URL-safe slug
  source          TEXT NOT NULL CHECK (source IN ('wordstat','serpapi','yandex_kyu','manual')),
  monthly_volume  INTEGER,                           -- Частотность из Wordstat
  competition     TEXT CHECK (competition IN ('low','medium','high')),

  -- Результат анализа дыр (из AI-прогона)
  gap_score       SMALLINT CHECK (gap_score BETWEEN 0 AND 10), -- 0 = нет дыры, 10 = огромная дыра
  ai_response_chatgpt   TEXT,                        -- Текущий ответ ChatGPT
  ai_response_perplexity TEXT,
  ai_response_yandexgpt  TEXT,
  has_expert_name BOOLEAN,                           -- Есть ли имя эксперта в ответе AI
  has_specific_examples BOOLEAN,
  has_source_link BOOLEAN,
  gap_analyzed_at TIMESTAMPTZ,                       -- Когда последний раз анализировали

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(niche_id, question_text)
);

CREATE INDEX idx_questions_niche ON public.questions(niche_id);
CREATE INDEX idx_questions_gap ON public.questions(gap_score DESC);
CREATE INDEX idx_questions_volume ON public.questions(monthly_volume DESC);
```

### 4.4. Заказы (подборка дыр для эксперта)

```sql
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  question_id     UUID NOT NULL REFERENCES public.questions(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','recording','processing','review','published','rejected','expired')),
  week_number     INTEGER NOT NULL,                  -- Номер недели (для еженедельной рассылки)
  recommendation  TEXT,                               -- Рекомендация от системы
  expires_at      TIMESTAMPTZ,                       -- Заказ истекает через 7 дней
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(expert_id, question_id)
);

CREATE INDEX idx_orders_expert ON public.orders(expert_id);
CREATE INDEX idx_orders_status ON public.orders(status);
```

### 4.5. Голосовые записи

```sql
CREATE TABLE public.voice_recordings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  order_id        UUID REFERENCES public.orders(id),
  file_path       TEXT NOT NULL,                     -- Supabase Storage path
  file_size       INTEGER,                           -- Байт
  duration_seconds INTEGER,                          -- Длительность записи
  source          TEXT NOT NULL CHECK (source IN ('telegram','web')),
  mime_type       TEXT NOT NULL,                     -- audio/ogg, audio/webm
  transcript      TEXT,                               -- Расшифровка (Whisper/YandexSTT)
  transcription_provider TEXT,                       -- 'whisper' | 'yandex_stt'
  transcription_status TEXT DEFAULT 'pending'
                    CHECK (transcription_status IN ('pending','processing','completed','failed')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_expert ON public.voice_recordings(expert_id);
```

### 4.6. Контент-пакеты

```sql
CREATE TABLE public.content_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  order_id        UUID REFERENCES public.orders(id),
  voice_id        UUID REFERENCES public.voice_recordings(id),
  question_id     UUID REFERENCES public.questions(id),
  status          TEXT NOT NULL DEFAULT 'generating'
                    CHECK (status IN ('generating','review','approved','published','rejected','failed')),
  title           TEXT,                               -- Заголовок (= вопрос)

  -- 5 форматов контента
  format_telegram_post   TEXT,                       -- Формат 1: пост для Telegram
  format_seo_article     TEXT,                       -- Формат 2: SEO-статья (18000–22000 символов / 2900–3500 слов)
  format_cards           JSONB,                      -- Формат 3: карточки [{title, text}]
  format_reels_script    TEXT,                       -- Формат 4: скрипт для Reels/Shorts
  format_faq             JSONB,                      -- Формат 5: FAQ [{question, answer}]

  -- SEO-метаданные
  meta_title       TEXT,                             -- <title> (вопрос + имя)
  meta_description TEXT,                             -- <meta description> (150 символов)
  slug             TEXT,                             -- URL: /experts/{expert_slug}/{slug}
  keywords         TEXT[],                           -- Ключевые слова
  expert_quotes    TEXT[],                           -- Прямые цитаты эксперта

  -- AIO-метрики контента (валидация структуры)
  word_count       INTEGER,                          -- Количество слов (target: 2900–3500)
  has_tldr         BOOLEAN DEFAULT FALSE,            -- Есть TL;DR блок в начале (40–60 слов)
  has_table        BOOLEAN DEFAULT FALSE,            -- Есть таблица или структурированный список
  passage_count    INTEGER,                          -- Количество самодостаточных H2/H3 блоков (target: 6–10)

  -- Публикация
  published_at     TIMESTAMPTZ,
  published_url    TEXT,                             -- Полный URL опубликованной страницы

  -- Content Freshness (обновление контента)
  last_refreshed_at TIMESTAMPTZ,                    -- Дата последнего обновления контента
  refresh_status   TEXT DEFAULT 'fresh'
                    CHECK (refresh_status IN ('fresh','needs_refresh','refreshing')),

  -- LLM-метаданные
  llm_provider     TEXT,                             -- 'claude' | 'openai' | 'yandexgpt'
  llm_model        TEXT,                             -- Конкретная модель
  generation_cost  REAL,                             -- Стоимость генерации в рублях

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_expert ON public.content_packages(expert_id);
CREATE INDEX idx_content_status ON public.content_packages(status);
CREATE INDEX idx_content_slug ON public.content_packages(slug);
CREATE INDEX idx_content_published ON public.content_packages(published_at DESC) WHERE status = 'published';
```

### 4.7. Трекинг цитирования

```sql
CREATE TABLE public.citation_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      UUID NOT NULL REFERENCES public.content_packages(id),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  ai_platform     TEXT NOT NULL CHECK (ai_platform IN ('chatgpt','perplexity','yandexgpt','google_ai','gigachat')),
  question_text   TEXT NOT NULL,                     -- Какой вопрос задавали
  ai_response     TEXT,                               -- Полный ответ нейросети
  is_cited        BOOLEAN DEFAULT FALSE,             -- Найдено цитирование?
  citation_type   TEXT CHECK (citation_type IN ('name','url','content_match','none')),
  similarity_score REAL,                             -- Cosine similarity (0–1)
  checked_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_citations_content ON public.citation_checks(content_id);
CREATE INDEX idx_citations_expert ON public.citation_checks(expert_id);
CREATE INDEX idx_citations_date ON public.citation_checks(checked_at DESC);
```

### 4.8. Позиции в поиске (SERP)

```sql
CREATE TABLE public.serp_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      UUID NOT NULL REFERENCES public.content_packages(id),
  search_engine   TEXT NOT NULL CHECK (search_engine IN ('yandex','google')),
  query           TEXT NOT NULL,
  position        SMALLINT,                          -- Позиция в выдаче (NULL = не найден)
  url             TEXT,                               -- URL в выдаче
  checked_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_serp_content ON public.serp_positions(content_id);
CREATE INDEX idx_serp_date ON public.serp_positions(checked_at DESC);
```

### 4.9. Заявки (лиды)

```sql
CREATE TABLE public.leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  content_id      UUID REFERENCES public.content_packages(id), -- С какой страницы пришёл
  client_name     TEXT NOT NULL,
  client_contact  TEXT NOT NULL,                     -- Telegram/телефон/email
  client_message  TEXT,                               -- Тема запроса
  source          TEXT NOT NULL CHECK (source IN ('page_button','catalog','direct')),
  referrer        TEXT,                               -- Откуда пришёл (perplexity.ai, yandex.ru, google.com...)
  status          TEXT NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new','notified','accepted','rejected','completed')),
  notified_at     TIMESTAMPTZ,                       -- Когда уведомили эксперта
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_expert ON public.leads(expert_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_date ON public.leads(created_at DESC);
```

### 4.10. Подписки и платежи

```sql
CREATE TABLE public.payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  type            TEXT NOT NULL CHECK (type IN ('audit','subscription','lead_fee','commission')),
  amount          INTEGER NOT NULL,                  -- Сумма в копейках
  currency        TEXT NOT NULL DEFAULT 'RUB',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','succeeded','failed','refunded')),
  yukassa_payment_id TEXT UNIQUE,                    -- ID платежа в ЮKassa
  yukassa_subscription_id TEXT,                      -- ID подписки (для автопродления)
  description     TEXT,
  metadata        JSONB DEFAULT '{}',                -- Доп. данные (тариф, период, lead_id)
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_expert ON public.payments(expert_id);
CREATE INDEX idx_payments_yukassa ON public.payments(yukassa_payment_id);
```

### 4.11. Email-подписчики

```sql
CREATE TABLE public.email_subscribers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       UUID NOT NULL REFERENCES public.profiles(id),
  email           TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(expert_id, email)
);

CREATE INDEX idx_email_subs_expert ON public.email_subscribers(expert_id);
```

### 4.12a. Подзапросы (Query Fan-Out)

```sql
CREATE TABLE public.sub_queries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  sub_query_text    TEXT NOT NULL,                     -- Текст подзапроса
  ai_response       TEXT,                              -- Ответ LLM на подзапрос
  gap_score         SMALLINT CHECK (gap_score BETWEEN 0 AND 10),
  analyzed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subqueries_parent ON public.sub_queries(parent_question_id);
CREATE INDEX idx_subqueries_gap ON public.sub_queries(gap_score DESC);
```

### 4.12b. Core Web Vitals метрики

```sql
CREATE TABLE public.cwv_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      UUID REFERENCES public.content_packages(id),
  page_url        TEXT NOT NULL,                     -- URL проверяемой страницы
  lcp_ms          REAL,                               -- Largest Contentful Paint (ms)
  fid_ms          REAL,                               -- First Input Delay (ms)
  cls_score       REAL,                               -- Cumulative Layout Shift
  fcp_ms          REAL,                               -- First Contentful Paint (ms)
  performance_score REAL,                             -- Lighthouse Performance Score (0–100)
  is_passing      BOOLEAN DEFAULT FALSE,              -- Все метрики в зелёной зоне
  checked_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cwv_content ON public.cwv_metrics(content_id);
CREATE INDEX idx_cwv_date ON public.cwv_metrics(checked_at DESC);
```

### 4.13. Очередь задач

```sql
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
  payload         JSONB NOT NULL DEFAULT '{}',       -- Входные данные задачи
  result          JSONB,                              -- Результат выполнения
  error           TEXT,                               -- Текст ошибки
  attempts        SMALLINT DEFAULT 0,
  max_attempts    SMALLINT DEFAULT 3,
  priority        SMALLINT DEFAULT 5,                -- 1=высший, 10=низший
  scheduled_at    TIMESTAMPTZ DEFAULT now(),          -- Когда запланировано выполнение
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_status ON public.jobs(status, priority, scheduled_at);
CREATE INDEX idx_jobs_type ON public.jobs(type);
```

### 4.14. Cron-расписание (pg_cron)

```sql
-- Еженедельный сбор спроса и формирование заказов (понедельник 03:00 UTC)
SELECT cron.schedule('weekly-demand', '0 3 * * 1',
  $$INSERT INTO public.jobs (type, payload) SELECT 'collect_demand', jsonb_build_object('niche_id', id) FROM public.niches WHERE is_active = TRUE$$
);

-- Еженедельный трекинг цитирования (среда 04:00 UTC)
SELECT cron.schedule('weekly-citations', '0 4 * * 3',
  $$INSERT INTO public.jobs (type, payload) SELECT 'track_citations', jsonb_build_object('expert_id', id) FROM public.profiles WHERE subscription_tier NOT IN ('free') AND is_published = TRUE$$
);

-- Ежедневная отправка sitemap (06:00 UTC)
SELECT cron.schedule('daily-sitemap', '0 6 * * *',
  $$INSERT INTO public.jobs (type, payload) VALUES ('submit_sitemap', '{}')$$
);

-- Еженедельный трекинг SERP (четверг 05:00 UTC)
SELECT cron.schedule('weekly-serp', '0 5 * * 4',
  $$INSERT INTO public.jobs (type, payload) SELECT 'track_serp', jsonb_build_object('expert_id', id) FROM public.profiles WHERE subscription_tier IN ('expert','business','enterprise') AND is_published = TRUE$$
);

-- Ежемесячный пересчёт Trust Score (1-е число, 02:00 UTC)
SELECT cron.schedule('monthly-trust', '0 2 1 * *',
  $$INSERT INTO public.jobs (type, payload) SELECT 'calculate_trust_score', jsonb_build_object('expert_id', id) FROM public.profiles WHERE is_published = TRUE$$
);

-- Ежедневная проверка Content Freshness (07:00 UTC)
-- Помечает статьи старше 90 дней как needs_refresh
SELECT cron.schedule('daily-freshness', '0 7 * * *',
  $$UPDATE public.content_packages SET refresh_status = 'needs_refresh', updated_at = now() WHERE status = 'published' AND refresh_status = 'fresh' AND (last_refreshed_at IS NULL AND published_at < now() - interval '90 days') OR (last_refreshed_at IS NOT NULL AND last_refreshed_at < now() - interval '90 days')$$
);

-- Еженедельная проверка Core Web Vitals (пятница 03:00 UTC)
SELECT cron.schedule('weekly-cwv', '0 3 * * 5',
  $$INSERT INTO public.jobs (type, payload) VALUES ('check_cwv', '{}')$$
);
```

### 4.15. ER-диаграмма (связи)

```
auth.users 1──1 profiles
profiles   N──1 niches
profiles   1──N orders
profiles   1──N voice_recordings
profiles   1──N content_packages
profiles   1──N citation_checks
profiles   1──N leads
profiles   1──N payments
profiles   1──N email_subscribers

questions  N──1 niches
questions  1──N orders
questions  1──N sub_queries

orders     N──1 profiles
orders     N──1 questions
orders     1──1 voice_recordings (optional)
orders     1──1 content_packages (optional)

voice_recordings N──1 profiles
voice_recordings 1──1 content_packages (optional)

content_packages N──1 profiles
content_packages N──1 questions (optional)
content_packages 1──N citation_checks
content_packages 1──N serp_positions
content_packages 1──N cwv_metrics
content_packages 1──N leads (optional)

sub_queries N──1 questions
```

---

## 5. API-эндпоинты

### 5.1. Next.js API Routes (`/api/...`)

Тонкие прокси — основная логика в Supabase Edge Functions и Worker.

| Метод | Маршрут | Описание | Авторизация |
|-------|---------|----------|-------------|
| POST | `/api/audit` | Запуск бесплатного/платного аудита | Public (rate limit) |
| POST | `/api/voice` | Загрузка голосового файла (Web Audio) | Auth |
| POST | `/api/content` | Запуск генерации контент-пакета | Auth |
| PATCH | `/api/content` | Обновление/редактирование контент-пакета | Auth (owner) |
| POST | `/api/publish` | Публикация статьи (approve) | Auth (owner) |
| POST | `/api/leads` | Форма «записаться к эксперту» | Public (rate limit, captcha) |
| POST | `/api/webhooks/yukassa` | Вебхук ЮKassa (платежи) | ЮKassa signature |
| POST | `/api/webhooks/telegram` | Вебхук Telegram-бота | Telegram secret |
| POST | `/api/revalidate` | ISR revalidation (вызывается после публикации) | Internal secret |

### 5.2. Supabase Edge Functions

| Функция | Триггер | Описание |
|---------|---------|----------|
| `audit-free` | HTTP (через /api/audit) | Возвращает 3 дыры по нише из кеша или real-time → CTA на Starter |
| `generate-content` | HTTP (через /api/content) | Транскрибация + генерация 5 форматов |
| `cron-scheduler` | pg_cron (ежечасно) | Проверяет pending jobs, запускает Worker |

### 5.3. Supabase Realtime

| Канал | Событие | Назначение |
|-------|---------|-----------|
| `orders:{expert_id}` | INSERT | Новый заказ → уведомление в дашборде |
| `leads:{expert_id}` | INSERT | Новая заявка → уведомление в дашборде |
| `content_packages:{id}` | UPDATE | Статус генерации контента → прогресс в UI |

### 5.4. Telegram Bot Webhook

Бот принимает вебхук на `/api/webhooks/telegram` и обрабатывает:

| Команда / Событие | Действие |
|----|---------|
| `/start` | Регистрация, привязка Telegram к профилю |
| `/start {token}` | Привязка к существующему аккаунту по токену |
| `/orders` | Показ текущих заказов с inline-кнопками |
| `/record` | Подготовка к записи голоса |
| `/status` | Мини-дашборд: подписчики, цитирования, заявки |
| Voice message | Транскрипция → генерация → отправка на review |
| Callback: `approve:{content_id}` | Публикация контент-пакета |
| Callback: `edit:{content_id}` | Переход в ЛК для редактирования |
| Callback: `accept_lead:{lead_id}` | Принять заявку |
| Callback: `reject_lead:{lead_id}` | Отклонить заявку |

---

## 6. Переменные окружения

```bash
# ===== ОБЩИЕ =====
NODE_ENV=production                       # production | development
APP_URL=https://neuroexpertise.ru         # Основной URL приложения

# ===== SUPABASE =====
NEXT_PUBLIC_SUPABASE_URL=https://supabase.neuroexpertise.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...      # Публичный anon-ключ
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Серверный ключ (только backend)
SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db:5432/postgres  # Прямое подключение к БД
SUPABASE_JWT_SECRET=your-jwt-secret

# ===== TELEGRAM =====
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...      # Токен бота (@neuroexpert_bot)
TELEGRAM_WEBHOOK_SECRET=random-secret-32  # Секрет для верификации вебхука
TELEGRAM_WEBHOOK_URL=https://neuroexpertise.ru/api/webhooks/telegram

# ===== OPENAI =====
OPENAI_API_KEY=sk-...                     # Whisper + GPT-4o-mini (bulk)
OPENAI_MODEL_BULK=gpt-4o-mini            # Модель для массового анализа

# ===== CLAUDE (PRIMARY LLM) =====
ANTHROPIC_API_KEY=sk-ant-...              # Claude API
ANTHROPIC_MODEL=claude-sonnet-4-20250514  # Модель для генерации контента

# ===== YANDEX (FALLBACK) =====
YANDEX_CLOUD_API_KEY=...                  # YandexGPT + YandexSpeechKit
YANDEX_CLOUD_FOLDER_ID=...               # ID каталога в Яндекс.Облаке

# ===== GIGACHAT (FALLBACK) =====
GIGACHAT_CLIENT_ID=...
GIGACHAT_CLIENT_SECRET=...

# ===== LLM PROVIDER SELECTION =====
LLM_PRIMARY_PROVIDER=claude              # claude | openai | yandexgpt | gigachat
LLM_FALLBACK_PROVIDER=yandexgpt          # Провайдер при ошибке primary
STT_PRIMARY_PROVIDER=whisper             # whisper | yandex_stt
STT_FALLBACK_PROVIDER=yandex_stt

# ===== ДАННЫЕ О СПРОСЕ =====
XMLRIVER_API_KEY=...                      # Wordstat через XMLRiver
XMLRIVER_USER_ID=...
SERPAPI_API_KEY=...                       # SerpAPI (Google PAA, SERP)

# ===== ОПЛАТА =====
YUKASSA_SHOP_ID=...                       # ID магазина ЮKassa
YUKASSA_SECRET_KEY=...                    # Секретный ключ ЮKassa
YUKASSA_WEBHOOK_SECRET=...               # Для верификации вебхуков

# ===== EMAIL =====
RESEND_API_KEY=re_...                     # Resend для email-рассылок
EMAIL_FROM=noreply@neuroexpertise.ru

# ===== АНАЛИТИКА =====
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=neuroexpertise.ru
PLAUSIBLE_API_KEY=...                     # Self-hosted Plausible API

# ===== CDN =====
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_API_TOKEN=...                  # Для purge cache

# ===== ИНДЕКСАЦИЯ =====
GSC_SERVICE_ACCOUNT_JSON=...              # Google Search Console (JSON, base64)
BING_WEBMASTER_API_KEY=...               # Bing Webmaster Tools API Key
YANDEX_WEBMASTER_TOKEN=...               # Яндекс.Вебмастер OAuth-токен
YANDEX_WEBMASTER_HOST_ID=...

# ===== REVALIDATION =====
REVALIDATION_SECRET=random-secret-64      # Секрет для ISR revalidation

# ===== WORKER =====
WORKER_POLL_INTERVAL_MS=5000             # Интервал опроса очереди (мс)
WORKER_CONCURRENCY=3                      # Параллельные задачи
```

---

## 7. Docker-конфигурация

### 7.1. docker-compose.yml

```yaml
version: "3.9"

services:
  # ===== WEB (Next.js) =====
  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - supabase-db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ===== TELEGRAM BOT =====
  bot:
    build:
      context: .
      dockerfile: docker/bot.Dockerfile
    env_file: .env
    depends_on:
      - supabase-db
    restart: unless-stopped

  # ===== WORKER (длительные задачи) =====
  worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    env_file: .env
    depends_on:
      - supabase-db
    restart: unless-stopped

  # ===== NGINX (reverse proxy) =====
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - web
    restart: unless-stopped

  # ===== SUPABASE (self-hosted) =====
  # Supabase self-hosted через Coolify — отдельный Docker Compose
  # Включает: PostgreSQL, GoTrue (Auth), PostgREST, Realtime, Storage, pg_meta
  # Конфигурируется через Coolify UI
  # Здесь только ссылка на внешний DB для dev-окружения:
  supabase-db:
    image: supabase/postgres:15.1.1.61
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: ${SUPABASE_DB_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - supabase-db-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  supabase-db-data:
```

### 7.2. web.Dockerfile

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter shared build
RUN pnpm --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
```

### 7.3. bot.Dockerfile

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/bot/package.json ./apps/bot/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter shared build
RUN pnpm --filter bot build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/bot/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 7.4. worker.Dockerfile

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter shared build
RUN pnpm --filter worker build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

---

## 8. Nginx-конфигурация

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=audit:10m rate=2r/m;
    limit_req_zone $binary_remote_addr zone=leads:10m rate=5r/m;

    # Upstream
    upstream web { server web:3000; }

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name neuroexpertise.ru www.neuroexpertise.ru;
        return 301 https://neuroexpertise.ru$request_uri;
    }

    # Main HTTPS server
    server {
        listen 443 ssl http2;
        server_name neuroexpertise.ru;

        ssl_certificate     /etc/letsencrypt/live/neuroexpertise.ru/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/neuroexpertise.ru/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Robots.txt — разрешаем AI-ботов
        location = /robots.txt {
            proxy_pass http://web;
            proxy_cache_valid 200 1h;
        }

        # Sitemap
        location = /sitemap.xml {
            proxy_pass http://web;
            proxy_cache_valid 200 1h;
        }

        # Static assets (Next.js)
        location /_next/static/ {
            proxy_pass http://web;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }

        # API routes — rate limiting
        location /api/audit {
            limit_req zone=audit burst=3 nodelay;
            proxy_pass http://web;
        }

        location /api/leads {
            limit_req zone=leads burst=3 nodelay;
            proxy_pass http://web;
        }

        location /api/webhooks/ {
            proxy_pass http://web;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://web;
        }

        # Expert pages — aggressive caching (ISR revalidation purges)
        location /experts/ {
            proxy_pass http://web;
            proxy_cache_valid 200 60m;
        }

        # Everything else
        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## 9. Авторизация

### 9.1. Провайдер

**Supabase Auth (GoTrue)** — self-hosted. Методы входа:

| Метод | Приоритет | Описание |
|-------|-----------|----------|
| Email + Magic Link | Primary (Web) | Без пароля, email confirmation |
| Telegram Login Widget | Primary (Bot) | Привязка через /start |
| Email + Password | Secondary | Для тех, кто предпочитает пароль |

### 9.2. Потоки

**Регистрация через Web:**
1. Пользователь вводит email на `/register`
2. Supabase Auth отправляет magic link
3. Клик → подтверждение → redirect на `/dashboard`
4. Trigger `on auth.users INSERT` → создаёт запись в `profiles`

**Привязка Telegram:**
1. Пользователь отправляет `/start` боту
2. Бот генерирует JWT-токен привязки (exp: 10 мин)
3. Бот отправляет ссылку: `neuroexpertise.ru/auth/link-telegram?token=...`
4. Или `/start {token}` — привязывает telegram_id к существующему профилю

**Авторизация через Telegram (новый пользователь):**
1. `/start` → бот создаёт аккаунт через Supabase Admin API
2. Сохраняет telegram_id, username в profiles
3. Отправляет приветствие + выбор ниши

### 9.3. Middleware (Next.js)

```typescript
// middleware.ts
// Защищённые маршруты: /dashboard/*, /api/content, /api/voice, /api/publish
// Публичные: /, /audit, /experts/*, /api/audit, /api/leads, /api/webhooks/*
```

### 9.4. RLS (Row Level Security)

```sql
-- profiles: пользователь видит/редактирует только свой профиль
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable"
  ON public.profiles FOR SELECT USING (is_published = TRUE);

-- content_packages: только владелец + публичные (published)
ALTER TABLE public.content_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can manage own content"
  ON public.content_packages FOR ALL USING (auth.uid() = expert_id);
CREATE POLICY "Published content is public"
  ON public.content_packages FOR SELECT USING (status = 'published');

-- leads: только целевой эксперт видит свои заявки
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can view own leads"
  ON public.leads FOR SELECT USING (auth.uid() = expert_id);
CREATE POLICY "Anyone can create leads"
  ON public.leads FOR INSERT WITH CHECK (TRUE);

-- orders: только целевой эксперт
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can view own orders"
  ON public.orders FOR ALL USING (auth.uid() = expert_id);

-- payments: только владелец
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can view own payments"
  ON public.payments FOR SELECT USING (auth.uid() = expert_id);
```

---

## 10. Интеграции (внешние API)

### 10.1. LLM — Абстрактный слой

```typescript
// packages/shared/src/llm/index.ts
interface LLMProvider {
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  generateJSON<T>(prompt: string, schema: ZodSchema<T>): Promise<T>;
}

interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

// Переключение: env LLM_PRIMARY_PROVIDER + LLM_FALLBACK_PROVIDER
// При ошибке primary — автоматически fallback
```

### 10.2. STT — Абстрактный слой

```typescript
// packages/shared/src/transcription/index.ts
interface STTProvider {
  transcribe(audioBuffer: Buffer, options?: STTOptions): Promise<string>;
}
// Whisper API: POST https://api.openai.com/v1/audio/transcriptions
// YandexSpeechKit: POST https://stt.api.cloud.yandex.net/speech/v1/stt:recognize
```

### 10.3. XMLRiver (Wordstat)

```
GET https://xmlriver.com/search_yandex/xml
  ?user={XMLRIVER_USER_ID}
  &key={XMLRIVER_API_KEY}
  &query={keyword}
  &type=wordstat
```

### 10.4. SerpAPI

```
GET https://serpapi.com/search
  ?api_key={SERPAPI_API_KEY}
  &engine=yandex|google
  &q={query}
```

### 10.5. ЮKassa

| Операция | Эндпоинт |
|----------|----------|
| Создание платежа | `POST /v3/payments` |
| Подписка (рекуррент) | `POST /v3/payments` с `save_payment_method: true` |
| Split-payment | `POST /v3/payments` с `transfers[]` |
| Вебхук | `POST /api/webhooks/yukassa` (наш сервер) |

### 10.6. Resend (Email)

```
POST https://api.resend.com/emails
  Authorization: Bearer {RESEND_API_KEY}
  { from, to, subject, html }
```

### 10.7. Google Search Console

OAuth2 Service Account → `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`

### 10.8. Яндекс Вебмастер

OAuth-токен → `POST https://api.webmaster.yandex.net/v4/user/{user_id}/hosts/{host_id}/recrawl/queue`

---

## 11. Деплой (CI/CD)

### 11.1. Схема

```
Developer (Cursor / Claude Code)
        ↓ git push
GitHub (main branch)
        ↓ webhook
Coolify (self-hosted PaaS)
        ↓ auto-build + deploy
Docker containers:
  ├── web     (Next.js, port 3000)
  ├── bot     (grammY, webhook mode)
  ├── worker  (Node.js, job polling)
  └── nginx   (reverse proxy, SSL)
        ↓
Cloudflare CDN (caching layer)
        ↓
neuroexpertise.ru
```

### 11.2. Процесс деплоя

1. `git push origin main`
2. GitHub webhook → Coolify
3. Coolify собирает Docker-образы (multi-stage build)
4. Coolify запускает health check
5. Blue-green deploy (zero downtime)
6. Cloudflare cache purge (при необходимости)

### 11.3. Окружения

| Окружение | URL | Branch | БД |
|-----------|-----|--------|-----|
| Production | neuroexpertise.ru | `main` | Supabase prod |
| Staging | staging.neuroexpertise.ru | `staging` | Supabase staging |
| Local | localhost:3000 | `*` | Supabase local (Docker) |

### 11.4. Миграции БД

```bash
# Локальная разработка
npx supabase db diff -f migration_name   # Генерация миграции
npx supabase db push                      # Применение к удалённой БД

# Production
# Миграции применяются через Supabase CLI при деплое
npx supabase db push --db-url $SUPABASE_DB_URL
```

---

## 12. Полный скоуп MVP (все модули, без ограничений)

MVP включает **все 5 модулей** и **всю функциональность**, описанную в разделах 1–11 этого документа. Никаких отложенных фич — всё реализуется сразу.

### 12.1. Модуль 1 — AI Gap Finder

- Лендинг (`neuroexpertise.ru`) с выбором ниши
- Бесплатный аудит: 3 дыры с цифрами (частотность, текущий ответ AI, gap_score) → CTA на Starter
- Сбор спроса: Wordstat API (XMLRiver) + SerpAPI (Google PAA) + Яндекс Кью
- LLM-фильтрация вопросов (50 из 500)
- **Query Fan-Out:** каждый вопрос разбивается на 3–5 подзапросов через LLM перед оценкой (таблица `sub_queries`). Контент, покрывающий подзапросы, с большей вероятностью будет выбран LLM при синтезе ответа
- Прогон через ChatGPT/Perplexity/YandexGPT API — оценка дыр по объективным маркерам
- Формирование еженедельных «заказов» (10 лучших вопросов на эксперта), в карточке заказа показываются подзапросы: «Люди также спрашивают: ...»
- AI Visibility Scanner — вирусный лидмагнит: ввод имени/бренда → отчёт о цитировании
- 20 ниш в seed-данных, 5 фокусных ниш, произвольный ввод ниши с LLM-классификацией

### 12.2. Модуль 2 — Expert Voice Engine

- Telegram-бот (grammY): `/start`, `/orders`, `/record`, `/status`, голосовые сообщения
- Web Audio запись голоса в браузере (Web Audio API)
- Транскрипция: Whisper API (primary) + YandexSpeechKit (fallback)
- **AI-ассистент задаёт уточняющие вопросы** для глубины ответа: «Можете привести пример из практики?», «Какие исключения бывают?», «Есть ли конкретные цифры или сроки?»
- Генерация **всех 5 форматов** через абстрактный LLM-слой:
  1. Пост для Telegram (1000–2000 символов)
  2. **SEO-статья (18 000–22 000 символов / 2 900–3 500 слов, AIO-оптимизация):**
     - TL;DR блок (40–60 слов) — прямой ответ в начале статьи (для Featured Snippet)
     - 6–10 самодостаточных H2/H3 разделов по 120–180 слов каждый (Passage Ranking)
     - Минимум 1 таблица и 1 нумерованный список (для Table/List Featured Snippets)
     - Прямые цитаты эксперта (выделены и атрибутированы)
     - 2–3 ссылки на авторитетные внешние источники
     - FAQ интегрирован в тело статьи (не только в JSON-LD)
  3. Карточки (5 тезисов по 200 символов)
  4. Скрипт для Reels/Shorts (60 секунд)
  5. FAQ-блок (3–5 вопросов для Schema.org FAQPage)
- **Валидация структуры после генерации** (Worker: `validate_content`): проверка word_count ≥ 2900, наличие TL;DR, таблицы, passage_count ≥ 6. Если не проходит — автоматическая доработка через LLM
- Сохранение авторского стиля, прямые цитаты, режим минимальной обработки
- Абстрактный LLM-слой: Claude (primary) → YandexGPT/GigaChat (fallback), переключение за 1 строку
- Абстрактный STT-слой: Whisper (primary) → YandexSpeechKit (fallback)

### 12.3. Модуль 3 — AI Publishing Network

- Персональные SSR/SSG-страницы: `neuroexpertise.ru/experts/{slug}/{articleSlug}`
- **TL;DR блок** вверху каждой статьи — визуально выделенный, для Featured Snippet (Definition Box)
- **Дата публикации + дата обновления** — видимые на каждой странице
- **Расширенный блок «Об авторе» (E-E-A-T):** фото, квалификация, стаж, Expert Trust Score, число публикаций, alumniOf, worksFor — редактируемые поля в ЛК эксперта (раздел «Профиль»)
- **Внешние авторитетные источники на странице:** каждая статья содержит 2–3 ссылки на научные статьи, законы, стандарты (генерируются LLM из промпта, валидируются экспертом). Отображаются как визуальный блок «Источники» внизу статьи
- Schema.org JSON-LD разметка — **расширенная (до 5 типов на страницу):**
  - Article (основная статья)
  - FAQPage (FAQ-блок)
  - Person (эксперт: имя, квалификация, фото, alumniOf, worksFor, knowsAbout)
  - BreadcrumbList (навигационная цепочка: Главная > Эксперты > Имя > Статья)
  - HowTo (автодетекция: если статья содержит пошаговую инструкцию)
- robots.txt: GPTBot, ClaudeBot, PerplexityBot, YandexBot — разрешены
- Автоматический sitemap.xml с отправкой в **GSC + Яндекс.Вебмастер + Bing Webmaster Tools** API
- Мета-теги: title, description, canonical, Open Graph — автогенерация
- Внутренняя перелинковка между страницами эксперта + между экспертами одной ниши
- **Инлайн-рендеринг таблиц из markdown** — для Table Featured Snippets
- Аудиоплеер на каждой странице (оригинальный голос эксперта)
- Кросспост на Дзен/vc.ru/Хабр (адаптированные версии с canonical)
- **Стратегия внешних упоминаний (Social Proof для AI-цитирования):**
  - Яндекс Кью как канал размещения: шаблон экспертного ответа со ссылкой на полную статью на neuroexpertise.ru
  - Размещение профилей экспертов на отзовиках (Otzovik, iRecommend, Profi.ru, Zoon) — повышает шансы цитирования в 3 раза (данные SE Ranking)
  - При кросспосте — обязательная ссылка на профиль эксперта на neuroexpertise.ru (формирование бэклинк-профиля домена)
  - Worker-задача `crosspost_social`: адаптация контента под каждую площадку (Кью, Дзен, vc.ru, тематические Telegram-чаты)
- **Усиление бэклинков (поведенческие факторы в первые 3 дня после публикации):**
  - При публикации статьи — автоматическое предложение эксперту в Telegram: «Поделитесь в 3 чатах для вашей аудитории? [Да, поделиться]»
  - Авто-шеринг в тематические Telegram-чаты эксперта (список чатов по нишам, курируется)
  - Шеринг в соцсети эксперта (подготовленный пост для Telegram-канала, VK, Одноклассники)
  - Цель: создать поведенческие факторы (трафик + user engagement) в первые 72 часа после индексации — это критический период для ранжирования
- **Core Web Vitals контроль:** FCP < 0.4 сек (целевой), LCP ≤ 2.5 сек. Еженедельная проверка через PageSpeed Insights API
- **Изображения:** автоконвертация в WebP/AVIF, максимум 150 KB (Worker: `optimize_images`)
- SSR без JS-зависимости: контент читаем без JavaScript рендера
- Cloudflare CDN кеширование, < 1 сек загрузка
- **Кнопка «Записаться к эксперту»** на каждой странице → форма → Telegram-уведомление
- Email-захват: «Хотите получать ответы [имя]? Введите email» + автоматическая рассылка (Resend)
- Блок «похожие вопросы» на каждой странице

### 12.4. Модуль 4 — AI Citation Tracker

- Еженедельный прогон через ChatGPT/Perplexity/YandexGPT API — поиск цитирования (имя, URL, cosine similarity > 0.7)
- Мониторинг позиций в Яндексе/Google через SerpAPI
- Трекинг реферального трафика: Plausible (self-hosted) + Яндекс.Метрика (utm_source=fact)
- Expert Trust Score — агрегированная публичная метрика (цитирования × частота × охват)
- **Share of Voice** — процент ответов, где упоминается эксперт vs конкуренты по тем же запросам
- Дашборд эксперта: AI-рейтинг, трафик, топ-5 страниц, цитирования по платформам, динамика, рекомендации
- **Core Web Vitals дашборд:** LCP, FCP, CLS по каждой странице, алерты при ухудшении
- Конкурентный анализ: «По запросу X цитируется Мария Петрова — ваш ответ глубже»
- **Content Freshness алерты:** уведомление в Telegram, когда статья старше 90 дней: «Ваша статья о [тема] опубликована 3 месяца назад. Хотите обновить?»
- **Визуализация источников:** какие конкретные домены LLM цитируют по запросам вашей ниши (что цитируют конкуренты)
- AI Visibility Analytics для B2B: «ваш бренд упомянут 14 раз, конкурент — 92»

### 12.5. Модуль 5 — Expert Marketplace

- Каталог экспертов с фильтрами: ниша, город, Expert Trust Score, цена, отзывы
- Expert Trust Score = ранжирование в каталоге
- Онлайн-запись через встроенный календарь или интеграция с Yclients
- Оплата консультаций через платформу: ЮKassa split-payment (комиссия скользящая: Free 15%, Starter 7%, Pro 3%, Expert 0%)
- Отзывы клиентов
- Реферальная программа: эксперт приглашает коллегу → оба получают месяц Pro

### 12.6. Монетизация

#### Тарифы для экспертов

**Free (0₽/мес, комиссия 15% с каждого клиента)**
> «Попробуйте без вложений. Платите только когда зарабатываете.»

Что входит:
- Каждую неделю система подбирает 3 вопроса, которые задают тысячи людей в вашей теме — и на которые нейросети пока плохо отвечают
- Вы наговариваете ответ голосом (3–10 минут) — система превращает его в полноценную экспертную статью + пост для Telegram + карточки для соцсетей + скрипт для видео + блок «вопрос-ответ»
- Публикуйте без ограничений — каждая страница работает с кнопкой «Записаться к вам»
- Когда клиент записывается и оплачивает консультацию через платформу — вы получаете 85%, платформа 15%
- Вы ничего не платите вперёд. Платформа зарабатывает только когда зарабатываете вы

**Starter (1 490₽/мес, комиссия 7%)**
> «Больше тем — больше клиентов. Комиссия ниже.»

Всё из Free, плюс:
- 10 подобранных вопросов в неделю вместо 3 — в 3 раза больше тем для контента
- Публикации без ограничений — как и в Free
- Комиссия с клиентов снижена до 7% (вы получаете 93% вместо 85%)

**Pro (2 990₽/мес, комиссия 3%)**
> «Ваши статьи видят везде. Система продвигает вас сама.»

Всё из Starter, плюс:
- Вопросов без ограничений — система подбирает столько, сколько есть в вашей теме
- Ваши статьи автоматически размещаются на популярных площадках (Дзен, Хабр, Яндекс Кью, тематические форумы) — со ссылкой на вашу страницу
- После каждой публикации система помогает распространить статью: готовый пост для ваших соцсетей и тематических чатов — чтобы статью увидели как можно быстрее
- Напоминания об обновлении статей каждые 3 месяца — свежий контент находят чаще
- Комиссия с клиентов всего 3% (вы получаете 97%)

**Expert (4 990₽/мес, комиссия 0%)**
> «Вы видите всю картину. Все деньги от клиентов — ваши.»

Всё из Pro, плюс:
- Вы видите, цитируют ли вас нейросети (ChatGPT, Perplexity, YandexGPT) — и по каким запросам
- Показываем, какой процент ответов в вашей теме — ваш, а какой — у конкурентов
- Отчёт: какие сайты нейросети используют как источники — вы видите, с кем конкурируете
- Контроль скорости загрузки ваших страниц (медленные страницы хуже находят)
- Публичный рейтинг вашей экспертности — виден клиентам и повышает доверие к вам
- Подсказки: «По запросу X сейчас отвечает Мария Петрова — у вас есть шанс занять эту позицию»
- **Комиссия 0% — все деньги от клиентов ваши**

#### Сравнительная таблица тарифов

| | **Free** | **Starter** | **Pro** | **Expert** |
|---|---|---|---|---|
| **Цена** | 0₽ | 1 490₽/мес | 2 990₽/мес | 4 990₽/мес |
| **Комиссия с клиентов** | 15% (вы получаете 85%) | 7% (вы получаете 93%) | 3% (вы получаете 97%) | 0% (вы получаете 100%) |
| **Ниш** | 1 | 2 | 3 | 5 |
| **Подобранных вопросов в неделю** | 3 | 10 | без ограничений | без ограничений |
| **Публикации** | без ограничений | без ограничений | без ограничений | без ограничений |
| **5 форматов контента** | да | да | да | да |
| **Кнопка «Записаться» на каждой странице** | да | да | да | да |
| **Размещение на Дзен, Хабр, Кью, отзовиках** | — | — | да | да |
| **Помощь с распространением в первые 3 дня** | — | — | да | да |
| **Напоминания об обновлении каждые 3 месяца** | — | — | да | да |
| **Видите, цитируют ли вас нейросети** | — | — | — | да |
| **Ваш % ответов vs конкуренты** | — | — | — | да |
| **Какие сайты используют нейросети в вашей теме** | — | — | — | да |
| **Рейтинг экспертности** | — | — | — | да |
| **Подсказки по конкурентам** | — | — | — | да |

#### Тарифы B2B

- **Бизнес (24 990₽/мес):** до 10 ниш, до 5 экспертов компании, AI Visibility Scanner, единый дашборд
- **Enterprise (99 990₽/мес):** безлимит экспертов, white-label, выделенный менеджер, API

#### Как устроена комиссия

Клиент записывается через кнопку «Записаться» на странице эксперта → оплачивает консультацию через платформу (ЮKassa split-payment) → деньги автоматически распределяются: эксперту — его доля, платформе — комиссия. Эксперт видит все заявки и платежи в личном кабинете.

Чем выше тариф — тем меньше комиссия. На тарифе Expert комиссии нет совсем.

### 12.7. Веб-интерфейс (полный ЛК)

- Дашборд с метриками (AI-рейтинг, трафик, цитирования, заявки)
- Управление заказами (принять/отклонить)
- Просмотр и редактирование контент-пакетов
- Аналитика (AI Citation Tracker дашборд)
- Управление заявками (лиды)
- Профиль эксперта + настройки:
  - Основные данные (имя, фото, bio, город, квалификация)
  - **E-E-A-T поля:** образование (alumni_of), место работы (works_for), области экспертизы (knows_about), стаж (years_experience) — используются в Schema.org Person и блоке «Об авторе»
  - Настройки записи (цена, ссылка на Yclients)
- Биллинг (подписка, платежи, история)

### 12.8. Технические требования (без компромиссов)

- Абстрактный LLM-слой с fallback на российские провайдеры (YandexGPT, GigaChat) — с первого дня
- Абстрактный STT-слой с fallback — с первого дня
- Полный CI/CD: GitHub → Coolify auto-deploy (push → деплой за 60 сек)
- Staging-окружение: `staging.neuroexpertise.ru`
- Supabase self-hosted на Coolify с pg_cron
- Node.js Worker для длительных задач (Playwright, массовый прогон)
- Plausible + PostHog (self-hosted) аналитика
- Все 20 ниш с автоматическим сбором семантики

### 12.9. GO-критерии запуска

| Критерий | Порог |
|----------|-------|
| Все 5 модулей функциональны | 100% |
| Бесплатный аудит работает для 20 ниш | ✓ |
| Голос → 5 форматов контента (end-to-end) | ✓ |
| SEO-статья ≥ 2900 слов с TL;DR и таблицей | ✓ |
| SSR-страницы с Schema.org (5 типов) индексируются | ✓ |
| Кнопка «записаться» → уведомление в Telegram | ✓ |
| Трекинг цитирования (хотя бы 1 прогон) | ✓ |
| ЮKassa: подписки + split-payment | ✓ |
| Каталог экспертов доступен публично | ✓ |
| LLM fallback переключается при ошибке | ✓ |
| Core Web Vitals: FCP < 0.4 сек на публичных страницах | ✓ |
| Sitemap отправляется в GSC + Яндекс + Bing | ✓ |
| Контент проходит валидацию структуры (validate_content) | ✓ |

---

> **Этот документ — единственный источник правды для архитектуры проекта.**
> При изменениях обновлять этот файл первым.
