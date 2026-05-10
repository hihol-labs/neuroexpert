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
- **LLM:** абстрактный слой (Codex primary, OpenAI fallback) — `packages/shared/src/llm/`
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
| 14  | Маркетинговый лендинг         | ✅     |
| 15  | Marketplace + B2B + Knowledge API | ✅     |
| 16  | Citation Network + Knowledge Graph + API Licensing | ✅     |

## Что работает

- Шаг 1: Monorepo (turbo + pnpm), apps/web (Next.js 14 + Tailwind), apps/bot, apps/worker, packages/shared, packages/supabase, docker (compose + Dockerfiles + nginx), .env.example
- Шаг 2: 15 таблиц (001), RLS (002), pg_cron (003), 20 ниш (004), 300 seed-вопросов (005), TypeScript-типы (database.ts), константы (constants.ts)
- Шаг 3: Supabase clients (browser/server/admin), middleware (dashboard protected), auth pages (login magic link, register + niche select), auth callback, auth trigger (006), лендинг (hero, 2 канала, 3 шага, 20 ниш, CTA с воронкой на аудит)
- Шаг 4: LLM-слой (Codex, OpenAI, YandexGPT, GigaChat) с фабрикой + fallback, STT-слой (Whisper, Yandex SpeechKit), промпты (gap-analysis с 4 маркерами, filter), аудит-страница (выбор 20 ниш → loading → мультиплатформенная таблица сравнения с раскрытием по клику → CTA), API /api/audit (POST, rate limit 2/мин, real-time запросы к AI через прокси, поддержка ChatGPT/Perplexity/YandexGPT/GigaChat), error/not-found страницы, страница-заглушка /pricing
- Шаг 5: Telegram-бот (grammY), команды (/start регистрация + привязка, /orders заказы с кнопками, /record инструкция, /status дашборд), голосовые сообщения (скачивание → STT → voice_recordings → job generate_content), callback-хендлеры (accept/skip/approve/edit), webhook endpoint (Next.js API route), Supabase service_role клиент
- Шаг 6: Worker polling loop (5 сек, retry до 3 раз), generate_content (5 параллельных LLM-вызовов → telegram post, SEO-статья 2900+ слов, карточки, Reels-сценарий, FAQ), validate_content (проверка word_count/TL;DR/таблица/passage_count, автодоработка LLM до 2 раз), generate_orders (по нишам + subscription tier), content-structure.ts (AIO-параметры), 5 промптов content-gen.ts, query-fanout.ts, Web Audio запись (/content/new), /api/voice route, миграции (007_expert_niches, 008_cron_generate_orders)
- Шаг 7: Публичные SSR-страницы (/experts каталог с фильтрами, /experts/[slug] профиль с E-E-A-T, /experts/[slug]/[articleSlug] статья с TL;DR + таблицы + FAQ-аккордеон + источники + аудиоплеер + форма заявки), Schema.org JSON-LD (Article + Person + FAQPage + BreadcrumbList + HowTo автодетекция), SEO (meta, OG, canonical), robots.ts (GPTBot/ClaudeBot/PerplexityBot/YandexBot/Googlebot/bingbot), sitemap.ts (динамический), /api/leads (POST + rate limit 5/мин + Telegram-уведомление с кнопками), /api/publish (status→published + ISR revalidation + crosspost_social job + sharing notification), bot leads handler (accept/reject lead)

- Шаг 8: Dashboard layout (sidebar + mobile hamburger + auth guard), /dashboard (метрики: опубликовано, заявки, Trust Score, тариф + последние 5 заказов/заявок + CTA), /orders (таблица с фильтрами + accept/skip), /content (список пакетов со статусами), /content/[id] (5 вкладок: Telegram/SEO/Cards/Reels/FAQ + meta_title/description + save/publish/delete), /leads (таблица с фильтрами), /profile (основная инфо + E-E-A-T: alumni_of/works_for/knows_about теги/years_experience + Telegram привязка + is_published). UI компоненты: Button, Input, Textarea, Card, Badge, Table.

- Шаг 9: Сбор спроса (wordstat.ts XMLRiver API + serpapi.ts PAA), ai-prober.ts (probe AI с маркерами + LLM gap_score), collect-demand (seed_keywords → Wordstat → upsert questions → find_gaps), find-gaps (LLM фильтрация → probeAI × 2 платформы → gap_score → generate_orders), expand-query (LLM query fanout → sub_queries), generate-orders (по tier → orders + Telegram «Новые заказы!» + подзапросы)

