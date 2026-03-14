# НейроЭксперт

> ВСЕГДА читай этот файл ПЕРВЫМ перед любой работой.
> После каждого шага — обнови статус.

Отвечай всегда на русском языке.

## MVP ЗАВЕРШЁН — ЗАДЕПЛОЕН НА PRODUCTION

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
| 12  | Scanner + финализация         | ✅     |
| 13  | Production deploy             | ✅     |

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

- Шаг 12: AI Visibility Scanner (/scan форма + /api/scan POST rate limit 3/час + /scan/[slug] SSR с OG-тегами), кросспост (crosspost.ts Дзен/Хабр + crosspost-social.ts Telegram/VK/отзовики + Telegram-уведомления), email-digest (send-email-digest.ts через Resend API батчами до 50), resend service (services/resend.ts), transcribe (STT → voice_recordings → generate_content job), optimize-images (sharp → WebP ≤ 150KB), миграция 009 (scan_results + referrer_id), реферальная программа (/?ref={slug} → localStorage → signUp metadata), loading.tsx для 7 дашборд-страниц, PWA manifest + /api/pwa-icon (192/512 динамическая генерация), favicon/apple-icon/OG-image (Next.js ImageResponse), README.md, .env.example актуален. Worker: 17 active handlers, 0 stubs. pnpm build OK.

- Шаг 13 (Deploy): Production на `155.212.185.216`, домен `neuroexpertise.ru`. Supabase self-hosted (PostgreSQL 15 + PostgREST + GoTrue Auth + Storage + Kong API Gateway). 8 Docker-контейнеров: supabase-db, supabase-rest, supabase-auth, supabase-storage, supabase-kong, web, bot, worker. Nginx reverse proxy (SSL Let's Encrypt), Supabase API через path `/supabase/`. Docker multi-stage builds (web.Dockerfile включает bot deps для webhook route). `scripts/generate-env.sh` (генерация JWT ключей anon/service_role), `scripts/deploy.sh` (автодеплой), `docker/supabase/init/00-roles.sh` (init DB ролей), `docker/supabase/kong.yml` (API gateway routing). LLM: OpenAI через HTTPS-прокси (РФ). Все 9 миграций применены, 20 ниш + 300 вопросов засеяны. Healthcheck: `curl -sk https://neuroexpertise.ru/api/health` → 200 OK.

## Остаётся сделать (post-deploy)

- [ ] Добавить DNS-запись `supabase.neuroexpertise.ru → 155.212.185.216` (пока API работает через path `/supabase/`)
- [ ] Перегенерировать API-ключи (OpenAI, Telegram) — были отправлены в чат
- [ ] Увеличить RAM сервера до 8 ГБ (сейчас 5.8 ГБ, свободно ~2 ГБ)
- [ ] Настроить SMTP для Supabase Auth (сейчас autoconfirm=true, magic link не отправляется)
- [ ] Установить pg_cron расширение в PostgreSQL (миграции 003 и 008 не применились — cron jobs можно запускать через worker)
- [ ] Подключить ЮKassa (YUKASSA_SHOP_ID + SECRET_KEY в .env)
- [ ] Подключить Resend (RESEND_API_KEY для email-рассылок)
- [ ] Подключить SerpAPI + XMLRiver (для сбора спроса)
- [ ] Подключить GSC / Яндекс.Вебмастер / Bing (для индексации)
- [ ] Пересгенерировать Database типы после миграции 009 (scan_results)

## Мониторинг AIO (еженедельно после публикации)

Запуск: `npx tsx --env-file=.env.local scripts/validate-aio.ts`

| Неделя | Страниц | Индексация | % цитирования | Заметки |
|--------|---------|------------|----------------|---------|
|        |         |            |                |         |

## Известные проблемы

- OpenAI API заблокирован по геолокации (РФ) — используется HTTP-прокси через undici ProxyAgent (OPENAI_PROXY_URL в .env)
- Next.js dev server в WSL слушает только localhost — добавлен флаг `-H 0.0.0.0` в package.json, доступ через IP WSL
- `.next` кэш периодически ломается при переключении build/dev — удалять `rm -rf apps/web/.next` перед запуском
- scan_results таблица не в generated Database типах — используется type assertion в API/SSR. Пересгенерировать типы после применения миграции 009
- pg_cron не установлен в self-hosted PostgreSQL (миграции 003, 008 не применились) — cron-задачи выполняются через worker
- Системный nginx на сервере занимает порты 80/443, Coolify Traefik не запускается — используем nginx vhost `/etc/nginx/sites-available/neuroexpertise.ru`
- Supabase Auth работает с `autoconfirm=true` (без SMTP) — magic link не отправляется, пользователи подтверждаются автоматически

## Production

- **Сервер:** `root@155.212.185.216` (3 CPU, 6 ГБ RAM, 60 ГБ NVMe)
- **Домен:** `neuroexpertise.ru` (SSL Let's Encrypt, auto-renew)
- **Проект:** `/opt/neuroexpert/`
- **Env:** `/opt/neuroexpert/.env` (НЕ коммитить!)
- **Nginx:** `/etc/nginx/sites-available/neuroexpertise.ru`
- **Docker compose:** `docker/docker-compose.prod.yml`
- **Supabase API:** `https://neuroexpertise.ru/supabase/` (Kong → PostgREST/GoTrue/Storage)
- **Контейнеры:** 8 шт (supabase-db, supabase-rest, supabase-auth, supabase-storage, supabase-kong, web, bot, worker)

## Шпаргалка

| Действие | Команда |
|----------|---------|
| Коммит + пуш | `git add -A && git commit -m "msg" && git push` |
| Dev web | `pnpm --filter web dev` |
| Dev bot | `pnpm --filter bot dev` |
| Dev worker | `pnpm --filter worker dev` |
| Build всё | `pnpm build` |
| Build shared | `pnpm --filter shared build` |
| Docker build (dev) | `docker-compose build` |
| Docker up (dev) | `docker-compose up -d` |
| Healthcheck (dev) | `curl http://localhost:3000/api/health` |
| Healthcheck (prod) | `curl -sk https://neuroexpertise.ru/api/health` |
| Prod deploy | `rsync ... && ssh root@155.212.185.216 "cd /opt/neuroexpert && docker compose -f docker/docker-compose.prod.yml --env-file .env build web && docker compose -f docker/docker-compose.prod.yml --env-file .env up -d web"` |
| Prod logs | `ssh root@155.212.185.216 "cd /opt/neuroexpert && docker compose -f docker/docker-compose.prod.yml --env-file .env logs -f web"` |
| Prod restart | `ssh root@155.212.185.216 "cd /opt/neuroexpert && docker compose -f docker/docker-compose.prod.yml --env-file .env restart web"` |
| Prod status | `ssh root@155.212.185.216 "cd /opt/neuroexpert && docker compose -f docker/docker-compose.prod.yml --env-file .env ps"` |
| Prod миграция | `ssh root@155.212.185.216 "docker exec -i docker-supabase-db-1 psql -U postgres -d postgres < packages/supabase/migrations/NNN.sql"` |
| Миграция push | `npx supabase db push --db-url $SUPABASE_DB_URL` |
| AIO мониторинг | `npx tsx --env-file=.env.local scripts/validate-aio.ts` |
| Тест audit API | `curl -X POST localhost:3000/api/audit -H "Content-Type: application/json" -d '{"niche_id":"...","type":"free"}'` |
| Откат коммита | `git reset --soft HEAD~1` |

## Советы

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
