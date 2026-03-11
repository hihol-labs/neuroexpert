# IMPLEMENTATION_PLAN.md — НейроЭксперт

> Пошаговый план реализации для AI-агента (Cursor / Claude Code)
> Версия: 1.1 · Март 2026 (обновлён на основе AIO-анализа)

---

## ОБЩИЕ ПРАВИЛА ДЛЯ АГЕНТА

### Контекст проекта
- Перед началом каждого шага прочитай `PROJECT_ARCHITECTURE.md` — это единственный источник правды по архитектуре.
- Перед началом каждого шага прочитай `НейроЭксперт_Единый.md` — это бизнес-логика и продуктовые требования.
- Не выдумывай структуру — используй дерево каталогов из раздела 3 `PROJECT_ARCHITECTURE.md`.

### Стек и инструменты
- **Monorepo:** Turborepo + pnpm workspaces. Root `turbo.json` и `pnpm-workspace.yaml`.
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS. SSR/SSG для публичных страниц.
- **Backend:** Supabase self-hosted (PostgreSQL 15+, Auth, Edge Functions, Realtime, Storage). Не создавай отдельный Express/Fastify-бэкенд.
- **Telegram-бот:** grammY 1.x, webhook mode через `/api/webhooks/telegram`.
- **Worker:** Node.js 20 LTS, polling таблицы `jobs` из Supabase.
- **LLM:** абстрактный слой в `packages/shared/src/llm/`. Primary: Claude. Fallback: YandexGPT/GigaChat.
- **STT:** абстрактный слой в `packages/shared/src/transcription/`. Primary: Whisper. Fallback: YandexSpeechKit.
- **Оплата:** ЮKassa SDK. Подписки + разовые платежи + split-payment.
- **Docker:** docker-compose с сервисами `web`, `bot`, `worker`, `nginx`. Dockerfiles — multi-stage build.
- **Деплой:** Coolify auto-deploy из GitHub (push → build → deploy).

### Правила кода
- TypeScript строгий режим (`"strict": true`) во всех `tsconfig.json`.
- Общие типы, LLM-слой, STT-слой, промпты, константы — в `packages/shared/`.
- Переменные окружения — по списку из раздела 6 `PROJECT_ARCHITECTURE.md`. Для каждого шага используй только те, которые нужны.
- `.env.example` обновляется при добавлении новых переменных.
- Не устанавливай лишних зависимостей. Если пакет уже есть в стеке (Supabase, grammY, docx-js и т.д.) — используй его.
- SQL-миграции — файлы в `packages/supabase/migrations/` с порядковой нумерацией (`001_`, `002_`, ...).
- RLS (Row Level Security) обязателен на всех пользовательских таблицах. Политики — по разделу 9.4 `PROJECT_ARCHITECTURE.md`.
- При создании API-роутов в Next.js — тонкие прокси. Основная логика — в Edge Functions или Worker.

### Правила проверки
- После каждого шага проект должен собираться (`pnpm build`) и запускаться (`pnpm dev`).
- Если шаг включает миграцию БД — миграция применяется без ошибок.
- Если шаг включает API — эндпоинт отвечает корректно (можно проверить curl).
- Если шаг включает UI — страница рендерится без ошибок в браузере.

### Порядок работы внутри шага
1. Прочитай задачу и результат шага целиком.
2. Создай/обнови необходимые файлы.
3. Установи зависимости (`pnpm install`).
4. Примени миграции (если есть).
5. Проверь сборку (`pnpm build`).
6. Проверь результат вручную или curl.
7. Закоммить с сообщением `step-N: краткое описание`.

---

## ШАГ 1: ИНИЦИАЛИЗАЦИЯ MONOREPO И ИНФРАСТРУКТУРА

**Цель:** пустой, но полностью настроенный monorepo с Turborepo, тремя приложениями (web, bot, worker), пакетом shared, конфигами Docker, рабочим `pnpm dev` для web (пустая Next.js-страница).

**Задача для агента:**

```
Инициализируй monorepo для проекта НейроЭксперт.

Структура (из PROJECT_ARCHITECTURE.md, раздел 3):
- apps/web/ — Next.js 14+ (App Router) + Tailwind CSS
- apps/bot/ — Telegram-бот (grammY), пока index.ts с console.log("Bot ready")
- apps/worker/ — Node.js worker, пока index.ts с console.log("Worker ready")
- packages/shared/ — общий код (пустые src/types/index.ts, src/llm/index.ts, src/transcription/index.ts, src/constants.ts)
- packages/supabase/ — папка migrations/, functions/, config.toml, seed.sql (пустые)
- docker/ — docker-compose.yml, web.Dockerfile, bot.Dockerfile, worker.Dockerfile, nginx/nginx.conf

Конфигурация:
- Root: turbo.json, pnpm-workspace.yaml, package.json, .gitignore, .env.example
- TypeScript strict mode во всех tsconfig.json
- apps/web: next.config.js с output: "standalone", tailwind.config.ts
- apps/bot и apps/worker: tsconfig с target ES2022, module NodeNext, outDir dist/

Содержимое .env.example — по разделу 6 PROJECT_ARCHITECTURE.md (все переменные с комментариями, значения пустые).

Docker:
- docker-compose.yml, Dockerfiles — по разделам 7.1–7.4 PROJECT_ARCHITECTURE.md.
- nginx.conf — по разделу 8 PROJECT_ARCHITECTURE.md.

apps/web должен запускаться: Next.js показывает пустую страницу на localhost:3000.
```

**Результат:**
- `pnpm install` без ошибок
- `pnpm --filter web dev` запускает Next.js на localhost:3000
- `pnpm --filter shared build` компилирует без ошибок
- `.env.example` содержит все переменные из раздела 6
- `docker-compose.yml` и Dockerfiles присутствуют
- Git-репозиторий инициализирован, первый коммит сделан

---

## ШАГ 2: БАЗА ДАННЫХ — СХЕМА, МИГРАЦИИ, RLS

**Цель:** полная схема БД в Supabase (все 15 таблиц, включая sub_queries и cwv_metrics), миграции, RLS-политики, pg_cron расписание (включая Content Freshness и CWV проверки), seed-данные (20 ниш).

**Задача для агента:**

