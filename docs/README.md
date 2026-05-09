# НейроЭксперт

**Система привлечения клиентов из поиска, карт, Авито, отзывов и нейросетей.**

Платформа больше не позиционируется как “AIO для экспертов”. Коммерческий фокус — **Business / Local Sales OS**: аудит видимости локального бизнеса, гео-рейтинг, ежедневные задачи роста, отзывы, потерянные лиды и запуск канала заявок под ключ. Экспертный Solo-слой остаётся как массовый продукт: голос эксперта превращается в страницы, которые привлекают клиентов из поиска и нейросетей.

Три направления:

- **Business / Local Sales OS** — основной денежный слой: аудит, запуск за 30 дней, сопровождение 39 000-99 000 ₽/мес.
- **Solo / НейроЭксперт** — индивидуальные эксперты: спрос -> голос -> страница -> запись.
- **Agencies / Demand API** — данные и API для SEO/GEO-аудитов, агентских кабинетов и white-label сценариев.

Полный B2B-цикл: проверяет Яндекс Карты, 2ГИС, Авито, VK, сайт, Telegram, отзывы, формы и телефонию → сравнивает бизнес с конкурентами по локальным запросам → выдаёт ежедневные задачи для роста заявок → помогает собирать отзывы и возвращать потерянные лиды → публикует страницы, карточки и материалы под реальные вопросы → отслеживает индексацию, трафик, клики, заявки и AI-упоминания.

