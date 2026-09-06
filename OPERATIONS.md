# НейроЭксперт — Operations / Runbook

> Операционный документ: **КАК** деплоить, эксплуатировать и обслуживать прод.
> План «ЧТО и КОГДА строить» — в [`CURRENT_PLAN.md`](CURRENT_PLAN.md).
> Правила для AI-агента и стек — в [`CLAUDE.md`](CLAUDE.md).

Отвечай всегда на русском языке.

---

## 1. Production

- **Сервер:** `185.221.213.104` (Hostland VDS, SSH-алиас `hostland` из `~/.ssh/config`).
  - ⚠️ Старый сервер `155.212.185.216` (до миграции Beget→Hostland) — **устарел**, не использовать.
- **Домен:** `neuroexpertise.ru` (SSL Let's Encrypt, auto-renew).
- **Проект на сервере:** `/opt/neuroexpert/`
- **Env:** `/opt/neuroexpert/.env` (**НЕ коммитить!**)
- **Reverse proxy:** Coolify Traefik v3.6 (порты 80/443). Системный nginx не используется. Конфиг Traefik: `/traefik/dynamic/neuroexpertise.yaml` внутри контейнера `coolify-proxy`. Web и Kong подключены к внешней Docker-сети `coolify`.
- **Supabase API:** `https://neuroexpertise.ru/supabase/` (Kong → PostgREST/GoTrue/Storage).
- **Docker compose:** `docker/docker-compose.prod.yml`
- **Контейнеры (8):** `supabase-db`, `supabase-rest`, `supabase-auth`, `supabase-storage`, `supabase-kong`, `web`, `bot`, `worker`.

---

## 2. Шпаргалка команд

| Действие | Команда |
|----------|---------|
| Коммит + пуш | `git add -A && git commit -m "msg" && git push` |
| Dev web | `pnpm --filter web dev` |
| Dev bot | `pnpm --filter bot dev` |
| Dev worker | `pnpm --filter worker dev` |
| Build всё | `pnpm build` |
| Build shared | `pnpm --filter shared build` |
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

---

## 3. Deploy runbook и ловушки

### `kong.yml` — НЕ в git, генерится на сервере

`docker/supabase/kong.yml` в `.gitignore` и генерится через `envsubst` из `kong.yml.template`. Ловушка: Kong **не** подставляет env vars в declarative config сам.

- При деплое всегда: `bash scripts/render-kong.sh` (единый источник регенерации из шаблона; правильный маппинг имён env vars: `ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY`; sanity-check на остаточные `${VAR}`).
- В deploy-команде `tar`/`rsync` **обязателен** `--exclude='docker/supabase/kong.yml'` — иначе `--delete` снесёт сгенерированный файл, и следующая перезагрузка Kong вернёт баг key-auth (см. Фаза 0 #2/#7).
- `scripts/render-kong.sh` идемпотентен (md5 до/после совпадает).

### Скрипты деплоя
- Актуальный путь деплоя — команда из шпаргалки выше / `scripts/fix-prod.sh`.
- `scripts/deploy.sh` — ⚠️ мёртв без fresh deploy (логика `[ -d $APP_DIR/.git ]`: прод `/opt/neuroexpert` — rsync-копия, не git-репо). TODO: либо убрать как мёртвый код, либо перевести прод на git-based.
- `scripts/generate-env.sh` — генерация JWT-ключей anon/service_role.
- При выкатке следить за executable bit (`100755`) у `deploy.sh`, `fix-prod.sh`, `generate-env.sh`, `render-kong.sh` — терялся при некоторых операциях.

### Release gate перед production deploy
1. Применить свежие миграции (`021`-`024` и далее) до выката кода, который их использует.
2. Обновить generated DB types (`packages/shared/src/types/database.ts`) после миграций.
3. Проверить, что PostgREST увидел новые таблицы (`NOTIFY pgrst, 'reload schema'`) и `jobs_type_check` пропускает новые worker jobs.
4. `/api/health`, `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/sitemaps/*`, `/api/v1/docs` → `200`.
5. `pnpm aeo:smoke` проходит на актуальном `NEXT_PUBLIC_APP_URL`.
6. Закрыть PFO release-блокеры (`PFO_CONTRACT_GATE.json`), вернуть executable bit deploy-скриптам.

---

## 4. Известные проблемы окружения

- **OpenAI заблокирован геолокацией (РФ)** — используется HTTP-прокси через undici ProxyAgent (`OPENAI_PROXY_URL` в `.env`). ⚠️ Креды прокси держать только в `.env`, не в git/доках.
- **Next.js dev в WSL** слушает только localhost — флаг `-H 0.0.0.0` в `package.json`, доступ через IP WSL.
- **`.next` кэш** периодически ломается при переключении build/dev — `rm -rf apps/web/.next` перед запуском.
- **`scan_results`** не в generated-типах — type assertion в API/SSR; пересоздать типы после миграции 009.
- **pg_cron не установлен** в self-hosted PostgreSQL (миграции 003, 008 не применились) — cron-задачи через worker.
- **Supabase Auth `autoconfirm`** — при недоступном SMTP пользователи подтверждаются автоматически; magic link не отправляется.
- **WSL → neuroexpertise.ru** резолвится в proxy/VPN IP (`198.18.x`) и маршрут из Ubuntu может не отвечать; smoke-проверки прода надёжнее через Windows Node/curl.

---

## 5. Известный TODO на проде

- [ ] **`scripts/deploy.sh` мёртв без fresh deploy** — починить или удалить (см. §3).
- [ ] **CSP eval-блок** — на главной ошибка `Content Security Policy ... blocks 'eval'`. Найти источник CSP-заголовка (next.config.js / middleware), ослабить.
- [ ] **Перенос pgcrypto / supabase_admin role** — `CREATE EXTENSION pgcrypto` падает (`role "supabase_admin" does not exist`). На функционал не влияет, полезно для админ-задач.

---

## 6. История фиксов прода — Фаза 0 (2026-04-07/11)

> Эти баги жили на проде месяцами. Все исправлены. Детали и точные команды — `launch-audit.md`.

1. **`supabase-auth` мёртв с 15 марта** — GoTrue падал на миграции `...backfill_email_last_sign_in_at` (`uuid = text`). Фикс: `ALTER TABLE auth.identities ALTER COLUMN id TYPE text USING id::text;`
2. **Kong key-auth сломан** — `${ANON_KEY}`/`${SERVICE_ROLE_KEY}` не подставлялись → 401. Фикс: env vars в `environment:` сервиса `supabase-kong` + `envsubst` (`kong.yml.template`).
3. **`/auth/callback` редирект на `0.0.0.0:3000`** — Next за Traefik не доверяет `X-Forwarded-Host`. Фикс: использовать `process.env.NEXT_PUBLIC_APP_URL`.
4. **Magic link → `/auth/v1/verify` (404)** — `GOTRUE_MAILER_URLPATHS_*` не учитывали префикс `/supabase/`. Фикс: переписать на `/supabase/auth/v1/verify`.
5. **`/email-templates/*` перехватывал middleware** → редирект на `/login`. Фикс: `/email-templates` в `PUBLIC_PREFIXES`.
6. **4 страницы дашборда висели на «Загрузка...»** — client components читали сессию из `localStorage`, а она в HTTP-only cookies (`@supabase/ssr`). Фикс: `createBrowserClient` из `@supabase/ssr`.
7. **`rsync --delete` снёс `kong.yml`** — файл не в git, генерится на сервере. Фикс: `--exclude='docker/supabase/kong.yml'` + регенерация через `render-kong.sh` (см. §3).
8. **Worker 404 на `rpc/claim_job`** (2026-04-17) — функция отсутствовала. Создана миграция `018_claim_job_function.sql` (`FOR UPDATE SKIP LOCKED`, SECURITY DEFINER, GRANT service_role). После применения: `docker restart docker-supabase-rest-1`.

---

## 7. Тарифная модель (Solo)

Темы показываются **без ограничений** на всех тарифах (FOMO). Лимит — на контент-пакеты и ниши.

| | Free | Starter | Pro | Expert | Business |
|---|---|---|---|---|---|
| Цена | 0₽ | 1 490₽/мес | 2 990₽/мес | 4 990₽/мес | 24 990₽/мес |
| Комиссия | 15% | 7% | 3% | 0% | 0% |
| Ниш (maxNiches) | 1 | 2 | 3 | 5 | 10 |
| Подобранных тем | безлимит | безлимит | безлимит | безлимит | безлимит |
| Контент-пакетов/мес | 3 | безлимит | безлимит | безлимит | безлимит |
| Форматы | 2 (пост+статья) | все 5 | все 5 | все 5 | все 5 |
| Экспорт TG-поста | да | да | да | да | да |
| Экспорт всех форматов | нет | да | да | да | да |
| Кросспост | нет | нет | да | да | да |
| Аналитика AI | нет | нет | нет | да | да |

Ключевые файлы:
- `apps/web/lib/subscription.ts` — TIER_CONFIG (лимиты, форматы, экспорт, maxNiches)
- `packages/shared/src/constants.ts` — SUBSCRIPTION_TIERS (дубль для worker)
- `apps/worker/src/jobs/generate-orders.ts` — показ тем без лимита
- `apps/bot/src/handlers/callback.ts` — MAX_NICHES (лимит ниш в Telegram)
- `apps/web/app/(marketing)/pricing/page.tsx` — страница тарифов

---

## 8. API-ключи и интеграции

Без этих ключей часть функций в degraded-режиме. Проставлять в `/opt/neuroexpert/.env` (прод) + `.env.local` (dev). **Секреты — только в env, не в git/доках.**

### P0 — критично (монетизация)
| Интеграция | Где взять | Переменные | Стоимость |
|---|---|---|---|
| **Платёжная ссылка** (`/pay`) | Приложение банка или «Мой налог» → ссылка/QR на перевод. Принимается только `https://`; пусто — страница показывает путь «Запросить счёт» | `PAYMENT_LINK_URL` | 0₽ |
| **ЮKassa** (ИП/самозанятый) | yookassa.ru → ЛК → API. Webhook: `https://neuroexpertise.ru/api/webhooks/yukassa` | `YUKASSA_SHOP_ID`, `YUKASSA_SECRET_KEY`, `YUKASSA_WEBHOOK_SECRET` | комиссия 2.8-3.5% |
| **SMTP** (Yandex 360) | `noreply@neuroexpertise.ru`, app password из Яндекс ID | `SMTP_HOST=smtp.yandex.ru`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL` | 0₽ |

### P1 — важно (реальные данные)
| Интеграция | Где | Переменные | Стоимость |
|---|---|---|---|
| **XMLRiver** (Wordstat) | xmlriver.com | `XMLRIVER_USER_ID`, `XMLRIVER_API_KEY` | ~1000₽/мес |
| **SerpAPI** (PAA/Яндекс Кью/SERP) | serpapi.com | `SERPAPI_API_KEY` | $50/мес |
| **Resend** (email-дайджесты) | resend.com + SPF/DKIM/DMARC | `RESEND_API_KEY`, `EMAIL_FROM` | 0₽ до 3000/мес |

### P2 — аналитика (probing 4 платформы)
| Интеграция | Переменные | Стоимость |
|---|---|---|
| **OpenAI** | `OPENAI_API_KEY`, `OPENAI_PROXY_URL` (прокси, только в env!) | ~$20/мес |
| **Anthropic Claude** | `ANTHROPIC_API_KEY` | ~$10/мес |
| **Perplexity** | `PERPLEXITY_API_KEY` | ~$5/мес |
| **YandexGPT** | `YANDEX_API_KEY`, `YANDEX_FOLDER_ID` | грант 4000₽/60дн |
| **GigaChat** | `GIGACHAT_CLIENT_ID`, `GIGACHAT_CLIENT_SECRET` | бесплатный лимит |
| **PageSpeed** | `PAGESPEED_API_KEY` | бесплатно 25k/день |

### P3 — кросспост (Pro+)
Дзен `DZEN_API_TOKEN`, Хабр `HABR_API_TOKEN`, vc.ru `VCRU_API_TOKEN`, VK `VK_API_TOKEN`.

### P4 — индексация
GSC `GSC_SERVICE_ACCOUNT_JSON`, Яндекс.Вебмастер `YANDEX_WEBMASTER_TOKEN`/`YANDEX_WEBMASTER_HOST_ID`, Bing `BING_WEBMASTER_API_KEY`.

### P5 — опционально (GEO + web-аналитика)
Pixel Tools `PIXEL_TOOLS_API_KEY`, GptFox `GPTFOX_API_KEY`, Яндекс.Метрика `NEXT_PUBLIC_YANDEX_METRIKA_ID`, Plausible `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`/`_HOST`.

---

## 8b. Magic-link redirect allow-list (GoTrue)

`ADDITIONAL_REDIRECT_URLS` в `.env` → `GOTRUE_URI_ALLOW_LIST`. Любая ссылка из письма
(`emailRedirectTo`) обязана матчиться шаблоном, иначе GoTrue после входа молча редиректит на
`GOTRUE_SITE_URL` (главную) — инцидент 2026-09-05 (AUTH-1). Обязательный состав:
`https://neuroexpertise.ru/auth/callback`, `…/auth/callback?next=/dashboard`,
`…/auth/callback?next=/orders/*` (письма оплаты и готовности отчёта),
`…/auth/callback?next=/order/audit-start*` (письмо «данные готовы» по паре). После правки —
`up -d --force-recreate supabase-auth` (restart env не перечитывает).

**Лимиты писем (SEC-1, 2026-09-06).** `GOTRUE_SMTP_MAX_FREQUENCY` (default `15s`) — минимальная
пауза между письмами на один адрес; `GOTRUE_RATE_LIMIT_EMAIL_SENT` (default `60`) — часовой
бюджет писем GoTrue. Оба переопределяются в `.env`. Письма «оплачено» (webhook) и «отчёт
готов» (worker) идут тем же каналом: при отказе по частоте worker повторит уведомление по
`notification_next_attempt_at`, webhook письмо не повторяет (ссылка на статус доступна с
возврата из кассы). Смежные лимиты web (in-memory, один контейнер): `ORDERS_RATE_LIMIT_IP`
(5 заказов / 10 мин на IP), `ORDERS_RATE_LIMIT_EMAIL` (3 / час на email),
`AUDIT_FREE_DAILY_BUDGET` (100 бесплатных аудитов / сутки UTC); канарейка с
`x-selfserve-canary` и внутренний `type=paid` лимитами не ограничены. Webhook кассы меняет
статус заказа только после сверки платежа/возврата через API ЮKassa; при недоступности API —
503, касса повторяет уведомление сама.

**Проба провайдеров в health (DEMAND-3, 2026-09-06).** `/api/health` отдаёт блок `providers`
(`wordstat`, `openai`, `yandexgpt`, `gigachat`, `perplexity` → `ok | no_key | forbidden |
no_balance | empty | error | skipped` + `detail`) и `providers_summary` (`llm_ok`, `llm_required`=2,
`wordstat_ok`, `degraded`, `reasons`). Пробы лёгкие (Wordstat — одно общее слово, OpenAI —
список моделей, GigaChat — только OAuth-токен, YandexGPT/Perplexity — 1 токен), кеш 10 минут на
процесс web. `status: degraded`, если Wordstat не `ok` (пустой баланс XMLRIVER → `no_balance`
или `empty`) или живых LLM меньше 2 (блокировка облака Yandex по биллингу → `no_balance`/`forbidden`).
Оракул `verify-preflight.mjs` читает этот блок и краснеет на degraded. Отключить пробу (dev):
`PROVIDERS_PROBE=off` → все `skipped`, health не деградирует.

**Повторный сбор пары после `empty` (DEMAND-1).** `POST /api/orders` по паре в `demand_status =
empty` ставит новый `collect_demand`, если `demand_collected_at` старше `PAIR_RECOLLECT_DAYS` (7):
пара переводится `empty → queued`, ожидающему шлётся письмо при `filled`. Без отметки времени
повтор не ставится (ручной сброс оператором, как раньше).

## 8c. Яндекс.Метрика (G-012, 2026-09-06)

- **Id счётчика:** `NEXT_PUBLIC_YANDEX_METRIKA_ID` в `.env`. Значение **запекается при сборке**
  образа web (`docker/web.Dockerfile` ARG/ENV, `build.args` в compose) — после изменения нужен
  `docker compose … build web` и `up -d --force-recreate web`, а не только restart. Пусто —
  счётчика в образе нет (dev/dark). Единственное место чтения в коде — `apps/web/lib/analytics.ts`;
  компонент `apps/web/components/yandex-metrika.tsx` подключён в корневом layout (все маршруты),
  рендерит `<span data-ym-id>` и `<noscript>`-пиксель — по ним оракул `scripts/verify-analytics.mjs`
  проверяет каждый публичный маршрут (`--base-url … --ym-id <id>`).
- **Настройки:** clickmap, trackLinks, accurateTrackBounce, trackHash; **webvisor выключен**
  (решение владельца 2026-09-06: формы содержат email, privacy §1/§4 обещает обезличенные
  метрики). `hit` отправляется при клиентской навигации App Router.
- **Цели (тип «JavaScript-событие», идентификатор = имя):** `lead_scan_submit` (/scan — проверка
  видимости отправлена), `lead_audit_submit` (/audit — бесплатная карта спроса собрана),
  `order_form_submit` (форма заказа Audit Start отправлена; параметр `vertical`),
  `order_checkout_redirect` (заказ создан, переход в ЮKassa), `order_pair_collecting` (пара
  «вертикаль × город» ещё собирается, 202; параметры `vertical`, `status`), `order_paid`
  (страница `/orders/[id]` со статусом paid/delivered, один раз на заказ; параметры `package`,
  `status`), `contact_agency_submit` (/for-agencies; параметр `plan`), `cta_order_click` (клик по
  любой ссылке на `/order/audit-start`; параметр `from`). PII в параметры не передаётся.
- **Счётчик 112328031** («НейроЭксперт (neuroexpertise.ru)», создан 2026-09-06 через Management
  API, webvisor выключен). Восемь целей созданы там же (тип «JavaScript-событие», идентификатор =
  имя). Скрипт: `https_proxy=http://127.0.0.1:8899 python3 .itd-memory/tools/metrika.py
  create|goals|segment|status --counter 112328031` (токен в `.itd-memory/tools/metrika.token`, вне
  git, право `metrika:write`; получить: https://oauth.yandex.ru → приложение «для доступа к API»
  с доступом «Метрика» → `authorize?response_type=token&client_id=…`). Сохранённый отчёт API не
  создаёт — только интерфейс.
- **AI-сегмент (AEO_PLAN §5):** сегмент «AI-трафик» (id 1008090187) по рефереру. Регулярное
  выражение в API сегментации отклоняется (код 4003), поэтому фильтр — «Реферер содержит» через
  OR по хостам: chatgpt.com, chat.openai.com, openai.com, perplexity.ai, deepseek.com,
  gemini.google.com, bard.google.com, claude.ai, copilot.microsoft.com, you.com, phind.com,
  mistral.ai, character.ai (тот же список, что regex `chatgpt\.com|…|character\.ai` для ручной
  настройки в интерфейсе). Сохранённый отчёт «Источники, сводка» с этим сегментом создаётся в
  интерфейсе: Отчёты → Источники, сводка → выбрать сегмент «AI-трафик» → «Сохранить отчёт»
  с именем «AI-трафик».

## 9. ЮKassa runbook

- **Тестовая карта:** `5555 5555 5555 4444` (любой будущий срок, любой CVC).
- **Webhook secret:** сгенерировать `openssl rand -hex 32` → `YUKASSA_WEBHOOK_SECRET`; webhook URL с `?secret=...`.
- **Защита webhook (5 слоёв):** secret в query, проверка подписи/idempotency, проверка статуса, сверка суммы, guarded update подписки.
- **Happy path:** `/api/subscribe` создаёт платёж → редирект на ЮKassa → `payment.succeeded` webhook → `payments` + обновление `subscription_tier` → проверка tier limits.
- **Split-payment (marketplace):** `YUKASSA_MARKETPLACE=true` → `transfers[]` с автокомиссией по тарифу (оплата консультации клиентом).
- **B2B lifecycle:** ручная оплата/счёт для пилотов через `service_orders` (`invoice_sent`/`paid`/`refunded`/`cancelled`, сумма, пакет, payment_id, receipt_status).

---

## 10. Регулярные процедуры (playbooks)

### Проверка AI-цитирования
**Ручная:** опубликовать статью → подождать 72ч → задать профильный вопрос в ChatGPT / YandexGPT (Алиса) / Perplexity / GigaChat → проверить цитирование и ссылку на neuroexpertise.ru + автора → сохранить скриншот+дата+вопрос (кейс для маркетинга).
**Автоматическая:** worker-задача `track_citations` (probeAI по 4 платформам раз в сутки). Проверка:
```sql
SELECT platform, COUNT(*), MAX(created_at) FROM citation_checks GROUP BY platform;
```

### Воскресный SQL-ран ключевых метрик
```sql
-- 1. Платящие
SELECT tier, COUNT(*), SUM(price) AS mrr_potential
FROM profiles WHERE tier != 'free' AND payment_status = 'active' GROUP BY tier;
-- 2. Выручка за неделю
SELECT SUM(amount_rub), COUNT(*) FROM payments
WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '7 days';
-- 3. Новые регистрации
SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days';
-- 4. Returning
SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE last_active > NOW() - INTERVAL '7 days';
-- 5. Marketplace
SELECT COUNT(*) bookings, SUM(commission_rub) commission
FROM bookings WHERE status = 'completed' AND created_at > NOW() - INTERVAL '7 days';
-- 6. API usage
SELECT name, requests_this_month FROM api_keys ORDER BY requests_this_month DESC LIMIT 10;
-- 7. Citation tracking
SELECT platform, COUNT(DISTINCT article_id) articles_cited
FROM citation_checks WHERE cited = true AND created_at > NOW() - INTERVAL '7 days' GROUP BY platform;
```

### AIO-мониторинг (еженедельно после публикации)
`npx tsx --env-file=.env.local scripts/validate-aio.ts`

| Неделя | Страниц | Индексация | % цитирования | Заметки |
|--------|---------|------------|----------------|---------|
|        |         |            |                |         |

### Серверные задачи
- pg_dump cron (бэкап БД).
- proxy6.net — обновление прокси при ротации.
- Закрыть Coolify-порт `8000` снаружи (только внутренний доступ).

---

## 11. Контент-правила (для AIO-цитируемости)

1. **Статья ≥ 2900 слов** — данные SE Ranking: +60% цитирований; `validate-content.ts` не пропустит короткие.
2. **TL;DR — первый абзац** — Featured Snippets мигрируют в ChatGPT почти на 100%.
3. **CWV: FCP < 0.4 сек** — медленная страница = −3× цитирований.
4. **Первые 72 часа после публикации критичны** — шеринг в Telegram-чаты создаёт поведенческие факторы; не откладывать `crosspost_social`.

---

## 12. Связанные документы

- [`CURRENT_PLAN.md`](CURRENT_PLAN.md) — единый план реализации (роадмап, статус, финмодель, gates).
- [`CLAUDE.md`](CLAUDE.md) — правила для AI-агента, стек, структура.
- `launch-audit.md` — детали и команды Фазы 0.
- `.pfo/` — runtime-контракты (SCOPE_LOCK, DATA_POLICY, FALLBACK_POLICY, FORBIDDEN_CHANGES).
- `reports/` — отчёты stabilization/smoke.