```
Создай схему базы данных для НейроЭксперт в Supabase.

Миграции в packages/supabase/migrations/:

001_initial_schema.sql:
  Создай ВСЕ таблицы из раздела 4 PROJECT_ARCHITECTURE.md:
  - profiles (4.1) — расширение auth.users
  - niches (4.2)
  - questions (4.3)
  - orders (4.4)
  - voice_recordings (4.5)
  - content_packages (4.6)
  - citation_checks (4.7)
  - serp_positions (4.8)
  - leads (4.9)
  - payments (4.10)
  - email_subscribers (4.11)
  - jobs (4.12)
  Все с UUID PK, индексами, CHECK-ограничениями — в точности по описанию.

002_rls_policies.sql:
  RLS-политики по разделу 9.4 PROJECT_ARCHITECTURE.md:
  - profiles: пользователь видит/редактирует свой + публичные видны всем
  - content_packages: владелец управляет + published видны всем
  - leads: эксперт видит свои + anyone может создать
  - orders: только владелец
  - payments: только владелец

003_cron_schedules.sql:
  pg_cron расписание по разделу 4.13:
  - weekly-demand (понедельник 03:00 UTC)
  - weekly-citations (среда 04:00 UTC)
  - daily-sitemap (06:00 UTC)
  - weekly-serp (четверг 05:00 UTC)
  - monthly-trust (1-е число 02:00 UTC)

004_seed_niches.sql (или используй packages/supabase/seed.sql):
  20 ниш из раздела 3.7 НейроЭксперт_Единый.md.
  5 фокусных (is_focus = true): Психология, Юриспруденция, Нутрициология, Финансы, Бизнес-консалтинг.
  Для каждой ниши: name, slug, icon (emoji), seed_keywords (5-10 ключевых слов на русском).

Также создай packages/shared/src/types/database.ts:
  TypeScript-типы для всех таблиц (Database, Tables, Enums).
  Используй формат Supabase: Database['public']['Tables']['profiles']['Row'] и т.д.

Также обнови packages/shared/src/constants.ts:
  - NICHES: массив из 20 ниш (id, name, slug, icon, isFocus)
  - SUBSCRIPTION_TIERS: free, starter, pro, expert, business, enterprise с ценами
  - ORDER_STATUSES, CONTENT_STATUSES, LEAD_STATUSES, JOB_TYPES — перечисления из схемы
```

**Результат:**
- Миграции `001`–`004` в `packages/supabase/migrations/`
- SQL валиден (нет синтаксических ошибок)
- `packages/shared/src/types/database.ts` содержит типы всех таблиц
- `packages/shared/src/constants.ts` содержит все перечисления и 20 ниш
- `pnpm --filter shared build` компилируется без ошибок

---

## ШАГ 3: SUPABASE-КЛИЕНТЫ, AUTH, MIDDLEWARE, ЛЕНДИНГ

**Цель:** рабочая аутентификация (Supabase Auth, email magic link), middleware Next.js для защищённых маршрутов, лендинг neuroexpertise.ru с формой регистрации, страницы login/register.

**Задача для агента:**

```
Реализуй аутентификацию и лендинг для НейроЭксперт.

1. Supabase-клиенты (apps/web/lib/supabase/):
   - client.ts — browser client (createBrowserClient из @supabase/ssr)
   - server.ts — server client для SSR (createServerClient с cookies)
   - admin.ts — service_role client (только серверная сторона)

2. Middleware (apps/web/middleware.ts):
   - Защищённые маршруты: /dashboard/*, подключение Supabase server client
   - Публичные маршруты: /, /audit, /experts/*, /pricing, /login, /register, /api/audit, /api/leads, /api/webhooks/*
   - Редирект неаутентифицированных на /login

3. Auth-страницы (apps/web/app/(auth)/):
   - /login — email + magic link (Supabase Auth signInWithOtp)
   - /register — email + имя + выбор ниши → signUp → создание profiles (через DB trigger или client-side)
   - Callback для magic link (/auth/callback — обработка подтверждения)

4. Trigger: при создании auth.users → автоматическая вставка в profiles (SQL function + trigger в новой миграции 005_auth_trigger.sql)

5. Лендинг (apps/web/app/(marketing)/page.tsx):
   - Hero: ключевое обещание из раздела 1.2 НейроЭксперт_Единый.md
     «Наговори 10 минут — получи клиентов из поиска и нейросетей. Без написания текстов, без SMM, без бюджета на рекламу.»
   - Подзаголовок: «Мы находим вопросы, которые задают тысячи людей. Превращаем ваш голос в экспертный контент. Публикуем так, чтобы нейросети и поисковики его нашли. На каждой странице — кнопка «записаться к вам».»
   - 3 шага: «Мы находим вопрос → Вы наговариваете ответ → Получаете клиентов»
   - Блок «Два канала привлечения»:
     - «Нейросети цитируют ваш ответ» (ChatGPT, Perplexity, YandexGPT)
     - «Поисковики ранжируют вашу страницу» (Google, Яндекс)
   - Блок «Для кого» (5 ниш с иконками)
   - CTA: «Бесплатный аудит» → /audit
   - CTA: «Войти» → /login

   Дизайн: Tailwind CSS, минималистичный, профессиональный. Тёмный header, белый body. Акцентный цвет — синий (#2563EB).

6. Layout (apps/web/app/layout.tsx):
   - <html lang="ru">
   - Шрифт: Inter (Google Fonts)
   - Мета: title "НейроЭксперт — AIO-платформа для экспертов", description
   - Навигация: логотип, ссылки, кнопка входа

Результат: localhost:3000 показывает лендинг. /login и /register работают с Supabase Auth. После входа — редирект на /dashboard (пока 404, это ок).
```

**Результат:**
- Лендинг рендерится на localhost:3000 без ошибок
- /login показывает форму, отправка email работает (magic link)
- /register создаёт пользователя + запись в profiles
- Middleware перенаправляет неаутентифицированных с /dashboard на /login
- `pnpm build` проходит

---

## ШАГ 4: АБСТРАКТНЫЙ LLM/STT-СЛОЙ И БЕСПЛАТНЫЙ АУДИТ

**Цель:** абстрактный LLM-слой с fallback, абстрактный STT-слой, рабочий бесплатный аудит (выбор ниши → 3 «дыры») → CTA на Starter.

**Задача для агента:**

