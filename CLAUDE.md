# НейроЭксперт

> ВСЕГДА читай этот файл ПЕРВЫМ перед любой работой.
> После каждого шага — обнови статус.

Отвечай всегда на русском языке.

## Стек

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 14 (App Router), React, TailwindCSS
- **Telegram-бот:** grammY, webhook + polling mode
- **Worker:** Node.js, polling таблицы jobs из Supabase
- **БД:** Supabase self-hosted (PostgreSQL 15+, Auth, Storage)
- **LLM:** абстрактный слой (Claude primary, OpenAI fallback) — `packages/shared/src/llm/`
- **STT:** абстрактный слой (Whisper primary, YandexSTT fallback) — `packages/shared/src/transcription/`
- **Язык:** TypeScript strict mode во всех пакетах

## Структура

```text
apps/
  web/       — Next.js фронтенд
  bot/       — Telegram-бот (grammY)
  worker/    — Background jobs worker
packages/
  shared/    — типы, LLM, STT, промпты, константы
  supabase/  — миграции, seed
```

## Правила

- SQL-миграции: `packages/supabase/migrations/` с порядковой нумерацией
- Общие типы и утилиты: `packages/shared/`
- `.env.local` в корне — локальные переменные
- Бот использует Supabase client с service_role key

## Статус

| Шаг | Описание                      | Статус |
|-----|-------------------------------|--------|
| 1   | Monorepo + инфраструктура     | ✅     |
| 2   | БД: схема, миграции, RLS, seed | ✅     |
| 3   | Auth + лендинг                | ✅     |
| 4   | LLM/STT слой + аудит         | ✅     |
| 5   | Telegram-бот                  | ✅     |
| 6   | Генерация контента (Worker)   | ✅     |
| 7   | Публичные страницы (SSR + SEO) | ✅     |
| 8   | Дашборд эксперта              | ✅     |
| 9   | Сбор спроса + поиск дыр       | ✅     |
| 10  | Оплата (ЮKassa)               | ✅     |
| 11  | Трекинг + аналитика           | ✅     |
| 12  | Scanner + финализация         | ⬜     |

## Что работает

- Шаг 1: Monorepo (turbo + pnpm), apps/web (Next.js 14 + Tailwind), apps/bot, apps/worker, packages/shared, packages/supabase, docker (compose + Dockerfiles + nginx), .env.example
- Шаг 2: 15 таблиц (001), RLS (002), pg_cron (003), 20 ниш (004), 300 seed-вопросов (005), TypeScript-типы (database.ts), константы (constants.ts)
- Шаг 3: Supabase clients (browser/server/admin), middleware (dashboard protected), auth pages (login magic link, register + niche select), auth callback, auth trigger (006), лендинг (hero, 2 канала, 3 шага, 20 ниш, CTA с воронкой на аудит)
- Шаг 4: LLM-слой (Claude, OpenAI, YandexGPT, GigaChat) с фабрикой + fallback, STT-слой (Whisper, Yandex SpeechKit), промпты (gap-analysis с 4 маркерами, filter), аудит-страница (выбор 20 ниш → loading → мультиплатформенная таблица сравнения с раскрытием по клику → CTA), API /api/audit (POST, rate limit 2/мин, real-time запросы к AI через прокси, поддержка ChatGPT/Perplexity/YandexGPT/GigaChat), error/not-found страницы, страница-заглушка /pricing
- Шаг 5: Telegram-бот (grammY), команды (/start регистрация + привязка, /orders заказы с кнопками, /record инструкция, /status дашборд), голосовые сообщения (скачивание → STT → voice_recordings → job generate_content), callback-хендлеры (accept/skip/approve/edit), webhook endpoint (Next.js API route), Supabase service_role клиент
- Шаг 6: Worker polling loop (5 сек, retry до 3 раз), generate_content (5 параллельных LLM-вызовов → telegram post, SEO-статья 2900+ слов, карточки, Reels-сценарий, FAQ), validate_content (проверка word_count/TL;DR/таблица/passage_count, автодоработка LLM до 2 раз), generate_orders (по нишам + subscription tier), content-structure.ts (AIO-параметры), 5 промптов content-gen.ts, query-fanout.ts, Web Audio запись (/content/new), /api/voice route, миграции (007_expert_niches, 008_cron_generate_orders)
- Шаг 7: Публичные SSR-страницы (/experts каталог с фильтрами, /experts/[slug] профиль с E-E-A-T, /experts/[slug]/[articleSlug] статья с TL;DR + таблицы + FAQ-аккордеон + источники + аудиоплеер + форма заявки), Schema.org JSON-LD (Article + Person + FAQPage + BreadcrumbList + HowTo автодетекция), SEO (meta, OG, canonical), robots.ts (GPTBot/ClaudeBot/PerplexityBot/YandexBot/Googlebot/bingbot), sitemap.ts (динамический), /api/leads (POST + rate limit 5/мин + Telegram-уведомление с кнопками), /api/publish (status→published + ISR revalidation + crosspost_social job + sharing notification), bot leads handler (accept/reject lead)