- Шаг 10: ЮKassa интеграция (lib/yukassa.ts HTTP клиент, lib/subscription.ts tier config + лимиты + комиссии), /pricing (4 карточки с понятным текстом + сравнительная таблица 14 строк + B2B + ROI блок), /api/webhooks/yukassa (payment.succeeded/canceled/refund → payments + subscription update), /api/subscribe (create payment + save_payment_method), /billing (текущий тариф + upgrade/downgrade + история платежей)

- Шаг 11: track-citations (probeAI → citation_checks + Share of Voice), track-serp (SerpAPI → serp_positions), calculate-trust-score (формула citations×2 + position×1.5 + content×1 + leads×3), submit-sitemap (GSC + Yandex Webmaster + Bing), refresh-content (>90 дней → needs_refresh + Telegram), check-cwv (PageSpeed API → cwv_metrics + алерты), services/bing-webmaster + pagespeed. /analytics (Trust Score + Share of Voice + Recharts LineChart цитирования + CWV таблица + цитирование по статьям + рекомендации), /api/email-subscribe. Worker: 12 active handlers, 5 stubs.

- Шаг 12: AI Visibility Scanner (/scan форма + /api/scan POST rate limit 3/час + /scan/[slug] SSR с OG-тегами), кросспост (crosspost.ts Дзен/Хабр + crosspost-social.ts Telegram/VK/отзовики + Telegram-уведомления), email-digest (send-email-digest.ts через Resend API батчами до 50), resend service (services/resend.ts), transcribe (STT → voice_recordings → generate_content job), optimize-images (sharp → WebP ≤ 150KB), миграция 009 (scan_results + referrer_id), реферальная программа (/?ref={slug} → localStorage → signUp metadata), loading.tsx для 7 дашборд-страниц, PWA manifest + /api/pwa-icon (192/512 динамическая генерация), favicon/apple-icon/OG-image (Next.js ImageResponse), README.md, .env.example актуален. Worker: 17 active handlers, 0 stubs. pnpm build OK.