```
Реализуй абстрактный LLM/STT-слой и модуль бесплатного аудита.

1. Абстрактный LLM-слой (packages/shared/src/llm/):
   - index.ts: интерфейс LLMProvider { generateText(prompt, options?): Promise<string>; generateJSON<T>(prompt, schema): Promise<T> }
   - Интерфейс LLMOptions { model?, maxTokens?, temperature?, systemPrompt? }
   - Функция createLLMProvider(provider: string): LLMProvider — фабрика
   - Функция getLLM(): LLMProvider — берёт primary из env, при ошибке — fallback
   - claude.ts: адаптер Claude API (используй @anthropic-ai/sdk)
   - openai.ts: адаптер OpenAI API (используй openai sdk) — для gpt-4o-mini (массовый анализ)
   - yandexgpt.ts: адаптер YandexGPT API (HTTP-запросы)
   - gigachat.ts: адаптер GigaChat API (HTTP-запросы, OAuth2 токен)
   Конфиг через env: LLM_PRIMARY_PROVIDER, LLM_FALLBACK_PROVIDER.

2. Абстрактный STT-слой (packages/shared/src/transcription/):
   - index.ts: интерфейс STTProvider { transcribe(audioBuffer: Buffer, options?): Promise<string> }
   - whisper.ts: адаптер OpenAI Whisper API
   - yandex-stt.ts: адаптер YandexSpeechKit v3
   Конфиг через env: STT_PRIMARY_PROVIDER, STT_FALLBACK_PROVIDER.

3. Промпты (packages/shared/src/prompts/):
   - gap-analysis.ts:
     - SYSTEM_PROMPT_GAP_ANALYSIS: системный промпт для оценки дыр
     - buildGapAnalysisPrompt(question, aiResponse): промпт для оценки одного ответа
     - Маркеры из раздела 1.7: has_expert_name, has_specific_examples, has_source_link, конкретные цифры
   - filter.ts:
     - SYSTEM_PROMPT_FILTER: «Убери общие вопросы, оставь конкретные»
     - buildFilterPrompt(questions[]): промпт для фильтрации 50 из 500

4. Страница аудита (apps/web/app/(marketing)/audit/page.tsx):
   - Шаг 1: выбор ниши из 20 (карточки с иконками)
   - Шаг 2: loading-анимация «Анализируем ответы нейросетей...» (3-10 сек)
   - Шаг 3: показ 3 «дыр» с данными:
     - Вопрос (question_text)
     - Частотность (monthly_volume) — «12 400 запросов/мес»
     - Оценка дыры (gap_score) — визуальная шкала
     - Текущий ответ AI (сокращённый)
     - CTA: «Хочу занять эту позицию → Starter», «Зарегистрироваться и начать»

5. API Route (apps/web/app/api/audit/route.ts):
   - POST { niche_id }
   - Берёт 3 вопроса из questions (gap_score DESC, niche_id), если нет — прогоняет через LLM на лету
   - Rate limit: 2 бесплатных аудита в минуту на IP

6. Supabase Edge Function (packages/supabase/functions/audit-free/index.ts):
   - Получает niche_id
   - Ищет в questions (gap_score >= 5, отсортированные по gap_score DESC, лимит 3)
   - Если нет данных — возвращает заглушку с пометкой «данные собираются»

Пока данных в questions нет — аудит показывает seed-данные (заранее подготовь 3-5 примеров вопросов с дырами для каждой из 5 фокусных ниш в seed.sql или в отдельной миграции).
```

**Результат:**
- `packages/shared` содержит рабочие LLM и STT адаптеры с fallback-логикой
- /audit отображает выбор ниши, после выбора — 3 дыры с цифрами
- API `/api/audit` отвечает JSON с дырами
- `pnpm build` проходит

---

## ШАГ 5: TELEGRAM-БОТ — РЕГИСТРАЦИЯ, ЗАКАЗЫ, ГОЛОС

**Цель:** рабочий Telegram-бот (@neuroexpert_bot): /start (регистрация/привязка), /orders (показ заказов), приём голосовых сообщений, транскрипция через Whisper, webhook через Next.js.

**Задача для агента:**

```
Реализуй Telegram-бота для НейроЭксперт.

1. Бот (apps/bot/src/):
   - bot.ts: инстанс grammY Bot, middleware (логирование, error handler)
   - index.ts: точка входа. Режим: webhook (через URL из env TELEGRAM_WEBHOOK_URL) или polling (dev).
   - keyboards.ts: inline-клавиатуры (выбор ниши, кнопки заказов, approve/edit)

2. Команды (apps/bot/src/commands/):
   - start.ts:
     Если /start — новый пользователь:
       Создаёт аккаунт через Supabase Admin API (используй пакет @supabase/supabase-js с service_role key).
       Сохраняет telegram_id, telegram_username в profiles.
       Отправляет приветствие + inline-клавиатура выбора ниши (5 фокусных + «Другая»).
     Если /start {token} — привязка к существующему аккаунту:
       Декодирует JWT-токен, привязывает telegram_id к profile.
   - orders.ts:
     Показывает текущие заказы эксперта (status IN ('pending', 'accepted')).
     Каждый заказ: вопрос + частотность + gap_score + кнопки [Принять] [Пропустить].
     Если заказов нет — «Заказы обновляются каждый понедельник. Пока можете записать ответ на свободную тему.»
   - record.ts:
     «Отправьте голосовое сообщение (3–10 минут) с ответом на выбранный вопрос. Я транскрибирую и создам контент.»
   - status.ts:
     Мини-дашборд: количество опубликованных страниц, цитирований, заявок.

3. Обработчики (apps/bot/src/handlers/):
   - voice.ts:
     Ловит voice messages.
     Скачивает файл через Telegram Bot API (bot.api.getFile → download).
     Отправляет на транскрипцию через абстрактный STT-слой из packages/shared.
     Сохраняет запись в voice_recordings (Supabase).
     Отправляет пользователю: «Расшифровка готова (N слов). Создаю контент...»
     Создаёт задачу в таблице jobs (type: 'generate_content', payload: { voice_id, expert_id }).
     (Генерацию контента реализуем в шаге 6, пока просто создаём задачу.)
   - callback.ts:
     Обработка inline-кнопок:
       accept_order:{order_id} — меняет статус заказа на 'accepted'
       skip_order:{order_id} — меняет статус на 'rejected'
       approve:{content_id} — меняет статус контент-пакета на 'approved' (позже — published)
       edit:{content_id} — отправляет ссылку на ЛК для редактирования

4. Webhook (apps/web/app/api/webhooks/telegram/route.ts):
   - POST: принимает update от Telegram
   - Проверяет TELEGRAM_WEBHOOK_SECRET
   - Передаёт update в grammY (webhookCallback)
   - Бот подключается к этому роуту

5. Подключение к Supabase:
   - Бот использует Supabase client с service_role key (admin) из packages/shared.
   - Все запросы к БД — через Supabase JS SDK.

Бот должен работать в polling-режиме при локальной разработке (TELEGRAM_BOT_TOKEN в .env).
```

**Результат:**
- Бот запускается (`pnpm --filter bot dev`) и отвечает на /start, /orders, /record, /status
- Голосовое сообщение принимается, транскрибируется, сохраняется в voice_recordings
- Webhook-роут `/api/webhooks/telegram` принимает POST
- `pnpm build` проходит

---

