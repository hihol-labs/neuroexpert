# ИНСТРУКЦИЯ: Работа с Claude Code для проекта НейроЭксперт

**AI-система, которая превращает экспертизу в клиентов.**

**Формат:** Промпты для Claude Code в VS Code. Копируй → вставляй → жди результат.
**Ключевое:** Позиционирование «клиенты из поиска и нейросетей». AIO+SEO с первого дня.

---

## ПОДГОТОВКА (один раз, вручную)

### 1. Создаём папку и репозиторий

```bash
mkdir -p ~/projects/neuroexpert
cd ~/projects/neuroexpert
git init
git remote add origin git@github.com:YOUR_USERNAME/neuroexpert.git
```

### 2. Кладём документы в docs/

```bash
mkdir docs
# Скопируй сюда:
# docs/PROJECT_ARCHITECTURE.md
# docs/НейроЭксперт_Единый.md
# docs/IMPLEMENTATION_PLAN.md
# docs/PRD.md
```

### 3. Создаём .gitignore

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
.next/
.turbo/
.env
.env.local
*.log
.DS_Store
.vscode/
EOF
```

### 4. Создаём Claude.md (память проекта)

```bash
cat > Claude.md << 'EOF'
# Claude.md — Состояние проекта НейроЭксперт

> ВСЕГДА читай этот файл ПЕРВЫМ перед любой работой.
> После каждого шага — обнови статус.

## Статус

| Шаг | Описание | Статус |
|-----|----------|--------|
| 1 | Monorepo + инфраструктура | ⬜ |
| 2 | БД: схема, миграции, RLS, seed | ⬜ |
| 3 | Auth + лендинг | ⬜ |
| 4 | LLM/STT слой + аудит | ⬜ |
| 5 | Telegram-бот | ⬜ |
| 6 | Генерация контента (Worker) | ⬜ |
| 7 | Публичные страницы (SSR + SEO) | ⬜ |
| 8 | Дашборд эксперта | ⬜ |
| 9 | Сбор спроса + поиск дыр | ⬜ |
| 10 | Оплата (ЮKassa) | ⬜ |
| 11 | Трекинг + аналитика | ⬜ |
| 12 | Scanner + финализация | ⬜ |

## Что работает

(обновляй после каждого шага)

## Проблемы