- Шаг 8: Dashboard layout (sidebar + mobile hamburger + auth guard), /dashboard (метрики: опубликовано, заявки, Trust Score, тариф + последние 5 заказов/заявок + CTA), /orders (таблица с фильтрами + accept/skip), /content (список пакетов со статусами), /content/[id] (5 вкладок: Telegram/SEO/Cards/Reels/FAQ + meta_title/description + save/publish/delete), /leads (таблица с фильтрами), /profile (основная инфо + E-E-A-T: alumni_of/works_for/knows_about теги/years_experience + Telegram привязка + is_published). UI компоненты: Button, Input, Textarea, Card, Badge, Table.

- Шаг 9: Сбор спроса (wordstat.ts XMLRiver API + serpapi.ts PAA), ai-prober.ts (probe AI с маркерами + LLM gap_score), collect-demand (seed_keywords → Wordstat → upsert questions → find_gaps), find-gaps (LLM фильтрация → probeAI × 2 платформы → gap_score → generate_orders), expand-query (LLM query fanout → sub_queries), generate-orders (по tier → orders + Telegram «Новые заказы!» + подзапросы)

- Шаг 10: ЮKassa интеграция (lib/yukassa.ts HTTP клиент, lib/subscription.ts tier config + лимиты + комиссии), /pricing (4 карточки с понятным текстом + сравнительная таблица 14 строк + B2B + ROI блок), /api/webhooks/yukassa (payment.succeeded/canceled/refund → payments + subscription update), /api/subscribe (create payment + save_payment_method), /billing (текущий тариф + upgrade/downgrade + история платежей)

- Шаг 11: track-citations (probeAI → citation_checks + Share of Voice), track-serp (SerpAPI → serp_positions), calculate-trust-score (формула citations×2 + position×1.5 + content×1 + leads×3), submit-sitemap (GSC + Yandex Webmaster + Bing), refresh-content (>90 дней → needs_refresh + Telegram), check-cwv (PageSpeed API → cwv_metrics + алерты), services/bing-webmaster + pagespeed. /analytics (Trust Score + Share of Voice + Recharts LineChart цитирования + CWV таблица + цитирование по статьям + рекомендации), /api/email-subscribe. Worker: 12 active handlers, 5 stubs.

## Мониторинг AIO (еженедельно после публикации)

Запуск: `npx tsx --env-file=.env.local scripts/validate-aio.ts`

| Неделя | Страниц | Индексация | % цитирования | Заметки |
|--------|---------|------------|----------------|---------|
|        |         |            |                |         |

## Известные проблемы

- OpenAI API заблокирован по геолокации (РФ) — используется HTTP-прокси через undici ProxyAgent (OPENAI_PROXY_URL в .env.local)
- Next.js dev server в WSL слушает только localhost — добавлен флаг `-H 0.0.0.0` в package.json, доступ через IP WSL
- `.next` кэш периодически ломается при переключении build/dev — удалять `rm -rf apps/web/.next` перед запуском