## ШАГ 6: ГЕНЕРАЦИЯ КОНТЕНТА — 5 ФОРМАТОВ ИЗ ГОЛОСА

**Цель:** полный пайплайн «голос → 5 форматов контента». Worker берёт задачу из очереди, генерирует контент через LLM, **валидирует структуру (TL;DR, word_count ≥ 2900, таблица, passage_count ≥ 6)**, сохраняет в content_packages, уведомляет эксперта в Telegram.

**Задача для агента:**

```
Реализуй генерацию контента из голоса (Expert Voice Engine).

1. Промпты (packages/shared/src/prompts/content-gen.ts):
   Системный промпт для генерации контента:
   - «Ты — редактор экспертного контента. Получаешь расшифровку голоса эксперта. Твоя задача — структурировать, сохраняя авторский стиль. НЕ переписывай, а организуй. Сохраняй конкретные примеры из практики, числа, кейсы.»

   5 функций-промптов, каждая принимает (transcript, expertName, questionText):
   - buildTelegramPostPrompt() → пост 1000–2000 символов, заголовок, CTA
   - buildSeoArticlePrompt() → статья 18 000–22 000 символов (2 900–3 500 слов), TL;DR, H2/H3 блоки 120–180 слов, таблица, нумерованный список, мета-теги, ключевые слова, 2–3 внешних источника, выделение прямых цитат
   - buildCardsPrompt() → JSON [{title, text}] — 5 тезисов по 200 символов
   - buildReelsScriptPrompt() → 60-секундный сценарий с хуком и CTA
   - buildFaqPrompt() → JSON [{question, answer}] — 3–5 вопросов-ответов

   Каждый промпт:
   - Явно указывает: «Выдели 2-3 прямые цитаты эксперта в формате: "Как отмечает {expertName}: '...'"»
   - Указывает: «Не добавляй информацию, которой нет в расшифровке»

2. Worker — обработка задачи generate_content (apps/worker/src/jobs/generate-content.ts):
   - Берёт из payload: voice_id, expert_id
   - Загружает из voice_recordings: transcript
   - Загружает из orders/questions: question_text, keywords
   - Вызывает LLM (через абстрактный слой) для каждого из 5 форматов
   - **SEO-статья генерируется в формате 2900–3500 слов** с обязательной структурой:
     - TL;DR (40–60 слов) в начале
     - 6–10 самодостаточных H2/H3 блоков по 120–180 слов
     - Минимум 1 таблица и 1 нумерованный список
     - 2–3 ссылки на авторитетные внешние источники
   - Сохраняет результат в content_packages:
     format_telegram_post, format_seo_article, format_cards (JSONB), format_reels_script, format_faq (JSONB)
   - Генерирует meta_title, meta_description, slug, expert_quotes[]
   - **Запускает валидацию структуры** (validate_content): word_count, has_tldr, has_table, passage_count
   - Если валидация не пройдена — автоматическая доработка через LLM (повторный вызов с указанием пробелов)
   - Обновляет status → 'review'
   - Отправляет уведомление в Telegram: «Контент готов! 5 форматов. [✅ Опубликовать] [✏️ Редактировать]»

3. Worker — основной цикл (apps/worker/src/index.ts + queue.ts):
   - Polling таблицы jobs: SELECT * FROM jobs WHERE status = 'pending' ORDER BY priority, scheduled_at LIMIT {WORKER_CONCURRENCY}
   - Обновляет status → 'processing', started_at
   - Выполняет задачу (dispatch по type)
   - Обновляет status → 'completed' или 'failed' (с error и retry-логикой)
   - Поддерживает типы: 'generate_content' (остальные — заглушки console.log)
   - Интервал polling: WORKER_POLL_INTERVAL_MS (default 5000)

4. Telegram: уведомление о готовом контенте (apps/bot/src/handlers/callback.ts):
   - При approve:{content_id} → меняет status на 'approved', отвечает «Контент одобрен, скоро будет опубликован!»
   - При edit:{content_id} → отправляет ссылку `{APP_URL}/dashboard/content/{content_id}`

5. Web Audio (apps/web/app/(dashboard)/content/new/page.tsx):
   - Альтернативный интерфейс записи голоса в браузере (Web Audio API / MediaRecorder)
   - Кнопка «Записать» → запись → загрузка на /api/voice → создание задачи
   - /api/voice route (apps/web/app/api/voice/route.ts): принимает audio file, сохраняет в Supabase Storage, создаёт voice_recording, создаёт job

Worker должен запускаться: pnpm --filter worker dev.
```

**Результат:**
- Worker запускается и обрабатывает задачи из очереди
- Отправка голосового в Telegram → транскрипция → 5 форматов в content_packages
- Бот присылает уведомление с кнопками approve/edit
- Web Audio запись работает в /dashboard/content/new
- `pnpm build` проходит для всех apps

---

## ШАГ 7: ПУБЛИКАЦИЯ — SSR-СТРАНИЦЫ, SCHEMA.ORG, SEO

**Цель:** публичные SSR/SSG-страницы экспертов с AIO-оптимизацией (Schema.org, мета-теги, robots.txt, sitemap.xml), кнопка «Записаться к эксперту», аудиоплеер.

**Задача для агента:**