(записывай баги, workaround'ы)

## Мониторинг AIO (после шага 7, еженедельно)

| Неделя | Страниц | Индексация | % цитирования | Заметки |
|--------|---------|------------|----------------|---------|
| | | | | |
EOF
```

### 5. Первый коммит

```bash
git add -A
git commit -m "init: project skeleton, docs, Claude.md"
git push -u origin main
```

### 6. Запускаем Claude Code

```bash
code ~/projects/neuroexpert
# В терминале VS Code:
claude
```

---

## ШАГ 1: MONOREPO + ИНФРАСТРУКТУРА

```
Прочитай Claude.md, затем docs/PROJECT_ARCHITECTURE.md (разделы 3, 6, 7, 8).

Создай monorepo НейроЭксперт:

1. Root: turbo.json, pnpm-workspace.yaml, package.json
2. apps/web/ — Next.js 14+ (App Router) + Tailwind CSS, next.config.js с output: "standalone"
3. apps/bot/ — пока index.ts с console.log("Bot ready"), tsconfig (ES2022, NodeNext)
4. apps/worker/ — пока index.ts с console.log("Worker ready"), tsconfig (ES2022, NodeNext)
5. packages/shared/ — пустые: src/types/index.ts, src/llm/index.ts, src/transcription/index.ts, src/constants.ts
6. packages/supabase/ — пустые: migrations/, functions/, config.toml, seed.sql
7. docker/docker-compose.yml — сервисы web, bot, worker, nginx (по разделам 7.1–7.4)
8. docker/web.Dockerfile, bot.Dockerfile, worker.Dockerfile — multi-stage build
9. docker/nginx/nginx.conf — по разделу 8
10. .env.example — ВСЕ переменные из раздела 6 (с комментариями, значения пустые)

TypeScript strict mode во всех tsconfig.json.

Проверь:
- pnpm install
- pnpm --filter web dev → localhost:3000
- pnpm --filter shared build
```

После: `Обнови Claude.md (шаг 1 ✅). Закоммить и запуш: "step-1: monorepo, docker, infra"`

---

## ШАГ 2: БАЗА ДАННЫХ — СХЕМА, МИГРАЦИИ, RLS, SEED

```
Прочитай Claude.md, затем docs/PROJECT_ARCHITECTURE.md (разделы 4, 9.4).
Прочитай docs/НейроЭксперт_Единый.md (раздел 3.7 — 20 ниш).

Создай:

1. packages/supabase/migrations/001_initial_schema.sql — ВСЕ 15 таблиц из раздела 4 (включая sub_queries и cwv_metrics):
   profiles, niches, questions, orders, voice_recordings, content_packages,
   citation_checks, serp_positions, leads, payments, email_subscribers, jobs,
   sub_queries (query fan-out подзапросы), cwv_metrics (Core Web Vitals метрики)
   Все с UUID PK, индексами, CHECK-ограничениями — в точности по описанию.
   content_packages содержит AIO-поля: word_count, has_tldr, has_table, passage_count, last_refreshed_at, refresh_status.
   profiles содержит E-E-A-T поля: alumni_of, works_for, knows_about[], years_experience.

2. packages/supabase/migrations/002_rls_policies.sql — по разделу 9.4:
   profiles (свой + публичные), content_packages (владелец + published),
   leads (эксперт + anyone создаёт), orders (владелец), payments (владелец)

3. packages/supabase/migrations/003_cron_schedules.sql — по разделу 4.13:
   weekly-demand (пн 03:00), weekly-citations (ср 04:00), daily-sitemap (06:00),
   weekly-serp (чт 05:00), monthly-trust (1-е число 02:00),
   daily-freshness (07:00 — пометка статей >90 дней как needs_refresh),
   weekly-cwv (пт 03:00 — Core Web Vitals проверка)

4. packages/supabase/migrations/004_seed_niches.sql — 20 ниш:
   5 фокусных (is_focus=true): Психология, Юриспруденция, Нутрициология, Финансы, Бизнес-консалтинг
   15 расширение. Для каждой: name, slug, icon (emoji), seed_keywords (5–10 слов)

5. packages/supabase/migrations/005_seed_questions.sql — seed-вопросы для ВСЕХ 20 ниш:
   По 15–20 вопросов на нишу (~300–400 всего).
   Поля: question_text, niche_id, monthly_volume, gap_score (5–9), ai_response_chatgpt (краткий).
   Каждая ниша должна показывать живой аудит. Никаких «данные собираются».

6. packages/shared/src/types/database.ts — TypeScript-типы всех таблиц
   (формат Supabase: Database['public']['Tables']['profiles']['Row'])

7. packages/shared/src/constants.ts:
   NICHES (20 шт: id, name, slug, icon, isFocus),
   SUBSCRIPTION_TIERS (free/starter/pro/expert/business/enterprise с ценами),
   ORDER_STATUSES, CONTENT_STATUSES, LEAD_STATUSES, JOB_TYPES

Проверь:
- SQL файлы без синтаксических ошибок
- pnpm --filter shared build
```

После: `Обнови Claude.md (шаг 2 ✅). Закоммить и запуш: "step-2: db schema, rls, cron, seed 20 niches"`

---

## ШАГ 3: AUTH + ЛЕНДИНГ

```
Прочитай Claude.md, затем docs/PROJECT_ARCHITECTURE.md (раздел 9).
Прочитай docs/НейроЭксперт_Единый.md (раздел 1.2 — обещание).

Создай:

1. apps/web/lib/supabase/client.ts — browser client (@supabase/ssr)
2. apps/web/lib/supabase/server.ts — server client (SSR, cookies)
3. apps/web/lib/supabase/admin.ts — service_role client

4. apps/web/middleware.ts:
   Защищённые: /dashboard/*
   Публичные: /, /audit, /experts/*, /pricing, /scan/*, /login, /register, /api/*
   Неаутентифицированных → /login

5. apps/web/app/(auth)/login/page.tsx — email + magic link (signInWithOtp)
6. apps/web/app/(auth)/register/page.tsx — email + имя + выбор ниши → signUp
7. apps/web/app/auth/callback/route.ts — обработка magic link

8. packages/supabase/migrations/006_auth_trigger.sql — auth.users → auto-insert profiles

9. apps/web/app/(marketing)/page.tsx — лендинг:
   Hero: «Наговори 10 минут — получи клиентов из поиска и нейросетей. Без написания текстов, без SMM, без бюджета на рекламу.»
   Подзаголовок: «Мы находим вопросы, которые задают тысячи людей. Превращаем ваш голос в экспертный контент. Публикуем так, чтобы нейросети и поисковики его нашли.»
   Блок «Два канала»: нейросети цитируют + поисковики ранжируют
   3 шага: Находим вопрос → Наговариваете ответ → Получаете клиентов
   Блок «Для кого» (5 ниш), CTA: /audit, /login
   Дизайн: Tailwind, тёмный header, белый body, синий (#2563EB)

10. apps/web/app/layout.tsx — lang="ru", Inter, title "НейроЭксперт — AI-система, которая превращает экспертизу в клиентов"

Проверь:
- localhost:3000 → лендинг без ошибок
- /login → форма, magic link
- /register → создание пользователя
- /dashboard → редирект на /login (если не авторизован)
- pnpm build
```

После: `Обнови Claude.md (шаг 3 ✅). Закоммить и запуш: "step-3: auth, middleware, landing"`

---

## ШАГ 4: LLM/STT-СЛОЙ + АУДИТ

```
Прочитай Claude.md, затем docs/PROJECT_ARCHITECTURE.md (раздел 5).
Прочитай docs/НейроЭксперт_Единый.md (раздел 1.7 — маркеры дыр).

Создай:

1. packages/shared/src/llm/index.ts — интерфейс LLMProvider { generateText, generateJSON }
   + LLMOptions { model?, maxTokens?, temperature?, systemPrompt? }
   + createLLMProvider(provider) — фабрика, getLLM() — primary + fallback
2. packages/shared/src/llm/claude.ts — адаптер (@anthropic-ai/sdk)
3. packages/shared/src/llm/openai.ts — адаптер (openai sdk)
4. packages/shared/src/llm/yandexgpt.ts — адаптер (HTTP)
5. packages/shared/src/llm/gigachat.ts — адаптер (HTTP, OAuth2)
   Конфиг: LLM_PRIMARY_PROVIDER, LLM_FALLBACK_PROVIDER

6. packages/shared/src/transcription/index.ts — интерфейс STTProvider { transcribe }
7. packages/shared/src/transcription/whisper.ts — OpenAI Whisper
8. packages/shared/src/transcription/yandex-stt.ts — YandexSpeechKit v3
   Конфиг: STT_PRIMARY_PROVIDER, STT_FALLBACK_PROVIDER

9. packages/shared/src/prompts/gap-analysis.ts — SYSTEM_PROMPT + buildGapAnalysisPrompt(question, aiResponse)
   Маркеры: has_expert_name, has_specific_examples, has_source_link
10. packages/shared/src/prompts/filter.ts — SYSTEM_PROMPT_FILTER + buildFilterPrompt(questions[])

11. apps/web/app/(marketing)/audit/page.tsx:
    Выбор ниши из 20 (карточки, 5 фокусных выделены) →
    loading «Анализируем...» → 3 дыры: вопрос, частотность, gap_score, ответ AI.
    CTA: «Хочу занять эту позицию → Starter», «Начать бесплатно (Free)»
    Все 20 ниш показывают реальные дыры из seed-данных.

12. apps/web/app/api/audit/route.ts — POST {niche_id, type: 'free'|'paid'}
    Free: 3 вопроса из questions (gap_score DESC). Rate limit: 2/мин на IP.

Проверь:
- pnpm --filter shared build
- /audit → выбор ниши → 3 дыры с цифрами
- curl -X POST localhost:3000/api/audit -H "Content-Type: application/json" -d '{"niche_id":"...", "type":"free"}'
```

После: `Обнови Claude.md (шаг 4 ✅). Закоммить и запуш: "step-4: llm-stt layer, prompts, audit page"`

---

## ШАГ 5: TELEGRAM-БОТ

```
Прочитай Claude.md, затем docs/IMPLEMENTATION_PLAN.md раздел "ШАГ 5".

Создай:

1. apps/bot/src/bot.ts — grammY Bot, middleware (лог, error handler)
2. apps/bot/src/index.ts — webhook (TELEGRAM_WEBHOOK_URL) или polling (dev)
3. apps/bot/src/keyboards.ts — inline-клавиатуры

4. apps/bot/src/commands/start.ts — /start: новый → создаёт аккаунт (Supabase Admin), сохраняет telegram_id, приветствие + выбор ниши. /start {token} → привязка к аккаунту.
5. apps/bot/src/commands/orders.ts — /orders: заказы (pending, accepted) + кнопки [Принять][Пропустить]
6. apps/bot/src/commands/record.ts — /record: инструкция записать голосовое
7. apps/bot/src/commands/status.ts — /status: мини-дашборд

8. apps/bot/src/handlers/voice.ts — приём голосовых → скачивание → STT (shared) → voice_recordings → job (generate_content)
9. apps/bot/src/handlers/callback.ts — accept_order, skip_order, approve, edit

10. apps/web/app/api/webhooks/telegram/route.ts — POST, TELEGRAM_WEBHOOK_SECRET, grammY webhookCallback

Бот использует Supabase client с service_role key из packages/shared.

Проверь:
- pnpm --filter bot dev → бот стартует
- /start → приветствие + выбор ниши
- Голосовое → «Расшифровка готова, создаю контент...»
- pnpm build
```

После: `Обнови Claude.md (шаг 5 ✅). Закоммить и запуш: "step-5: telegram bot, voice, webhook"`

---

## ШАГ 6: ГЕНЕРАЦИЯ КОНТЕНТА — 5 ФОРМАТОВ

```
Прочитай Claude.md, затем docs/IMPLEMENTATION_PLAN.md раздел "ШАГ 6".

Создай:

1. packages/shared/src/content-structure.ts — ARTICLE_STRUCTURE_TEMPLATE:
   Экспортирует константы целевых параметров AIO-статьи:
   MIN_WORD_COUNT=2900, MAX_WORD_COUNT=3500, TLDR_WORDS=40–60,
   PASSAGE_MIN=6, PASSAGE_MAX=10, PASSAGE_WORDS=120–180,
   REQUIRED_TABLE=true, REQUIRED_NUMBERED_LIST=true, EXTERNAL_SOURCES=2–3

2. packages/shared/src/prompts/content-gen.ts:
   Системный: «Ты редактор. Структурируй расшифровку, сохраняя стиль. НЕ переписывай.»
   5 функций (transcript, expertName, questionText):
   - buildTelegramPostPrompt() → 1000–2000 символов
   - buildSeoArticlePrompt() → 18 000–22 000 символов (2 900–3 500 слов), TL;DR (40–60 слов), 6–10 H2/H3 блоков (120–180 слов), таблица, нумерованный список, 2–3 внешних источника
   - buildCardsPrompt() → JSON [{title, text}] — 5 тезисов
   - buildReelsScriptPrompt() → 60-сек сценарий
   - buildFaqPrompt() → JSON [{question, answer}] — 3–5 FAQ
   Каждый: «Выдели 2–3 цитаты эксперта», «Не добавляй информацию извне»

3. packages/shared/src/prompts/query-fanout.ts — buildQueryFanoutPrompt(question):
   «Разбей вопрос на 3–5 подзапросов, как это сделал бы ChatGPT Search при поиске ответа»

4. apps/worker/src/jobs/generate-content.ts — voice_id, expert_id → transcript → 5 форматов LLM → content_packages → **запускает validate-content** → status='review' → Telegram: «Контент готов! [✅][✏️]»

5. apps/worker/src/jobs/validate-content.ts — проверяет format_seo_article:
   - word_count ≥ 2900 (считает слова, записывает в content_packages.word_count)
   - has_tldr: первый абзац содержит TL;DR (40–60 слов)
   - has_table: есть markdown-таблица или <table>
   - passage_count: количество H2/H3 ≥ 6, средняя длина блока 120–180 слов
   Если валидация НЕ пройдена → повторный вызов LLM с указанием пробелов:
   «Статья не проходит валидацию: {список проблем}. Доработай: {конкретные указания}»
   Максимум 2 попытки доработки, потом status='review' с пометкой needs_manual_review=true.

6. apps/worker/src/index.ts + queue.ts — polling jobs (pending → processing → completed/failed), retry, WORKER_POLL_INTERVAL_MS=5000. Типы 'generate_content', 'validate_content' — реальные, остальные — заглушки.

7. apps/web/app/(dashboard)/content/new/page.tsx — Web Audio запись (MediaRecorder)
8. apps/web/app/api/voice/route.ts — audio → Supabase Storage → voice_recording → job

Проверь:
- pnpm --filter worker dev → Worker стартует
- Голосовое в Telegram → транскрипция → 5 форматов в content_packages
- content_packages.word_count ≥ 2900, has_tldr=true, has_table=true, passage_count ≥ 6
- /dashboard/content/new → запись в браузере
- pnpm build
```

После: `Обнови Claude.md (шаг 6 ✅). Закоммить и запуш: "step-6: content gen, worker queue, 5 formats, validation"`

---

## ШАГ 7: ПУБЛИКАЦИЯ — SSR, SCHEMA.ORG, SEO

```
Прочитай Claude.md, затем docs/PROJECT_ARCHITECTURE.md (раздел 10).

Создай:

1. apps/web/lib/schema-org.ts — generateArticleSchema, generateFAQSchema, generatePersonSchema (alumniOf, worksFor, knowsAbout), generateBreadcrumbSchema, generateHowToSchema → JSON-LD
2. apps/web/lib/seo.ts — generateMetadata → title, description, openGraph, canonical
3. apps/web/lib/content-validator.ts — validateContentStructure(article) → { word_count, has_tldr, has_table, passage_count }

4. apps/web/app/experts/[slug]/[articleSlug]/page.tsx — SSG/ISR:
   Хлебные крошки (BreadcrumbList), шапка эксперта (фото, квалификация, стаж, Expert Trust Score, число публикаций),
   H1=вопрос, **TL;DR блок (визуально выделенный, 40–60 слов)**, дата публикации + дата обновления,
   SEO-статья (markdown→HTML, **инлайн-рендеринг таблиц**), цитаты, аудиоплеер,
   **блок «Источники» (2–3 внешних авторитетных ссылки)**,
   FAQ-аккордеон, похожие вопросы, кнопка «Записаться» (форма: имя, контакт, тема),
   email-захват. JSON-LD: Article + FAQPage + Person + BreadcrumbList + HowTo (автодетекция).

5. apps/web/app/experts/[slug]/page.tsx — профиль эксперта (SSG/ISR), E-E-A-T блок: образование, место работы, области экспертизы, стаж
6. apps/web/app/experts/page.tsx — каталог экспертов, фильтры: ниша, город

7. apps/web/app/robots.ts — Allow / для GPTBot, ClaudeBot, PerplexityBot, YandexBot, Googlebot, bingbot
8. apps/web/app/sitemap.ts — динамический: published content + profiles

9. apps/web/app/api/leads/route.ts — POST → leads + Telegram-уведомление. Rate limit 5/мин.
10. apps/web/app/api/publish/route.ts — POST {content_id} → status='published', ISR revalidation,
    + создать задачу crosspost_social в очереди jobs,
    + отправить эксперту Telegram-уведомление с кнопками шеринга: «Поделитесь в первые 3 дня! [Шеринг в чаты] [Копировать пост]»
11. apps/bot/src/handlers/leads.ts — «Новая заявка! {name}, тема: {message} [Принять][Отклонить]»

Публичные страницы работают без аутентификации.
SSR без JS-зависимости: контент читаем без JavaScript.

Проверь:
- /experts → каталог
- /experts/{slug}/{articleSlug} → статья с TL;DR, таблицами, блоком «Источники», Schema.org (5 типов)
- /robots.txt содержит bingbot, /sitemap.xml → генерируются
- curl -X POST localhost:3000/api/leads -H "Content-Type: application/json" -d '{"expert_id":"...", "client_name":"Тест", "client_contact":"@test"}'
- pnpm build
```

После: `Обнови Claude.md (шаг 7 ✅). Закоммить и запуш: "step-7: public pages, schema.org, seo, leads"`

### Промпт 7.1 — Скрипт мониторинга AIO (один раз после шага 7)

```
Создай scripts/validate-aio.ts:
- Берёт published страницы из content_packages
- Для каждой: question_text → OpenAI API (ChatGPT) + YandexGPT API
- Проверяет: имя эксперта в ответе, URL, похожий контент
- Выводит: таблица [вопрос | ChatGPT | YandexGPT | цитируется?] + итоговый %

Добавь apps/web/app/api/health/route.ts:
- GET → 200, { status: 'ok', pages_published: N }

Запускать еженедельно: npx ts-node scripts/validate-aio.ts
Результаты → Claude.md таблица «Мониторинг AIO».
```

После: `Закоммить и запуш: "tools: aeo monitoring script"`

---

## ШАГ 8: ДАШБОРД ЭКСПЕРТА

```
Прочитай Claude.md, затем docs/IMPLEMENTATION_PLAN.md раздел "ШАГ 8".

Создай:

1. apps/web/app/(dashboard)/layout.tsx — sidebar (Дашборд, Заказы, Контент, Заявки, Аналитика, Профиль, Биллинг), auth guard, адаптивный

2. apps/web/app/(dashboard)/dashboard/page.tsx — карточки (опубликовано, заявки, Trust Score, тариф), последние 5 заказов + 5 заявок, CTA «Записать ответ»

3. apps/web/app/(dashboard)/orders/page.tsx — таблица заказов, [Принять и записать][Пропустить], фильтры

4. apps/web/app/(dashboard)/content/page.tsx — список контент-пакетов, статусы
5. apps/web/app/(dashboard)/content/[id]/page.tsx — 5 вкладок (Telegram, SEO, Карточки, Reels, FAQ), textarea, [Сохранить][Опубликовать][Удалить], предпросмотр, meta_title/description

6. apps/web/app/(dashboard)/leads/page.tsx — таблица заявок, [Принять][Отклонить], фильтры

7. apps/web/app/(dashboard)/profile/page.tsx — имя, slug, bio, квалификация, город, цена, аватар, привязка Telegram, is_published, предпросмотр.
   **E-E-A-T поля (редактируемые, → Schema.org Person + блок «Об авторе»):**
   - Образование (alumni_of): текстовое поле
   - Место работы (works_for): текстовое поле
   - Области экспертизы (knows_about): теги/чипсы
   - Стаж (years_experience): число

8. apps/web/components/ui/ — Button, Input, Card, Badge, Table

SSR через Supabase server client, интерактив через client. Tailwind CSS.

Проверь:
- /dashboard → метрики
- /dashboard/orders, /content, /leads, /profile — рендерятся
- pnpm build
```

После: `Обнови Claude.md (шаг 8 ✅). Закоммить и запуш: "step-8: expert dashboard"`

---

## ШАГ 9: СБОР СПРОСА + ПОИСК ДЫР

```
Прочитай Claude.md, затем docs/IMPLEMENTATION_PLAN.md раздел "ШАГ 9".

Создай:

1. apps/worker/src/services/wordstat.ts — fetchWordstat(keyword) → XMLRiver API, парсинг XML, фильтр volume >= 1000
2. apps/worker/src/services/serpapi.ts — fetchPAA(query) → People Also Ask
3. apps/worker/src/services/ai-prober.ts — probeAI(question, platform) → { response, hasExpertName, hasSpecificExamples, hasSourceLink } + LLM для gap_score (1–10)

4. apps/worker/src/jobs/collect-demand.ts — {niche_id} → seed_keywords → fetchWordstat → дедупликация → upsert questions → создаёт find_gaps
5. apps/worker/src/jobs/find-gaps.ts — топ-50 → LLM-фильтрация → **expand-query (query fan-out: разбивка на 3–5 подзапросов, сохранение в sub_queries)** → probeAI × 1–3 платформы → gap_score → создаёт generate_orders
6. apps/worker/src/jobs/expand-query.ts — {question_id} → LLM prompt: «Разбей вопрос на 3–5 подзапросов, как ChatGPT Search» → upsert sub_queries
7. apps/worker/src/jobs/generate-orders.ts — для каждого эксперта (tier != 'free') → топ-10 по gap_score → orders (pending, +7 дней) → Telegram: «Новые заказы!» + подзапросы: «Люди также спрашивают: ...»

pg_cron из шага 2 создаёт collect_demand каждый понедельник.

Проверь:
- Worker обрабатывает collect_demand, find_gaps, generate_orders
- Эксперт видит заказы в /orders и через /orders в боте
- pnpm build
```

После: `Обнови Claude.md (шаг 9 ✅). Закоммить и запуш: "step-9: demand collection, gap finder, orders"`

---

## ШАГ 10: ОПЛАТА — ЮKASSA

```
Прочитай Claude.md, затем docs/НейроЭксперт_Единый.md (раздел 9.1 — тарифы).

Создай:

1. ЮKassa SDK или HTTP: разовый (POST /v3/payments), рекуррент (save_payment_method), автопродление

2. apps/web/app/(marketing)/pricing/page.tsx — 4 карточки тарифов.
   Текст на карточках — ПОНЯТНЫЙ ОБЫЧНОМУ ЧЕЛОВЕКУ, без технических терминов:

   FREE (0₽/мес):
     Заголовок: «Попробуйте бесплатно. Платите только когда зарабатываете.»
     • Каждую неделю — 3 вопроса, которые задают тысячи людей в вашей теме
     • Вы наговариваете ответ (3–10 мин) — система создаёт статью + пост + карточки + скрипт для видео + блок «вопрос-ответ»
     • Публикации без ограничений — каждая страница с кнопкой «Записаться к вам»
     • Клиент записался — вы получаете 85%, платформа 15%
     CTA: «Начать бесплатно»

   STARTER (1 490₽/мес):
     Заголовок: «Больше тем — больше клиентов. Комиссия ниже.»
     • Всё из Free
     • 10 подобранных вопросов в неделю вместо 3
     • Публикации без ограничений
     • Комиссия снижена до 7% (вы получаете 93%)
     CTA: «Подписаться»

   PRO (2 990₽/мес):
     Заголовок: «Ваши статьи видят везде. Система продвигает вас сама.»
     • Всё из Starter
     • Вопросов без ограничений
     • Статьи размещаются на Дзен, Хабр, Яндекс Кью, отзовиках
     • Система помогает распространить каждую статью в первые 3 дня
     • Напоминания об обновлении статей каждые 3 месяца
     • Комиссия всего 3% (вы получаете 97%)
     CTA: «Подписаться»

   EXPERT (4 990₽/мес):
     Заголовок: «Вы видите всю картину. Все деньги от клиентов — ваши.»
     • Всё из Pro
     • Видите, цитируют ли вас нейросети — и по каким запросам
     • Какой % ответов ваш, а какой у конкурентов
     • Какие сайты нейросети используют в вашей теме
     • Публичный рейтинг экспертности
     • Подсказки: «По запросу X отвечает Мария — у вас есть шанс»
     • Комиссия 0% — все деньги от клиентов ваши
     CTA: «Подписаться»

   Под карточками — СРАВНИТЕЛЬНАЯ ТАБЛИЦА ТАРИФОВ (обязательно!):
     Строки: Цена | Комиссия с клиентов | Вопросов в неделю | Публикации |
     5 форматов контента | Кнопка «Записаться» | Размещение на площадках |
     Помощь с распространением | Напоминания об обновлении |
     Видите цитирование нейросетями | % ответов vs конкуренты |
     Источники нейросетей | Рейтинг экспертности | Подсказки по конкурентам
     Столбцы: Free / Starter / Pro / Expert
     Значения: да / — / цифры / «без ограничений»
     Таблица наглядно показывает отличия тарифов.

   2 B2B: Бизнес (24 990₽), Enterprise (99 990₽ — «Связаться»).
   Внизу блок: «Одна консультация = 3 000–5 000₽. Подписка окупается с первого клиента.»
   CTA: Free → «Начать бесплатно», Starter+ → «Подписаться»

3. apps/web/app/api/webhooks/yukassa/route.ts — POST, YUKASSA_WEBHOOK_SECRET. payment.succeeded → audit/subscription. Сохраняет в payments.

4. apps/web/app/(dashboard)/billing/page.tsx — подписка, [Сменить][Отменить], история

5. Middleware подписок: проверка tier → лимиты:
     - Free: 3 вопроса/нед, публикации без ограничений, комиссия 15%
     - Starter: 10 вопросов/нед, публикации без ограничений, комиссия 7%
     - Pro: вопросы и публикации без ограничений, размещение на площадках, помощь с распространением, напоминания об обновлении, комиссия 3%
     - Expert: всё из Pro + видит цитирование нейросетями, % ответов vs конкуренты, анализ источников, рейтинг экспертности, конкурентный анализ, комиссия 0%
   При превышении лимита — показ апгрейд-предложения с расчётом экономии на комиссии

Проверь:
- /pricing → тарифы
- Webhook принимает POST
- /dashboard/billing → рендерится
- pnpm build
```

После: `Обнови Claude.md (шаг 10 ✅). Закоммить и запуш: "step-10: yukassa payments, subscriptions"`

---

## ШАГ 11: ТРЕКИНГ ЦИТИРОВАНИЯ + АНАЛИТИКА

```
Прочитай Claude.md, затем docs/IMPLEMENTATION_PLAN.md раздел "ШАГ 11".

Создай:

1. apps/worker/src/jobs/track-citations.ts — {expert_id} → published content → probeAI → имя/URL/similarity → citation_checks. **+ Share of Voice:** считать % ответов с упоминанием эксперта vs конкуренты. Еженедельно (ср 04:00).
2. apps/worker/src/jobs/track-serp.ts — позиции Яндекс/Google через SerpAPI → serp_positions
3. apps/worker/src/jobs/calculate-trust-score.ts — (citations×2 + position×1.5 + content×1 + leads×3) / max × 100 → profiles.trust_score
4. apps/worker/src/jobs/submit-sitemap.ts — GSC urlInspection + Яндекс.Вебмастер recrawl + **Bing Webmaster Tools** API. Ежедневно.
5. apps/worker/src/jobs/refresh-content.ts — помечает статьи старше 90 дней → refresh_status='needs_refresh' → Telegram: «Обновите статью?»
6. apps/worker/src/jobs/check-cwv.ts — PageSpeed Insights API → cwv_metrics (LCP, FCP, CLS). Алерты при ухудшении. Еженедельно (пт 03:00).
7. apps/worker/src/services/bing-webmaster.ts — Bing Webmaster Tools API client
8. apps/worker/src/services/pagespeed.ts — Google PageSpeed Insights API client

9. apps/web/app/(dashboard)/analytics/page.tsx:
   Trust Score (число + прогресс), **Share of Voice** (% vs конкуренты),
   график цитирований (Recharts LineChart), **Core Web Vitals дашборд** (LCP, FCP, CLS по страницам),
   **Content Freshness**: список статей, требующих обновления,
   таблица: статья → ✅/❌ по платформам, SERP-позиции, заявки за 30 дней,
   **визуализация источников:** какие домены LLM цитируют по запросам ниши,
   рекомендации: «Обновите ответ на X», «Запишите Y — gap_score 9»

6. apps/web/app/api/email-subscribe/route.ts — POST → email_subscribers

Установи recharts в apps/web.

Проверь:
- /dashboard/analytics → графики, таблицы
- pnpm build
```

После: `Обнови Claude.md (шаг 11 ✅). Закоммить и запуш: "step-11: citation tracker, trust score, analytics"`

---

## ШАГ 12: SCANNER + КРОССПОСТ + ФИНАЛИЗАЦИЯ

```
Прочитай Claude.md, затем docs/IMPLEMENTATION_PLAN.md раздел "ШАГ 12".

Создай:

1. apps/web/app/(marketing)/scan/page.tsx — форма «Введите имя/бренд» → /api/scan
   apps/web/app/api/scan/route.ts — прогон через ChatGPT, Perplexity, YandexGPT → % видимости
   apps/web/app/(marketing)/scan/[slug]/page.tsx — SSR: «{Имя} — AI Visibility: 2%»
   OG мета-теги для шеринга. Rate limit: 3/час. CTA → /register

2. apps/worker/src/jobs/crosspost.ts — для Pro+, адаптация для Дзен/vc.ru, canonical на neuroexpertise.ru
2a. apps/worker/src/jobs/crosspost-social.ts — размещение на Яндекс Кью (шаблон экспертного ответа со ссылкой), отзовики, шеринг в тематические Telegram-чаты. Триггерится при публикации статьи.

3. apps/worker/src/jobs/send-email-digest.ts — публикация → рассылка через Resend
4. apps/worker/src/services/resend.ts — POST api.resend.com/emails

5. Реферальная: /?ref={slug} → referrer_id в profiles (миграция)

6. apps/web/app/not-found.tsx, error.tsx
7. Loading states (loading.tsx) для дашборд-страниц
8. Favicon, OG-изображение, PWA manifest
9. Все заглушки → // TODO: Phase X
10. .env.example актуален

11. Docker: docker-compose build → 4 сервиса без ошибок, docker-compose up → healthcheck 200

12. README.md: описание, быстрый старт, env, структура, команды

Проверь:
- /scan → Scanner, /scan/{slug} → результат
- docker-compose build && docker-compose up
- curl http://localhost:3000/api/health → 200
```

После:
```bash
# Обнови Claude.md (все шаги ✅, «MVP ЗАВЕРШЁН»)
git add -A && git commit -m "step-12: scanner, crosspost, polish, docker" && git push
git tag v1.0.0-mvp && git push --tags
```

---

## ШПАРГАЛКА

| Действие | Команда |
|----------|---------|
| Коммит + пуш | `git add -A && git commit -m "msg" && git push` |
| Dev web | `pnpm --filter web dev` |
| Dev bot | `pnpm --filter bot dev` |
| Dev worker | `pnpm --filter worker dev` |
| Build всё | `pnpm build` |
| Build shared | `pnpm --filter shared build` |
| Docker build | `docker-compose build` |
| Docker up | `docker-compose up -d` |
| Docker logs | `docker-compose logs -f web` |
| Docker restart | `docker-compose restart web` |
| Docker down | `docker-compose down` |
| Docker rebuild | `docker-compose build --no-cache` |
| Healthcheck | `curl http://localhost:3000/api/health` |
| Миграция push | `npx supabase db push --db-url $SUPABASE_DB_URL` |
| Миграция diff | `npx supabase db diff -f migration_name` |
| Миграция reset | `npx supabase db reset` |
| AIO мониторинг | `npx ts-node scripts/validate-aio.ts` |
| Тест audit API | `curl -X POST localhost:3000/api/audit -H "Content-Type: application/json" -d '{"niche_id":"...","type":"free"}'` |
| Откат коммита | `git reset --soft HEAD~1` |
| Починить ошибку | `Вот ошибка: [лог]. Исправь.` |
| Не забегай | `Стоп. Только шаг N. Не забегай вперёд.` |

---

## ТАЙМИНГ

```
НЕДЕЛЯ 1:   Шаг 1-3    ~12-16ч
НЕДЕЛЯ 2:   Шаг 4-6    ~17-20ч  (генерация контента усложнена: валидация, content-structure)
НЕДЕЛЯ 3:   Шаг 7-9    ~18-24ч  (Schema.org×5, TL;DR, E-E-A-T, query fan-out, CWV)
НЕДЕЛЯ 4:   Шаг 10-12  ~16-19ч  (CWV мониторинг, Content Freshness, crosspost-social, Bing)
ИТОГО: ~62-78 часов
```

---

## СОВЕТЫ

1. **Claude.md — читай первым.** Одна строка в начале промпта. Обновляй после шага (✅ + что работает).
2. **Не забегай.** Claude Code начал шаг 5, а ты на 3? → «Стоп. Только шаг 3.»
3. **pnpm build после каждого шага.** Не собирается — не коммить.
4. **20 ниш = живые.** Каждая показывает реальные дыры. Никаких «данные собираются».
5. **AIO ≠ единственное обещание.** «Клиенты из поиска И нейросетей». SEO — полноценный канал.
6. **Мониторинг AIO — фоном.** После шага 7: `validate-aio.ts` раз в неделю. Не блокирует.
7. **Seed-данные ~400₽.** 300–400 вопросов для 20 ниш. Не экономь.
8. **Статья ≥ 2900 слов — обязательно.** Данные SE Ranking: +60% цитирований. validate-content.ts не пропустит короткие.
9. **TL;DR — первый абзац.** Featured Snippets мигрируют в ChatGPT почти 100%. Не пропускай.
10. **CWV: FCP < 0.4 сек.** Проверяй после шага 7. Медленная страница = -3x цитирований.
11. **Первые 72 часа после публикации — критичны.** Шеринг в Telegram-чаты создаёт поведенческие факторы. Не откладывай crosspost_social.