**Домен:** [neuroexpertise.ru](https://neuroexpertise.ru)

---

## Быстрый старт

### Локальная разработка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/your-org/neuroexpert.git
cd neuroexpert

# 2. Скопировать переменные окружения
cp .env.example .env
# Заполнить обязательные переменные (см. раздел «Переменные окружения»)

# 3. Установить зависимости
pnpm install

# 4. Запустить БД (Supabase local)
docker-compose up supabase-db -d

# 5. Применить миграции
npx supabase db push --db-url $SUPABASE_DB_URL

# 6. Запустить web-приложение
pnpm --filter web dev          # → http://localhost:3000

# 7. Запустить бот и воркер (в отдельных терминалах)
pnpm --filter bot dev
pnpm --filter worker dev
```

### Docker (полный запуск)

```bash
# Собрать и запустить все сервисы
docker-compose up --build

# Проверить health
curl http://localhost:3000/api/health   # → 200 OK
```

Сервисы после запуска:

| Сервис | Порт | Описание |
|--------|------|----------|
| `web` | 3000 | Next.js (фронтенд + SSR + API) |
| `bot` | — | Telegram-бот (webhook) |
| `worker` | — | Node.js воркер (фоновые задачи) |
| `nginx` | 80/443 | Reverse proxy + SSL |
| `supabase-db` | 5432 | PostgreSQL 15 |

---

## Стек

| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| Frontend + SSR/SSG | Next.js 14+ (App Router) + Tailwind CSS | Лендинг, ЛК, публичные страницы, SEO/AIO |
| Backend / БД | Supabase (self-hosted) | PostgreSQL 15+, Auth, Edge Functions, Realtime, Storage |
| Telegram-бот | grammY 1.x | Основной интерфейс для экспертов |
| Транскрипция | Whisper API → YandexSpeechKit (fallback) | Голос → текст |
| LLM | Claude API → YandexGPT / GigaChat (fallback) | Генерация контента, анализ дыр |
| Оплата | ЮKassa SDK | Подписки, split-payment (скользящая комиссия Free 15% → Expert 0%) |
| Аналитика | Plausible + PostHog (self-hosted) | Без cookie, 152-ФЗ |
| Хостинг | Coolify (self-hosted PaaS) | Docker-контейнеры на собственных серверах |
| CDN | Cloudflare | Кеширование статических страниц |
| CI/CD | GitHub → Coolify auto-deploy | Push → деплой за 60 сек |
| Данные о спросе | XMLRiver (Wordstat) + SerpAPI | Частотность запросов + SERP |
| Email | Resend | Транзакционные рассылки |
| Monorepo | Turborepo + pnpm workspaces | Единая сборка |

---

## Структура проекта

```
neuroexpert/
├── apps/
│   ├── web/                          # Next.js (frontend + SSR/SSG + API routes)
│   │   ├── app/
│   │   │   ├── (marketing)/          # Публичные: лендинг, аудит, pricing, scan
│   │   │   ├── (auth)/               # Login, register, callback
│   │   │   ├── (dashboard)/          # ЛК эксперта (защищённая зона)
│   │   │   │   ├── dashboard/        #   Метрики, AI-рейтинг
│   │   │   │   ├── orders/           #   Заказы (дыры)
│   │   │   │   ├── content/          #   Контент-пакеты
│   │   │   │   ├── analytics/        #   AI Citation Tracker
│   │   │   │   ├── leads/            #   Заявки «записаться»
│   │   │   │   ├── profile/          #   Профиль + настройки + E-E-A-T поля (образование, место работы, стаж)
│   │   │   │   └── billing/          #   Подписка, платежи
│   │   │   ├── experts/              # Публичные SSG-страницы экспертов
│   │   │   │   ├── page.tsx          #   Каталог (маркетплейс)
│   │   │   │   └── [slug]/[article]/ #   Экспертная статья + Schema.org (5 типов: Article, FAQPage, Person, BreadcrumbList, HowTo)
│   │   │   └── api/                  # API routes (тонкие прокси)
│   │   │       └── webhooks/         #   ЮKassa, Telegram
│   │   ├── components/               # UI, marketing, dashboard, forms
│   │   ├── lib/supabase/             # Browser, server, admin clients
│   │   └── middleware.ts             # Auth guard
│   │
│   ├── bot/                          # Telegram-бот (grammY)
│   │   └── src/
│   │       ├── commands/             # /start, /orders, /record, /status
│   │       ├── handlers/             # voice, callback, leads
│   │       └── services/             # transcription, content-gen
│   │
│   └── worker/                       # Node.js воркер (фоновые задачи)
│       └── src/
│           ├── jobs/                 # collect-demand, find-gaps, generate-orders, expand-query,
│           │                         # generate-content, validate-content,
│           │                         # track-citations, track-serp, submit-sitemap,
│           │                         # crosspost, crosspost-social, refresh-content,
│           │                         # check-cwv, optimize-images, send-email-digest
│           ├── services/             # wordstat, serpapi, ai-prober, gsc, bing-webmaster, pagespeed
│           └── queue.ts              # Polling таблицы jobs
│
├── packages/
│   ├── shared/                       # Общий код
│   │   └── src/
│   │       ├── types/                # database.ts, content.ts
│   │       ├── llm/                  # Абстрактный LLM-слой (Claude, OpenAI, YandexGPT, GigaChat)
│   │       ├── transcription/        # Абстрактный STT-слой (Whisper, YandexSpeechKit)
│   │       ├── prompts/              # gap-analysis, content-gen (TL;DR + Passage Ranking), filter, query-fanout
│   │       ├── content-structure.ts  # Шаблон AIO-структуры статьи (ARTICLE_STRUCTURE_TEMPLATE)
│   │       └── constants.ts          # Ниши, тарифы, статусы, AIO-параметры
│   │
│   └── supabase/                     # Supabase конфигурация
│       ├── migrations/               # 001_initial_schema.sql ... 005+
│       ├── functions/                # Edge Functions (audit, content, cron)
│       └── seed.sql                  # 20 ниш + ключевые слова
│
├── docker/
│   ├── docker-compose.yml
│   ├── web.Dockerfile                # Multi-stage: deps → build → runner
│   ├── bot.Dockerfile
│   ├── worker.Dockerfile
│   └── nginx/nginx.conf
│
├── scripts/                          # seed-niches, generate-types, validate-aeo, deploy
├── .env.example
├── turbo.json                        # Turborepo
├── pnpm-workspace.yaml
└── package.json
```

---

## Деплой

### Схема

```
git push origin main
       ↓
GitHub webhook → Coolify (self-hosted PaaS)
       ↓
Docker build (multi-stage) → health check → blue-green deploy
       ↓
Cloudflare CDN → neuroexpertise.ru
```

### Окружения

| Окружение | URL | Branch | БД |
|-----------|-----|--------|-----|
| Production | `neuroexpertise.ru` | `main` | Supabase prod |
| Staging | `staging.neuroexpertise.ru` | `staging` | Supabase staging |
| Local | `localhost:3000` | `*` | Supabase local (Docker) |

### Команды

```bash
# Сборка всего monorepo
pnpm build

# Сборка отдельного приложения
pnpm --filter web build
pnpm --filter bot build
pnpm --filter worker build
pnpm --filter shared build

# Линтинг
pnpm lint

# Миграции
npx supabase db diff -f migration_name   # Генерация
npx supabase db push                      # Применение к удалённой БД
npx supabase db push --db-url $SUPABASE_DB_URL  # Production

# Docker
docker-compose build                      # Собрать все образы
docker-compose up -d                      # Запустить фоном
docker-compose logs -f web                # Логи web-сервиса
```

---

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните. Ниже — группы переменных:

### Обязательные (P0)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://supabase.neuroexpertise.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db:5432/postgres
SUPABASE_JWT_SECRET=your-jwt-secret

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=random-secret-32
TELEGRAM_WEBHOOK_URL=https://neuroexpertise.ru/api/webhooks/telegram

# LLM (primary)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# LLM (bulk/анализ дыр)
OPENAI_API_KEY=sk-...
OPENAI_MODEL_BULK=gpt-4o-mini

# STT / LLM выбор провайдера
LLM_PRIMARY_PROVIDER=claude           # claude | openai | yandexgpt | gigachat
LLM_FALLBACK_PROVIDER=yandexgpt
STT_PRIMARY_PROVIDER=whisper          # whisper | yandex_stt
STT_FALLBACK_PROVIDER=yandex_stt

# Данные о спросе
XMLRIVER_API_KEY=...
XMLRIVER_USER_ID=...
SERPAPI_API_KEY=...

# Оплата
YUKASSA_SHOP_ID=...
YUKASSA_SECRET_KEY=...
YUKASSA_WEBHOOK_SECRET=...

# Приложение
NODE_ENV=production
APP_URL=https://neuroexpertise.ru
REVALIDATION_SECRET=random-secret-64
```

### Fallback-провайдеры (P0 — для санкционной устойчивости)

```bash
YANDEX_CLOUD_API_KEY=...
YANDEX_CLOUD_FOLDER_ID=...
GIGACHAT_CLIENT_ID=...
GIGACHAT_CLIENT_SECRET=...
```

### Дополнительные (P1)

```bash
# Email
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@neuroexpertise.ru

# Аналитика
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=neuroexpertise.ru
PLAUSIBLE_API_KEY=...

# CDN
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_API_TOKEN=...

# Индексация
GSC_SERVICE_ACCOUNT_JSON=...          # base64-encoded
BING_WEBMASTER_API_KEY=...            # Bing Webmaster Tools
YANDEX_WEBMASTER_TOKEN=...
YANDEX_WEBMASTER_HOST_ID=...

# Worker
WORKER_POLL_INTERVAL_MS=5000
WORKER_CONCURRENCY=3
```

---

## Авторизация

### Механизм

Аутентификация — через **Supabase Auth** (email magic link). При создании `auth.users` автоматически создаётся запись в `public.profiles` (SQL trigger).

### Маршруты

| Тип | Маршруты | Доступ |
|-----|----------|--------|
| Публичные | `/`, `/audit`, `/experts/*`, `/pricing`, `/scan/*`, `/api/leads`, `/api/webhooks/*` | Все |
| Авторизация | `/login`, `/register`, `/auth/callback` | Неаутентифицированные |
| Защищённые | `/dashboard/*` | Только аутентифицированные |

### Middleware

`apps/web/middleware.ts` проверяет сессию Supabase на всех `/dashboard/*` маршрутах. Неаутентифицированные перенаправляются на `/login`.

### Row Level Security (RLS)

RLS включён на всех пользовательских таблицах:

| Таблица | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| `profiles` | Свой + опубликованные (`is_published`) | Trigger | Только свой | — |
| `content_packages` | Свои + `status = 'published'` | Владелец | Владелец | Владелец |
| `orders` | Только свои | Система | Владелец | — |
| `leads` | Эксперт видит свои | Любой (форма «записаться») | Эксперт | — |
| `payments` | Только свои | Система | — | — |

Серверные операции (Worker, Edge Functions) используют `SUPABASE_SERVICE_ROLE_KEY`, который обходит RLS.

---

## Документация

| Документ | Описание |
|----------|----------|
| [`PROJECT_ARCHITECTURE.md`](./PROJECT_ARCHITECTURE.md) | **Главный контекстный файл.** Стек, структура, схема БД, Docker, деплой, API, env |
| [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) | Пошаговый план реализации (12 шагов, 62–78 часов) |
| [`PRD.md`](./PRD.md) | Product Requirements Document: user flows, функциональные/нефункциональные требования, приоритеты, kill criteria |
| [`НейроЭксперт_Единый.md`](./НейроЭксперт_Единый.md) | Стратегический документ (19 частей): бизнес-модель, конкуренты, маркетинг, риски, бюджет |

### Приоритет документов

1. `PROJECT_ARCHITECTURE.md` — единственный источник правды по архитектуре
2. `IMPLEMENTATION_PLAN.md` — порядок реализации для AI-агента
3. `PRD.md` — продуктовые требования и приоритеты
4. `НейроЭксперт_Единый.md` — стратегический контекст

---

## Лицензия

Проприетарная. Все права защищены. Конфиденциально.

© 2026 НейроЭксперт · neuroexpertise.ru