```
Реализуй AI Publishing Network — публичные страницы экспертов.

1. Schema.org генерация (apps/web/lib/schema-org.ts):
   - generateArticleSchema(content, expert) → JSON-LD Article (с dateModified)
   - generateFAQSchema(faqItems) → JSON-LD FAQPage
   - generatePersonSchema(expert) → JSON-LD Person (name, qualification, url, image, alumniOf, worksFor, knowsAbout)
   - generateBreadcrumbSchema(pages) → JSON-LD BreadcrumbList (Главная > Эксперты > Имя > Статья)
   - generateHowToSchema(steps) → JSON-LD HowTo (автодетекция пошаговых инструкций)
   Вставлять в <head> через <script type="application/ld+json">.

2. SEO-утилиты (apps/web/lib/seo.ts):
   - generateMetadata(content, expert) → Next.js Metadata object:
     title: "{question} — {expertName} | НейроЭксперт"
     description: meta_description из content_packages (150 символов)
     openGraph: title, description, url, image (аватар эксперта или OG-шаблон)
     canonical: {APP_URL}/experts/{expertSlug}/{articleSlug}

3. Страница статьи (apps/web/app/experts/[slug]/[articleSlug]/page.tsx):
   - SSG с generateStaticParams (или ISR с revalidate)
   - Загрузка данных: content_packages (status = 'published') + profiles
   - Рендеринг:
     - Хлебные крошки (BreadcrumbList): Главная > Эксперты > Имя > Статья
     - Шапка: имя эксперта, фото, квалификация, ниша, Expert Trust Score, число публикаций
     - Заголовок: question_text (H1)
     - **TL;DR блок** — визуально выделенный (фон/рамка), прямой ответ 40–60 слов
     - **Дата публикации + дата обновления** — видимые на странице
     - Тело: format_seo_article (markdown → HTML, **инлайн-рендеринг таблиц** для Featured Snippets)
     - Прямые цитаты эксперта: выделенные блоки
     - Аудиоплеер: <audio> с файлом из voice_recordings (Supabase Storage public URL)
     - FAQ-блок: format_faq (аккордеон)
     - Блок «Похожие вопросы»: 3-5 ссылок на другие статьи этого эксперта
     - **Кнопка «Записаться к эксперту»**: форма (имя, контакт, тема запроса)
     - Email-захват: «Хотите получать ответы {expertName}? Введите email»
   - Schema.org: Article + FAQPage + Person + BreadcrumbList + HowTo (если применимо) — JSON-LD в head
   - Meta tags через generateMetadata

4. Профиль эксперта (apps/web/app/experts/[slug]/page.tsx):
   - SSG/ISR
   - Информация: имя, фото, квалификация, bio, город, Expert Trust Score
   - Список опубликованных статей (ссылки)
   - Кнопка «Записаться»
   - Schema.org: Person

5. Каталог экспертов (apps/web/app/experts/page.tsx):
   - Список экспертов (is_published = true)
   - Фильтры: ниша, город
   - Карточки: фото, имя, ниша, trust_score, количество статей

6. robots.txt (apps/web/app/robots.ts):
   - Allow: / для всех ботов
   - Явно: User-agent: GPTBot / ClaudeBot / PerplexityBot / YandexBot / Googlebot / bingbot — Allow: /
   - Sitemap: {APP_URL}/sitemap.xml

7. sitemap.xml (apps/web/app/sitemap.ts):
   - Динамический: все published content_packages + все published expert profiles
   - Формат: URL + lastmod + changefreq + priority

8. API «Записаться» (apps/web/app/api/leads/route.ts):
   - POST: { expert_id, content_id?, client_name, client_contact, client_message, referrer }
   - Создаёт запись в leads (status: 'new', source: 'page_button')
   - Отправляет Telegram-уведомление эксперту через Supabase (insert → trigger → notify)
   - Rate limit: 5/мин на IP

9. API «Публикация» (apps/web/app/api/publish/route.ts):
   - POST: { content_id } (auth required, owner only)
   - Обновляет content_packages: status → 'published', published_at, published_url
   - Вызывает ISR revalidation для страницы
   - **Создаёт задачу crosspost_social** в очереди jobs (Worker шерит на Кью, Дзен, отзовики)
   - **Усиление бэклинков:** отправляет эксперту в Telegram уведомление с подготовленным постом для шеринга: «Статья опубликована! Поделитесь в первые 3 дня для максимального эффекта: [Поделиться в Telegram-чатах] [Копировать пост для соцсетей]»

10. Leads-уведомление в боте (apps/bot/src/handlers/leads.ts):
    - Слушает вставки в leads (через Supabase Realtime или через polling)
    - Отправляет эксперту: «Новая заявка! {client_name}, тема: {client_message} [Принять] [Отклонить]»

Публичные страницы должны рендериться без аутентификации.
```

**Результат:**
- `/experts` показывает каталог экспертов
- `/experts/{slug}` показывает профиль эксперта
- `/experts/{slug}/{articleSlug}` показывает статью с Schema.org, аудио, кнопкой «Записаться»
- `/robots.txt` и `/sitemap.xml` генерируются корректно
- Форма «Записаться» создаёт лид и уведомляет эксперта в Telegram
- `pnpm build` проходит

---

## ШАГ 8: ДАШБОРД ЭКСПЕРТА — ЛК, ЗАКАЗЫ, КОНТЕНТ, ЛИДЫ

**Цель:** полноценный личный кабинет эксперта: дашборд с метриками, список заказов, управление контентом (просмотр/редактирование/публикация), заявки, профиль.

**Задача для агента:**

```
Реализуй личный кабинет эксперта (dashboard).

1. Layout (apps/web/app/(dashboard)/layout.tsx):
   - Sidebar: логотип, навигация (Дашборд, Заказы, Контент, Заявки, Аналитика, Профиль, Биллинг)
   - Auth guard: проверяет сессию Supabase, редирект на /login
   - Адаптивный: sidebar скрывается на мобильных, hamburger-меню

2. Дашборд (apps/web/app/(dashboard)/dashboard/page.tsx):
   - Карточки метрик: опубликовано страниц, всего заявок, Expert Trust Score, подписка (текущий тариф)
   - Список последних 5 заказов (pending)
   - Список последних 5 заявок (new)
   - CTA: «Записать ответ» → /dashboard/content/new
   Данные: Supabase server client, агрегация из content_packages, leads, orders.

3. Заказы (apps/web/app/(dashboard)/orders/page.tsx):
   - Таблица/карточки: все заказы эксперта
   - Каждый заказ: вопрос, частотность, gap_score, текущий ответ AI, статус
   - Кнопки: [Принять и записать] → переход к записи голоса, [Пропустить]
   - Фильтры: статус (pending, accepted, published)

4. Контент (apps/web/app/(dashboard)/content/page.tsx):
   - Список всех контент-пакетов эксперта
   - Статусы: generating, review, approved, published
   - Каждый пакет: заголовок, дата, статус, ссылка на публичную страницу (если published)

5. Просмотр/редактирование контент-пакета (apps/web/app/(dashboard)/content/[id]/page.tsx):
   - 5 вкладок: Telegram-пост, SEO-статья, Карточки, Reels-скрипт, FAQ
   - Каждая вкладка: текст контента + возможность редактирования (textarea)
   - Кнопки: [Сохранить изменения] [Опубликовать] [Удалить]
   - Предпросмотр SEO-статьи (как будет выглядеть на публичной странице)
   - Метаданные: meta_title, meta_description (редактируемые)

6. Заявки (apps/web/app/(dashboard)/leads/page.tsx):
   - Таблица: все заявки (leads) эксперта
   - Каждая: имя клиента, контакт, тема, источник, дата, статус
   - Кнопки: [Принять] [Отклонить] — обновляют статус
   - Фильтры: статус (new, accepted, completed)

7. Профиль (apps/web/app/(dashboard)/profile/page.tsx):
   - Редактирование: имя, slug, bio, квалификация, город, цена консультации, аватар
   - **E-E-A-T поля (редактируемые, используются в Schema.org Person и блоке «Об авторе»):**
     - Образование (alumni_of): «МГУ, факультет психологии»
     - Место работы (works_for): «Клиника "Альянс"»
     - Области экспертизы (knows_about): теги, например [«КПТ», «тревожные расстройства»]
     - Стаж (years_experience): число лет
   - Привязка Telegram (если не привязан): генерирует токен, показывает ссылку
   - Переключатель: «Показывать в каталоге экспертов» (is_published)
   - Предпросмотр публичного профиля

8. Все страницы используют Supabase server client для загрузки данных (SSR) и client для интерактивных действий.

Стилизация: Tailwind CSS, единый стиль с лендингом. Компоненты UI: Button, Input, Card, Badge, Table — в apps/web/components/ui/.
```