- Шаг 13 (Deploy): Production на `155.212.185.216`, домен `neuroexpertise.ru`. Supabase self-hosted (PostgreSQL 15 + PostgREST + GoTrue Auth + Storage + Kong API Gateway). 8 Docker-контейнеров: supabase-db, supabase-rest, supabase-auth, supabase-storage, supabase-kong, web, bot, worker. Coolify Traefik v3.6 reverse proxy (SSL Let's Encrypt, конфиг `/traefik/dynamic/neuroexpertise.yaml`), Supabase API через path `/supabase/`. Docker-compose: web и supabase-kong подключены к внешней сети `coolify` для доступа из Traefik. Docker multi-stage builds (web.Dockerfile включает bot deps для webhook route). `scripts/generate-env.sh` (генерация JWT ключей anon/service_role), `scripts/deploy.sh` (автодеплой через rsync), `docker/supabase/init/00-roles.sh` (init DB ролей), `docker/supabase/kong.yml` (API gateway routing). LLM: OpenAI через HTTPS-прокси (РФ). Все 9 миграций применены, 20 ниш + 300 вопросов засеяны. Healthcheck: `curl -sk https://neuroexpertise.ru/api/health` → 200 OK.

- Шаг 14 (Лендинг): Новый маркетинговый сайт — marketing layout (`apps/web/app/(marketing)/layout.tsx`) с навигацией (`components/marketing/nav.tsx`), нейросетевой анимацией фона (`components/marketing/neural-bg.tsx`). Переделана главная страница (hero, USP, шаги, ниши, CTA). Новые страницы: /for-experts (для экспертов), /how-it-works (как это работает). Обновлены /pricing, /audit, /scan. Тёмная тема: login page с neural background, audit page glassmorphism redesign, навигация со scroll-aware фоном и улучшенным мобильным меню. Лого-концепты (3 варианта SVG/PNG). Задеплоено на production.

- Шаг 15 (Marketplace + B2B + Knowledge API):
  - **Marketplace**: продвинутые фильтры каталога (поиск по имени/квалификации, сортировка по 5 параметрам, фильтры по опыту/Trust Score), отзывы и рейтинги (таблица reviews + триггер пересчёта avg_rating + API + форма), верификация экспертов (badge ✓ на аватаре/профиле), сравнение экспертов (/compare side-by-side таблица + чекбоксы + CompareBar), трекинг заявок (/track/[token] с timeline статусов), booking/запись к эксперту (таблица bookings + expert_schedule + API слотов + BookingForm), smart matching (/find-expert + /api/match с формулой ранжирования), премиум-плейсмент (платные тарифы +5..25 баллов), рекомендуемые эксперты (is_featured + секция на каталоге), оплата консультации клиентом (/api/pay-consultation через ЮKassa с автокомиссией по тарифу).
  - **B2B**: лендинг /for-business (тёмная тема, 6 преимуществ, 10 отраслей, тарифы Business/Enterprise, форма заявки → Telegram), API /api/b2b-leads, B2B-дашборд /team (управление командой экспертов, invite/remove по email, сводные метрики), AI Visibility Scanner с режимом сравнения (вы vs конкурент по 3 платформам).
  - **Knowledge API**: публичные JSON-эндпоинты /api/v1/experts и /api/v1/articles (фильтры, пагинация), управление API-ключами /api-keys (генерация ne_..., SHA-256, rate limit per key, макс. 5), OpenAPI 3.0 документация /api/v1/docs, аутентификация Bearer/query.
  - **AI probing**: расширен до 4 платформ (ChatGPT, YandexGPT, GigaChat, Perplexity), 4-й маркер has_specific_numbers (8 regex-паттернов), функция queryPerplexity (прямой вызов Perplexity API).
  - **Кросспост**: добавлен vc.ru (api.vc.ru/v2.8).
  - **Аналитика**: Яндекс.Метрика (tag.js + webvisor + trackHash) через NEXT_PUBLIC_YANDEX_METRIKA_ID.
  - **Контент**: режим минимальной обработки (SYSTEM_PROMPT_MINIMAL + buildMinimalArticlePrompt — только чистка паразитов, 90% авторский текст).
  - **Воронка**: аудит показывает estimated_monthly_volume, регистрация показывает «0₽ + 15% комиссия», карточки заказов показывают ответ AI + 4 маркера + кнопка «Я отвечу лучше».
  - **Реферальная механика**: middleware сохраняет ?ref= в cookie (30 дней), register читает cookie, auth trigger (миграция 011) привязывает referrer_id.
  - **Миграции**: 010 (reviews + tracking_token + is_featured), 011 (auth trigger referral), 012 (teams + bookings + expert_schedule + api_keys), 013 (has_specific_numbers). Все применены на production.
  - Задеплоено на production. pnpm build OK.

- Шаг 16 (Citation Network + Knowledge Graph + API Licensing):
  - **Knowledge Graph**: каталог вопросов /questions (фильтр по нише, volume, кол-во ответов), страница вопроса /questions/[slug] (агрегация всех экспертов на один вопрос + sub_queries + related questions), кросс-ссылки между экспертами на странице статьи («Другие эксперты по этой теме»), API /api/v1/questions (фильтры, gap-маркеры, пагинация).
  - **Citation Network**: страница ниши /niches/[slug] (эксперты + вопросы + статьи + смежные ниши), кросс-нишевая навигация (20 ниш с маппингом смежных направлений), платформенные метрики на лендинге (реальные: эксперты/статьи/цитирования из БД через /api/platform-stats).
  - **Knowledge API Licensing**: /api/v1/answers (Premium — полный контент + аудио + цитаты + credentials + лицензия), /api/v1/blind-spots (Premium — «Карта слепых зон AI» data-продукт для SEO-агентств: вопросы с высоким спросом и слабыми AI-ответами, opportunity_score, gap-маркеры, niche_summary, sub_queries), 3 тарифа API (Read free / Pro $99/mo / Enterprise custom), permission-based access (read/answers/all), attribution_format в каждом ответе.
  - **Marketplace**: фильтры по цене и рейтингу в каталоге, split-payment ЮKassa (YUKASSA_MARKETPLACE=true → transfers[] с автокомиссией), Yclients интеграция (yclients_url → кнопка «Записаться онлайн»), миграция 014 (yukassa_account_id + yclients_url).
  - **Analytics**: таблица цитирований расширена до 4 платформ (ChatGPT, YandexGPT, GigaChat, Perplexity), блок сравнения с конкурентом в дашборде, топ-5 страниц (по leads + citations), cosine similarity (Jaccard > 0.7) в track-citations.
  - **GEO-сервисы**: Pixel Tools (`pixel-tools.ts` — мониторинг упоминаний + тональность), GptFox (`gptfox.ts` — позиции в ChatGPT + конкуренты), комбинированный job `track_geo_services`. Worker: 18 active handlers.
  - **Voice Engine**: AI-ассистент с уточняющими вопросами после записи (/api/voice-followup → анализ транскрипта → 2-3 конкретных вопроса → «Дозаписать» / «Пропустить»), `buildFollowUpQuestionsPrompt()`.
  - **Demand**: Яндекс Кью как 3-й источник вопросов (`yandex-kyu.ts` → SerpAPI site:yandex.ru/q), топ-10 заказов с badge «Высокий приоритет» (is_priority), badge «AI даёт неточный ответ» для gap_score 8-10, конкурентный анализ в карточке заказа (extractMentionedExperts из AI-ответа), миграция 015 (is_priority).
  - **Лидогенерация**: email-форма работает (action + method + redirect), email-отписка (GET /api/email-subscribe?email=&expert_id=), маппинг ниш → Telegram-чаты (niche-channels.ts, 12 ниш), publish уведомление с нишевыми каналами.
  - **Аналитика**: Plausible (layout.tsx), топ-5 страниц в дашборде.
  - Задеплоено на production. pnpm build OK.

## UX/UI Аудит (2026-03-19)

### P0 — Критические

- [x] **Toast-уведомления** — `components/ui/toast.tsx` (ToastProvider + useToast), auto-dismiss 4 сек, 3 типа (success/error/info). Подключен через `components/providers.tsx` → root layout. Заменены inline-сообщения в: profile, content/[id], team, api-keys.
- [x] **Skeleton-загрузчики** — `components/ui/skeleton.tsx` (Skeleton, SkeletonCard, SkeletonRow, SkeletonTable, SkeletonChart). Обновлены все 7 loading.tsx в дашборде: dashboard, orders, content, leads, analytics, billing, profile.

### P1 — Серьёзные

- [x] **Confirm-диалоги** — `components/ui/confirm-dialog.tsx` (ConfirmProvider + useConfirm), стилизованное модальное окно с danger/primary вариантами. Заменён нативный confirm() в: content/[id] (delete), api-keys (delete), team (remove).
- [x] **Emoji → Lucide иконки** — установлен `lucide-react`, sidebar дашборда использует Lucide иконки (LayoutDashboard, ClipboardList, FileText, Inbox, Users, Key, UserCircle). Добавлены aria-label и aria-expanded на hamburger.
- [x] **Унификация Login/Register** — register переведён на тёмную тему с NeuralBackground + glassmorphism + cyan/blue градиенты. Единый стиль с login.
- [x] **Onboarding чеклист** — блок «Начните работу» на /dashboard с 4 шагами (регистрация, профиль, запись, публикация). Скрывается когда все шаги выполнены. Lucide иконки CheckCircle2/Circle.

### P2 — Средние

- [x] **Дизайн-токены в Tailwind** — расширен `tailwind.config.ts`: `colors.brand` (DEFAULT/light/dark/cyan/purple/bg), `borderRadius.card/button`, `spacing.section`.
- [x] **Breadcrumbs в дашборде** — `components/ui/breadcrumbs.tsx` с Lucide ChevronRight. Добавлены в content/[id] и content/new.
- [x] **Inline-валидация форм** — Input/Textarea компоненты расширены: prop `error` для inline-ошибок (красная рамка + текст под полем), `aria-invalid`, `aria-describedby` для accessibility.
- [x] **Мобильные таблицы** — `components/ui/scroll-table.tsx` (ScrollTable) с fade-gradient справа при горизонтальном скролле + ResizeObserver. Компонент готов к применению в таблицах.
- [x] **Accessibility (ARIA + контраст)** — sidebar: `role="navigation"`, `aria-label`, `aria-current="page"` на активном пункте, `aria-expanded` на бургере. Контраст: text-gray-400 → text-gray-500 в дашборде (orders, api-keys, content/new, dashboard). Input: aria-invalid + aria-describedby.
- [x] **Пагинация** — `components/ui/pagination.tsx` (Pagination) с номерами страниц, стрелками, ellipsis, aria-current, aria-label. Компонент готов к применению на страницах каталогов.

### P3 — Улучшения

- [x] **Кнопка «Наверх»** — `components/ui/scroll-to-top.tsx` (ScrollToTop) с Lucide ArrowUp, появляется при scrollY > 500px. Подключён глобально через Providers.
- Остальные P3 перенесены в раздел «Нереализованные фичи (код)» ниже.

## Что починили на проде в Фазе 0 (2026-04-07)

> Эти баги жили на проде месяцами. Все исправлены.
> Подробности и точные команды — в `launch-audit.md`.

1. **`supabase-auth` мёртв с 15 марта** — GoTrue падал на миграции `20221208132122_backfill_email_last_sign_in_at.up.sql` (`uuid = text`). Никто не мог зарегистрироваться/войти 3 недели. Фикс: `ALTER TABLE auth.identities ALTER COLUMN id TYPE text USING id::text;`
2. **Kong key-auth полностью сломан** — kong.yml содержит `${ANON_KEY}`/`${SERVICE_ROLE_KEY}`, Kong **не** подставляет env vars в declarative config. Все запросы → 401 «Invalid authentication credentials». Фикс: (a) добавил `ANON_KEY`/`SERVICE_ROLE_KEY` в `environment:` сервиса `supabase-kong` в `docker/docker-compose.prod.yml`; (b) сделал `envsubst` для `docker/supabase/kong.yml` (шаблон → `kong.yml.template`).
3. **`/auth/callback` редиректит на `0.0.0.0:3000`** — `apps/web/app/auth/callback/route.ts` использовал `origin` из `request.url`, а Next.js за Traefik не доверяет `X-Forwarded-Host`. Фикс: вместо `origin` теперь `process.env.NEXT_PUBLIC_APP_URL`.
4. **Magic link редиректит на `/auth/v1/verify` (404)** — `GOTRUE_MAILER_URLPATHS_*` не учитывали префикс `/supabase/` от Traefik. Фикс: все 4 URLPATHS переписаны на `/supabase/auth/v1/verify`.
5. **`/email-templates/*` перехватывает middleware** — Next.js middleware ловил все пути и редиректил на `/login`. Фикс: добавил `/email-templates` в `PUBLIC_PREFIXES` в `apps/web/middleware.ts`.
6. **4 страницы дашборда висят на «Загрузка...»** (2026-04-11) — `/profile`, `/analytics`, `/billing`, `/content/[id]` — это client components, использовали `createClient` напрямую из `@supabase/supabase-js`. Такой клиент читает сессию только из `localStorage`, а после magic link сессия хранится в server-side HTTP-only cookies через `@supabase/ssr`. `supabase.auth.getUser()` возвращал `null` → ранний `return` → `profile === null` → вечно «Загрузка...». Фикс: на всех 4 страницах заменил импорт на `createBrowserClient` из `@supabase/ssr` (без `Database` generic, чтобы не ломать существующие `.from()` запросы с direct column access), инициализация через `useState(() => createBrowserClient(...))` для SSR-safe lazy init. pnpm build OK, /review 9.5/10.
7. **`rsync --delete` снёс `docker/supabase/kong.yml` на проде** (2026-04-11) — этот файл генерится на сервере через `envsubst` из `kong.yml.template` и **не в git** (в .gitignore). При `rsync --delete` был удалён, Kong продолжал работать с закэшированной версией в памяти, но **следующая перезагрузка Kong вернула бы баг #2 из Фазы 0**. Попутный фикс: при деплое заново `envsubst < kong.yml.template > kong.yml` с явным export'ом `ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY` и `SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY` (имена env vars различаются между template и .env). См. `~/.Codex/projects/.../memory/feedback_deploy_kong_yml.md` — описание ловушки и правильной процедуры деплоя.

## Известный TODO на проде после Фазы 0

- [x] **Worker 404 на `rpc/claim_job`** ✅ (2026-04-17) — функция `claim_job(text[])` отсутствовала в схеме (миграция 001 её не определяла). Создана миграция `018_claim_job_function.sql` с `FOR UPDATE SKIP LOCKED` для concurrent-safe poll'инга, SECURITY DEFINER + GRANT service_role. После применения нужен `docker restart docker-supabase-rest-1` (NOTIFY pgrst недостаточен). Также расширен fallback в `apps/worker/src/index.ts` на `PGRST202`. Тест: тестовый job → status=completed за <15s.
- [x] **Сделать фиксы постоянными** ✅ (2026-04-11) — `kong.yml` в `.gitignore`, создан `scripts/render-kong.sh` (единый источник регенерации из `kong.yml.template` через `envsubst` с правильным маппингом имён env vars, sanity-check через `envsubst '$ANON_KEY $SERVICE_ROLE_KEY'` + grep на остаточные `${VAR}`). `scripts/fix-prod.sh` использует его после rsync + добавил `--exclude='docker/supabase/kong.yml'` защищает от `--delete`. `scripts/deploy.sh` step 2b тоже делегирует в этот скрипт. **Протестировано на проде standalone 2026-04-11:** kong.yml регенерируется **идемпотентно** (md5 до/после одинаковый), 0 placeholders, `/api/health` 200, `/login` 200.
- [ ] **`scripts/deploy.sh` мёртв без fresh deploy** — логика `[ -d $APP_DIR/.git ]` даёт false (прод `/opt/neuroexpert` — просто rsync'нутая копия, не git-репо), а `else`-ветка с `git clone "$REPO" "$APP_DIR"` упадёт на непустой директории. Актуальный путь деплоя — `scripts/fix-prod.sh`. TODO: либо убрать deploy.sh (мёртвый код), либо переписать под git-based prod (`git init` в /opt/neuroexpert + настроить remote).
- [ ] **CSP eval-блок** — в браузере на главной видна ошибка `Content Security Policy of your site blocks the use of 'eval' in JavaScript`. Влияет на сторонние библиотеки. Найти источник CSP-заголовка (next.config.js / middleware) и ослабить.
- [ ] **Перенос pgcrypto / supabase_admin role** — `CREATE EXTENSION pgcrypto` падает (`role "supabase_admin" does not exist`). На функционал сейчас не влияет, но для админ-задач полезно.

## План запуска — см. CURRENT_PLAN.md

> **Единственный источник правды по порядку работ** — [`CURRENT_PLAN.md`](CURRENT_PLAN.md). `LAUNCH_PLAN.md` остаётся бизнес/маркетинговым контекстом.
> При каждом начале работы: прочитать `AGENTS.md`, затем `CURRENT_PLAN.md`, определить активный этап и двигаться только по нему.
> Переход к следующему этапу разрешён только после закрытия gate текущего этапа или явного изменения порядка пользователем.
> Экспертный статус: **самозанятый** (не ИП/ООО). ЮKassa это поддерживает.

## Нереализованные фичи (код)

- [ ] Добавить выбор/управление нишами в дашборд (`/profile` или `/niches`)
- [ ] Обновить `/audit` — если выбранная ниша не в лимите, показать CTA апгрейда (отложено: аудит доступен всем без авторизации)
- [ ] Обновить OpenAPI docs (`/api/v1/docs`) — ниши не влияют на API-ключи (отложено)
- [ ] Прогресс-бар аудита — пошаговый прогресс вместо одного спиннера
- [ ] Анимация аккордеонов — CSS transition max-height
- [ ] Dark mode дашборда
- [ ] Keyboard shortcuts
- [ ] Оптимистичные обновления (accept/skip)
- [ ] Empty states с иллюстрациями

## Тарифная модель

Темы показываются **без ограничений** на всех тарифах (FOMO-механика). Лимит — на контент-пакеты и ниши.

| | Free | Starter | Pro | Expert | Business |
|---|---|---|---|---|---|
| Цена | 0₽ | 1 490₽/мес | 2 990₽/мес | 4 990₽/мес | 24 990₽/мес |
| Комиссия | 15% | 7% | 3% | 0% | 0% |
| Ниш (maxNiches) | 1 | 2 | 3 | 5 | 10 |
| Подобранных тем | безлимит | безлимит | безлимит | безлимит | безлимит |
| Контент-пакетов/мес | 3 | безлимит | безлимит | безлимит | безлимит |
| Форматы | 2 (пост + статья) | все 5 | все 5 | все 5 | все 5 |
| Экспорт TG-поста | да | да | да | да | да |
| Экспорт всех форматов | нет | да | да | да | да |
| Кросспост | нет | нет | да | да | да |
| Аналитика AI | нет | нет | нет | да | да |

Ключевые файлы:
- `apps/web/lib/subscription.ts` — TIER_CONFIG (лимиты, форматы, экспорт, maxNiches)
- `packages/shared/src/constants.ts` — SUBSCRIPTION_TIERS (дублирует для worker)
- `apps/worker/src/jobs/generate-orders.ts` — показ тем без лимита
- `apps/bot/src/handlers/callback.ts` — MAX_NICHES (проверка лимита ниш в Telegram)
- `apps/web/app/(marketing)/pricing/page.tsx` — страница тарифов

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
- Coolify Traefik v3.6 обслуживает порты 80/443. Системный nginx не используется. Конфиг Traefik: `/traefik/dynamic/neuroexpertise.yaml` внутри контейнера `coolify-proxy`. Web и Kong подключены к внешней Docker-сети `coolify`
- Supabase Auth работает с `autoconfirm=true` (без SMTP) — magic link не отправляется, пользователи подтверждаются автоматически

## Production

- **Сервер:** `185.221.213.104` (SSH: `hostland` алиас из ~/.ssh/config)
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
| Prod deploy | `tar czf - --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.env' --exclude='.env.local' --exclude='dist' --exclude='docker/supabase/kong.yml' . \| ssh hostland "cd /opt/neuroexpert && tar xzf - --overwrite" && ssh hostland "cd /opt/neuroexpert && bash scripts/render-kong.sh && docker compose -f docker/docker-compose.prod.yml --env-file .env build web && docker compose -f docker/docker-compose.prod.yml --env-file .env up -d web"` |
| Prod logs | `ssh hostland "cd /opt/neuroexpert && docker compose -f docker/docker-compose.prod.yml --env-file .env logs -f web"` |
| Prod restart | `ssh hostland "cd /opt/neuroexpert && docker compose -f docker/docker-compose.prod.yml --env-file .env restart web"` |
| Prod status | `ssh hostland "cd /opt/neuroexpert && docker compose -f docker/docker-compose.prod.yml --env-file .env ps"` |
| Prod миграция | `ssh hostland "docker exec -i docker-supabase-db-1 psql -U postgres -d postgres < packages/supabase/migrations/NNN.sql"` |
| Миграция push | `npx supabase db push --db-url $SUPABASE_DB_URL` |
| AIO мониторинг | `npx tsx --env-file=.env.local scripts/validate-aio.ts` |
| Тест audit API | `curl -X POST localhost:3000/api/audit -H "Content-Type: application/json" -d '{"niche_id":"...","type":"free"}'` |
| Откат коммита | `git reset --soft HEAD~1` |

## Советы

1. **AGENTS.md — читай первым.** Одна строка в начале промпта. Обновляй после шага (✅ + что работает).
2. **Не забегай.** Codex начал шаг 5, а ты на 3? → «Стоп. Только шаг 3.»
3. **pnpm build после каждого шага.** Не собирается — не коммить.
4. **20 ниш = живые.** Каждая показывает реальные дыры. Никаких «данные собираются».
5. **AIO ≠ единственное обещание.** «Клиенты из поиска И нейросетей». SEO — полноценный канал.
6. **Мониторинг AIO — фоном.** После шага 7: `validate-aio.ts` раз в неделю. Не блокирует.
7. **Seed-данные ~400₽.** 300–400 вопросов для 20 ниш. Не экономь.
8. **Статья ≥ 2900 слов — обязательно.** Данные SE Ranking: +60% цитирований. validate-content.ts не пропустит короткие.
9. **TL;DR — первый абзац.** Featured Snippets мигрируют в ChatGPT почти 100%. Не пропускай.
10. **CWV: FCP < 0.4 сек.** Проверяй после шага 7. Медленная страница = -3x цитирований.
11. **Первые 72 часа после публикации — критичны.** Шеринг в Telegram-чаты создаёт поведенческие факторы. Не откладывай crosspost_social.

<!-- PFO_PROJECT_RUNTIME_START -->
## Product Factory OS Runtime

This existing project is adopted into Product Factory OS.

- Workspace: `/home/hihol/projects`
- Methodology: `/home/hihol/projects/product-factory-os`
- Project: `/home/hihol/projects/neuroexpert`

Before substantial implementation, Codex must use:

```bash
pfo adopt /home/hihol/projects/neuroexpert --analyze
```

Then route work through `/task`, update `.codex-memory/STATE.json`, and respect `.pfo/` contracts. Project-local rules may add constraints, but they do not replace PFO gates, memory, or scope/data/fallback contracts.
<!-- PFO_PROJECT_RUNTIME_END -->