**Результат:**
- /dashboard показывает метрики и последние данные
- /dashboard/orders — список заказов с действиями
- /dashboard/content — список контента, /dashboard/content/{id} — просмотр/редактирование
- /dashboard/leads — список заявок
- /dashboard/profile — редактирование профиля
- Все страницы работают с реальными данными из Supabase
- `pnpm build` проходит

---

## ШАГ 9: WORKER — СБОР СПРОСА, ПОИСК ДЫР, ФОРМИРОВАНИЕ ЗАКАЗОВ

**Цель:** автоматический сбор вопросов из Wordstat (XMLRiver), фильтрация через LLM, прогон через нейросети для поиска дыр, формирование еженедельных заказов для экспертов.

**Задача для агента:**

```
Реализуй автоматический сбор спроса и формирование заказов (AI Gap Finder).

1. Wordstat-клиент (apps/worker/src/services/wordstat.ts):
   - fetchWordstat(keyword: string): Promise<{query: string, volume: number}[]>
   - Использует XMLRiver API: GET https://xmlriver.com/search_yandex/xml?user={}&key={}&query={keyword}&type=wordstat
   - Парсит XML-ответ, извлекает вопросы (keyword содержит «как», «почему», «можно ли», «что делать» и т.д.)
   - Фильтрует: volume >= 1000/мес

2. SerpAPI-клиент (apps/worker/src/services/serpapi.ts):
   - fetchPAA(query: string): Promise<string[]> — People Also Ask
   - GET https://serpapi.com/search?api_key={}&engine=google&q={query}
   - Извлекает related_questions

3. AI-пробер (apps/worker/src/services/ai-prober.ts):
   - probeAI(question: string, platform: 'chatgpt' | 'perplexity' | 'yandexgpt'): Promise<AIProbeResult>
   - Для ChatGPT: вызов OpenAI API с вопросом, получение ответа
   - Для Perplexity: вызов Perplexity API (если доступен) или через Playwright (scraping)
   - Для YandexGPT: вызов YandexGPT API
   - AIProbeResult: { response: string, hasExpertName: boolean, hasSpecificExamples: boolean, hasSourceLink: boolean }
   - Объективные маркеры проверяются программно (regex / строковый поиск) + LLM для оценки gap_score (1-10)

4. Job: collect_demand (apps/worker/src/jobs/collect-demand.ts):
   - Получает payload: { niche_id }
   - Загружает seed_keywords ниши
   - Для каждого ключевого слова: fetchWordstat → вопросы
   - Дедупликация, фильтрация (volume >= 1000)
   - Сохраняет в questions (upsert по niche_id + question_text)
   - Создаёт задачу find_gaps для этой ниши

5. Job: find_gaps (apps/worker/src/jobs/find-gaps.ts):
   - Получает payload: { niche_id }
   - Загружает топ-50 вопросов по volume (ещё не проанализированных или давно)
   - LLM-фильтрация: отбирает 50 самых конкретных из всех (промпт из packages/shared/src/prompts/filter.ts)
   - Для каждого из 50: probeAI через 1-3 платформы
   - Сохраняет результаты в questions: gap_score, ai_response_*, has_expert_name, has_specific_examples, has_source_link, gap_analyzed_at
   - Создаёт задачу generate_orders для этой ниши

6. Job: generate_orders (apps/worker/src/jobs/generate-orders.ts):
   - Получает payload: { niche_id }
   - Для каждого эксперта в нише (subscription_tier != 'free'):
     - Берёт топ-10 вопросов с highest gap_score, которые ещё не были в заказах этого эксперта
     - Создаёт orders (status: 'pending', week_number, expires_at: +7 дней)
   - Отправляет Telegram-уведомление: «Новые заказы на этой неделе! /orders»

Все три задачи должны обрабатываться worker'ом при появлении в таблице jobs.
pg_cron (из шага 2) создаёт задачи collect_demand каждый понедельник.
```

**Результат:**
- Worker обрабатывает collect_demand → questions заполняются из Wordstat
- Worker обрабатывает find_gaps → gap_score заполняется для вопросов
- Worker обрабатывает generate_orders → заказы создаются для экспертов
- Эксперт видит заказы в Telegram (/orders) и в дашборде
- `pnpm build` проходит

---

## ШАГ 10: ОПЛАТА — ЮKASSA, ПОДПИСКИ, БИЛЛИНГ

**Цель:** интеграция с ЮKassa: подписки (Starter/Pro/Expert/Business) со скользящей комиссией (split-payment), страница тарифов с понятными описаниями, биллинг в ЛК.

**Задача для агента:**

```
Реализуй платежи через ЮKassa.

1. ЮKassa SDK (установи @yookassa/yookassa-sdk-nodejs или HTTP-запросы):
   - Создание подписки (рекуррент): save_payment_method: true
   - Автопродление: POST /v3/payments с payment_method_id
   - Split-payment: POST /v3/payments с transfers[] (комиссия зависит от тарифа)

2. Страница тарифов (apps/web/app/(marketing)/pricing/page.tsx):
   - 4 карточки тарифов (понятный язык для обычного пользователя):
   
   FREE (0₽/мес):
     «Попробуйте бесплатно. Платите только когда зарабатываете.»
     • Каждую неделю — 3 вопроса, которые задают тысячи людей в вашей теме
     • Вы наговариваете ответ — система создаёт статью + пост + карточки + скрипт для видео + FAQ
     • Публикации без ограничений — каждая страница с кнопкой «Записаться к вам»
     • Клиент записался — вы получаете 85%, платформа 15%
   
   STARTER (1 490₽/мес):
     «Больше тем — больше клиентов. Комиссия ниже.»
     • Всё из Free
     • 10 подобранных вопросов в неделю вместо 3
     • Публикации без ограничений
     • Комиссия снижена до 7% (вы получаете 93%)
   
   PRO (2 990₽/мес):
     «Ваши статьи видят везде. Система продвигает вас сама.»
     • Всё из Starter
     • Вопросов без ограничений
     • Статьи размещаются на Дзен, Хабр, Яндекс Кью, отзовиках
     • Система помогает распространить каждую статью в первые 3 дня
     • Напоминания об обновлении контента каждые 3 месяца
     • Комиссия всего 3% (вы получаете 97%)
   
   EXPERT (4 990₽/мес):
     «Вы видите всю картину. Все деньги от клиентов — ваши.»
     • Всё из Pro
     • Видите, цитируют ли вас нейросети — и по каким запросам
     • Какой % ответов ваш, а какой у конкурентов
     • Какие сайты нейросети используют в вашей теме
     • Публичный рейтинг экспертности
     • Подсказки: «По запросу X отвечает Мария — у вас есть шанс»
     • Комиссия 0% — все деньги от клиентов ваши
   
   - Под карточками — СРАВНИТЕЛЬНАЯ ТАБЛИЦА ТАРИФОВ:
     Строки: Цена, Комиссия с клиентов, Вопросов в неделю, Публикации, 5 форматов контента,
     Кнопка «Записаться», Размещение на площадках, Помощь с распространением,
     Напоминания об обновлении, Видите цитирование нейросетями, % ответов vs конкуренты,
     Источники нейросетей, Рейтинг экспертности, Подсказки по конкурентам.
     Столбцы: Free / Starter / Pro / Expert. Значения: да/—/цифры.
     Таблица должна наглядно показывать, чем каждый тариф отличается от предыдущего.

   - 2 тарифа B2B: Бизнес (24 990₽/мес), Enterprise (99 990₽/мес — «Связаться»)
   - CTA: Free → «Начать бесплатно», Starter → «Подписаться», Pro/Expert → «Подписаться»
   - Блок: «Одна консультация = 3 000–5 000₽. Подписка окупается с первого клиента.»

3. Split-payment логика (apps/web/lib/split-payment.ts):
   - getCommissionRate(tier) → Free: 0.15, Starter: 0.07, Pro: 0.03, Expert: 0
   - При оплате консультации через платформу: ЮKassa split-payment автоматически распределяет деньги
   - Эксперт видит: «Клиент оплатил 5 000₽. Ваша доля: 4 250₽ (Free, комиссия 15%)»

4. Webhook ЮKassa (apps/web/app/api/webhooks/yukassa/route.ts):
   - POST: принимает уведомления о статусе платежа
   - Верифицирует подпись (YUKASSA_WEBHOOK_SECRET)
   - payment.succeeded:
     type = 'subscription': обновляет profiles.subscription_tier и subscription_expires_at
     type = 'commission': записывает комиссию в payments
   - payment.canceled / refund.succeeded: обработка отмен
   - Сохраняет все платежи в payments

5. Биллинг в ЛК (apps/web/app/(dashboard)/billing/page.tsx):
   - Текущая подписка: тариф, дата следующего списания, статус
   - Блок: «Ваша комиссия: {rate}%. На тарифе {next_tier} — {next_rate}%.» (стимул апгрейда)
   - Кнопки: [Сменить тариф] [Отменить подписку]
   - История платежей: таблица из payments (подписки + комиссии)

6. Middleware для подписок:
   - Проверка subscription_tier при доступе к функциям:
     - Free: 3 вопроса/нед, публикации без ограничений, 5 форматов контента, кнопка «Записаться», комиссия 15%
     - Starter: 10 вопросов/нед, публикации без ограничений, комиссия 7%
     - Pro: вопросы и публикации без ограничений, размещение на Дзен/Хабр/Кью/отзовиках, помощь с распространением, напоминания об обновлении, комиссия 3%
     - Expert: всё из Pro + видит цитирование нейросетями, % ответов vs конкуренты, анализ источников, рейтинг экспертности, конкурентный анализ, комиссия 0%
   - При превышении лимита — показ апгрейд-предложения с расчётом экономии на комиссии
```

**Результат:**
- /pricing показывает тарифы с понятными описаниями и кнопками оплаты
- Подписка оформляется через ЮKassa (рекуррент)
- Split-payment работает: комиссия зависит от тарифа (Free 15%, Starter 7%, Pro 3%, Expert 0%)
- Webhook обрабатывает payment.succeeded, обновляет profiles
- /dashboard/billing показывает подписку, комиссию и историю
- `pnpm build` проходит

---

## ШАГ 11: ТРЕКИНГ ЦИТИРОВАНИЯ И АНАЛИТИКА

**Цель:** AI Citation Tracker: еженедельный прогон через нейросети, мониторинг SERP, Expert Trust Score, дашборд аналитики.

**Задача для агента:**

```
Реализуй AI Citation Tracker и аналитику.

1. Job: track_citations (apps/worker/src/jobs/track-citations.ts):
   - Получает payload: { expert_id }
   - Загружает все published content_packages эксперта
   - Для каждого: берёт question_text, прогоняет через ChatGPT, Perplexity, YandexGPT (через ai-prober)
   - Проверяет цитирование:
     - Имя эксперта в ответе (строковый поиск)
     - URL страницы в ответе (строковый поиск)
     - Cosine similarity > 0.7 между ответом AI и content (используй простой TF-IDF или вызов LLM)
   - Сохраняет в citation_checks: is_cited, citation_type, similarity_score
   - Запускается еженедельно через pg_cron (среда 04:00)

2. Job: track_serp (apps/worker/src/jobs/track-serp.ts):
   - Получает payload: { expert_id }
   - Для каждого published content_package: проверяет позицию в Яндексе и Google через SerpAPI
   - Сохраняет в serp_positions: position, search_engine, query

3. Job: calculate_trust_score (apps/worker/src/jobs/calculate-trust-score.ts):
   - Получает payload: { expert_id }
   - Формула: trust_score = (citation_count × 2 + avg_position_score × 1.5 + content_count × 1 + lead_count × 3) / max_possible × 100
   - Обновляет profiles.trust_score

4. Job: submit_sitemap (apps/worker/src/jobs/submit-sitemap.ts):
   - GSC: POST urlInspection/index:inspect для новых published страниц
   - Яндекс Вебмастер: POST recrawl/queue для новых страниц
   - Запускается ежедневно через pg_cron

5. Дашборд аналитики (apps/web/app/(dashboard)/analytics/page.tsx):
   - Expert Trust Score (большое число + прогресс-бар)
   - График: количество цитирований по неделям (Recharts LineChart)
   - Таблица: каждая статья → статус цитирования по платформам (✅/❌ для ChatGPT, Perplexity, YandexGPT)
   - Позиции в поиске: таблица с позициями Яндекс/Google
   - Трафик: интеграция с Plausible (если настроен) — топ-5 страниц по визитам
   - Заявки: количество за последние 30 дней, источники (AI referral / SEO / direct)
   - Рекомендации: «Ваш ответ на "X" не цитируется — рекомендуем обновить», «Запишите ответ на "Y" — gap_score 9»

6. Email-подписчики (apps/web/app/api/email-subscribe/route.ts):
   - POST: { expert_id, email } → сохраняет в email_subscribers
   - При публикации нового контента: Job send_email_digest отправляет письмо через Resend

Для Recharts: установи recharts в apps/web.
```

**Результат:**
- Worker выполняет track_citations — данные появляются в citation_checks
- Worker выполняет track_serp — данные в serp_positions
- /dashboard/analytics показывает графики, таблицы, Trust Score
- Sitemap отправляется в GSC и Яндекс.Вебмастер
- `pnpm build` проходит

---

## ШАГ 12: AI VISIBILITY SCANNER, КРОССПОСТ, ФИНАЛИЗАЦИЯ

**Цель:** вирусный лидмагнит (AI Visibility Scanner), кросспост на Дзен/vc.ru, email-рассылки, финальная полировка, Docker-сборка всего проекта.

**Задача для агента:**

```
Реализуй финальные модули и подготовь к продакшену.

1. AI Visibility Scanner (apps/web/app/(marketing)/scan/page.tsx):
   - Форма: «Введите имя, бренд или сайт» → кнопка «Проверить»
   - API /api/scan (POST): прогоняет имя/бренд через ChatGPT, Perplexity, YandexGPT
   - Результат: сколько раз цитируют, в каких контекстах, процент (упрощённая оценка)
   - Публичная страница результата: /scan/{slug} (SSR)
     «{Имя/Бренд} — AI Visibility: 2%. Конкурент X — 38%.»
     CTA: «Увеличить AI-видимость» → /register
   - Шеринг: Open Graph мета-теги для красивого превью при шеринге в соцсетях
   - Rate limit: 3 сканирования/час на IP

2. Кросспост (apps/worker/src/jobs/crosspost.ts):
   - Job type: 'crosspost'
   - Для тарифа Pro+: при публикации контента создаёт задачу crosspost
   - Реализация: подготовка адаптированной версии статьи для Дзен (Яндекс Дзен API, если доступен) и vc.ru (заглушка — сохраняет готовый текст в content_packages.metadata для ручной публикации)
   - Canonical URL всегда на neuroexpertise.ru

3. Email-рассылки:
   - Job: send_email_digest (apps/worker/src/jobs/send-email-digest.ts):
     При публикации нового контента эксперта → рассылка подписчикам через Resend
     Шаблон: «{expertName} ответил на новый вопрос: {question}. Читать →»
   - Resend клиент (apps/worker/src/services/resend.ts):
     POST https://api.resend.com/emails с HTML-шаблоном

4. Реферальная программа (базовая):
   - В профиле эксперта: уникальная реферальная ссылка (neuroexpertise.ru/?ref={slug})
   - При регистрации по реферальной ссылке: сохраняется referrer в profiles (добавь поле referrer_id в миграции)
   - Логика «оба получают месяц Pro» — пока просто трекинг, начисление вручную

5. Финальная полировка:
   - 404 и error страницы (apps/web/app/not-found.tsx, error.tsx)
   - Loading states для всех страниц дашборда (loading.tsx)
   - Favicon и OG-изображение по умолчанию
   - PWA manifest (apps/web/public/manifest.json) — для мобильного доступа
   - Все TODO и заглушки — помечены комментарием // TODO: Phase X
   - .env.example полностью актуален

6. Docker: полная сборка и проверка:
   - docker-compose build — все 4 сервиса собираются без ошибок
   - docker-compose up — все сервисы стартуют
   - Healthcheck web: curl http://localhost:3000/api/health → 200
   - Nginx проксирует корректно

7. README.md:
   - Описание проекта
   - Быстрый старт (docker-compose up)
   - Переменные окружения
   - Структура проекта
   - Команды разработки
```

**Результат:**
- /scan показывает AI Visibility Scanner, результат доступен по /scan/{slug}
- Worker выполняет crosspost задачи
- Email-рассылки работают через Resend
- `docker-compose build` собирает все сервисы без ошибок
- `docker-compose up` запускает весь проект
- README.md описывает проект и быстрый старт
- Проект полностью готов к деплою на Coolify

---

## КАРТА ЗАВИСИМОСТЕЙ

```
ШАГ 1: Monorepo + инфраструктура
  ↓
ШАГ 2: БД (схема + миграции + seed)
  ↓
ШАГ 3: Auth + лендинг
  ↓
ШАГ 4: LLM/STT слой + аудит ──────────────────┐
  ↓                                              │
ШАГ 5: Telegram-бот (регистрация, голос)        │
  ↓                                              │
ШАГ 6: Генерация контента (Worker)              │
  ↓                                              │
ШАГ 7: Публичные страницы (SSR + Schema.org)    │
  ↓                                              │
ШАГ 8: Дашборд эксперта (ЛК)                   │
  ↓                                              │
ШАГ 9: Сбор спроса + поиск дыр (Worker) ←──────┘
  ↓
ШАГ 10: Оплата (ЮKassa)
  ↓
ШАГ 11: Трекинг цитирования + аналитика
  ↓
ШАГ 12: Scanner + кросспост + финализация
```

---

## ОЦЕНКА ВРЕМЕНИ

| Шаг | Описание | Часы |
|-----|----------|------|
| 1 | Monorepo + инфраструктура | 3–4 |
| 2 | БД: схема (15 таблиц), миграции, RLS, seed | 5–6 |
| 3 | Auth + лендинг | 4–6 |
| 4 | LLM/STT слой + аудит | 5–6 |
| 5 | Telegram-бот | 4–6 |
| 6 | Генерация контента (Worker + 5 форматов + валидация структуры) | 7–8 |
| 7 | Публичные страницы (SSR + Schema.org×5 + TL;DR + CWV) | 7–8 |
| 8 | Дашборд эксперта | 5–6 |
| 9 | Сбор спроса + поиск дыр + query fan-out | 6–8 |
| 10 | Оплата (ЮKassa) | 4–5 |
| 11 | Трекинг + аналитика + Content Freshness + CWV мониторинг | 6–8 |
| 12 | Scanner + кросспост + Bing Webmaster + финализация | 6–7 |
| **ИТОГО** | | **62–78 часов** |

При 6-часовом рабочем дне: **11–13 рабочих дней**.

---

*НейроЭксперт — AI-система, которая превращает экспертизу в клиентов · IMPLEMENTATION_PLAN v1.0 · Март 2026*
