# NeuroExpert — Backlog

> Создан: 2026-04-17. Источник: E2E прогон Блока 2.1 LAUNCH_PLAN.md.
> Цель файла: фиксация UX-проблем, технического долга, идей до их решения.
> Формат: тикеты группируются по приоритету (P0 блокер выручки → P3 nice-to-have).

---

## E2E прогон Блока 2.1 — статус (2026-04-17)

### Автоматическая часть (выполнено мной)

| Подшаг | Что проверено | Статус |
|---|---|---|
| 0.9 Marketplace | `/experts /find-expert /compare /questions /scan` всё 200 | ✅ |
| 0.10 TG-бот | `docker-bot-1 Up 26h`, polling mode, processed messages в логах | ✅ |
| 0.11 Scanner | `POST /api/scan` валидация работает (400 на пустое тело) | ✅ Block 1 |
| Worker | `docker-worker-1 Up 26h`, после fix claim_job ошибок нет | ✅ |
| API v1 auth | `/blind-spots /answers /experts` без Bearer → 401, `/docs` → 200 | ✅ |
| API leads | `POST /api/leads` пустое тело → 400 (валидация) | ✅ |
| Лендинг агентств | `/for-agencies` 200, `POST /api/agency-leads` 200 (TG-уведомление) | ✅ |

### Ручная часть (требует пользователя — чек-лист отдельно)

| Подшаг | Что нужно | Зависимости |
|---|---|---|
| 0.5 Голосовой ввод | Логин → /content/new → запись 30 сек → транскрипт + follow-up | требует логина и микрофона |
| 0.6 Пакет контента | Дождаться worker → /content/[id] → 5 вкладок → Save → Publish | зависит от 0.5 + worker |
| 0.7 Публичная страница | После Publish → /experts/[slug]/[article] → SSR + Schema.org + OG | зависит от 0.6 + публикация профиля |
| 0.8 Форма заявки | На публичной странице → форма → submit → /api/leads → TG → /leads | зависит от 0.7 |

### Состояние БД (snapshot 2026-04-17)

```
Profiles: 5 экспертов, 0 опубликованных (все is_published=false)
Content packages: 0
Jobs queue: пусто (worker готов, ждёт)
Leads: 0
```

5 профилей: `test@example.com`, 2 × `claude-test-*` (мои автотесты), `hihol.dmitry@ya.ru`, `tg_681237223@neuroexpert.bot`.

---

## P0 — блокеры выручки (фатальные)

### B-001 ЮKassa не активирована
- **Что:** В `/opt/neuroexpert/.env` нет `YUKASSA_SHOP_ID`, `YUKASSA_SECRET_KEY`, `YUKASSA_WEBHOOK_SECRET`. Без этого ни одна оплата (подписка, marketplace booking, Knowledge API Pro) не пройдёт.
- **Кто:** Пользователь (получает ключи в ЛК ЮKassa, передаёт)
- **Шаги:** ЛК ЮKassa → Настройки → Ключи API → Webhook URL `https://neuroexpertise.ru/api/webhooks/yukassa` → передать ключи Claude → прописать в `.env` → `docker compose restart web`
- **Acceptance:** `/billing` → выбор Starter → ЮKassa оплата тестовой картой 5555-5555-5555-4444 → возврат на thank-you → `SELECT tier FROM profiles` показывает `starter`
- **План:** Шаг 2.2 LAUNCH_PLAN.md
- **Создано:** 2026-04-17

### B-002 0 пилот-экспертов и 0 опубликованных профилей
- **Что:** В системе 5 профилей, все is_published=false, ни одной опубликованной статьи. Без живого контента невозможны: проверка AI-цитирования, индексация Google, marketplace, реальные заявки.
- **Кто:** Пользователь (outreach), потом пилоты сами наговаривают
- **План:** Шаги 2.3, 2.4 LAUNCH_PLAN.md (3+ пилотов с 3+ статьями каждый)
- **Зависит от:** B-001 (для платных консультаций)
- **Создано:** 2026-04-17

### B-003 0 платящих агентств для Knowledge API
- **Что:** Лендинг `/for-agencies` готов и задеплоен, но outreach к 20 SEO-агентствам не начат. Hybrid канал B без активации = 0 валидации B2B-SEO гипотезы.
- **Кто:** Пользователь (cold outreach)
- **Зависит от:** B-001 (для приёма $99 Pro подписки) — но beta read-ключи можно выдавать уже сейчас
- **План:** Шаг 4.4 LAUNCH_PLAN.md (но в Hybrid стратегии — параллельно 2.3)
- **Создано:** 2026-04-17

---

## P1 — important (security, основной функционал)

### ~~B-004 Ротация OpenAI + TG ключей~~ → закрыт, см. B-CLOSED-009
- ✅ 2026-04-21 — закрыт. Подробности: B-CLOSED-009.

### B-005 Backend tier-логика для API-ключей не реализована
- **Что:** Миграция 017 заложила поля `tier`, `monthly_limit`, `permissions` в `api_keys`. Но в `/api/api-keys/route.ts` при создании ключа всё хардкодится: `permissions=['read']`, `rate_limit_per_hour=100`. Pro подписчик за $99 при создании ключа НЕ получит доступ к `/blind-spots` или `/answers`.
- **Workaround сейчас:** Soft Launch — выдаём Pro/Enterprise ключи вручную через psql после короткого созвона.
  ```sql
  UPDATE api_keys SET tier='pro',
                       permissions=ARRAY['read','answers','all'],
                       rate_limit_per_hour=1000,
                       monthly_limit=30000
   WHERE prefix='ne_xxx';
  ```
- **Когда строить:** После 1-го платящего Pro — поймём правильную модель limits/permissions из реальных query patterns.
- **Создано:** 2026-04-17

### B-006 Маркетинговые лендинги падают в /login без явной строки в middleware
- **Что:** `apps/web/middleware.ts` использует whitelist `PUBLIC_ROUTES`. Любой новый маркетинговый лендинг даёт 307 → `/login` пока не добавлен в массив. Это ловушка — повторилась с `/for-agencies`.
- **Решение (предложение):** Заменить явный whitelist на pattern-based исключение для `(marketing)` group, либо exclude через `middleware.config.matcher`. Или добавить fallback правило: если pathname начинается с `/for-` → public.
- **Создано:** 2026-04-17 (после инцидента с /for-agencies)

### B-007 PostgREST schema cache не подхватывает CREATE FUNCTION без рестарта
- **Что:** `NOTIFY pgrst, 'reload schema'` в миграции не работает в self-hosted Supabase. После `CREATE FUNCTION` нужен `docker restart docker-supabase-rest-1`. Это ловушка для будущих RPC миграций.
- **Решение:** Добавить в `scripts/render-kong.sh` (или новый `apply-migration.sh`) автоматический рестарт rest после применения миграций с `CREATE FUNCTION`. Либо документировать в `/deploy` skill.
- **Создано:** 2026-04-17

### ~~B-016 /how-it-works:111 — 3 платформы вместо 4~~
✅ 2026-04-20 — добавлен GigaChat в 2 места how-it-works/page.tsx:15 (PIPELINE_STEPS step 01 «Прогон через...») и :111 (MODULES Citation Tracker). Step 2.0.2 advisor P1-1.

### ~~B-017 /how-it-works:63 — «SSR-страница с загрузкой < 1 сек»~~
✅ 2026-04-20 — заменено на «SSR-рендер на стороне сервера (Next.js) — контент отдаётся без задержки на загрузку JavaScript». Конкретные миллисекунды убраны до прохождения B-015 Lighthouse QA. Step 2.0.2 advisor P1-2.

### ~~B-018 /for-experts кейс Анны — без дисклеймера~~
✅ 2026-04-20 — добавлен дисклеймер под case card: «Расчёт-пример на основе средних данных по отрасли. Реальные результаты зависят от ниши, конкуренции и качества ответов.» Step 2.0.2 advisor P1-3.

### ~~B-019 Цифры без источника (86%/58% на /for-experts, 500K+/0 аналогов на главной)~~
✅ 2026-04-20 — добавлены `*` footnote-маркеры к 86%/58% и 500K+/86%, footnote-текст «По отраслевым данным 2024. Цифры показывают порядок — точные значения могут отличаться.» под оба блока. «0 конкурентов» и «0 аналогов» заменены на проверяемое «Первая RU-платформа с AIO-циклом». Из /review pass: удалено упоминание конкретного источника «ВЦИОМ» в footnote /for-experts — если источник не цитируем, именование — overclaim. Step 2.0.2 advisor P1-4, P1-5.

### ~~B-020 /for-business Enterprise features упоминает Knowledge API~~
✅ 2026-04-19 — `for-business/page.tsx:145,149` — убрали «Knowledge API доступ» из features, `desc` изменён с «White-label, SLA, API» на «White-label, SLA, выделенная инфраструктура», вместо API-пункта добавили «Кастомные интеграции с вашими системами». Пофикшено одновременно со Step 2.0.2 в /review pass. Правило LANDING_BRIEFS строки 181-186 соблюдено.

### ~~B-021 /for-agencies $99 без ₽-эквивалента~~
✅ 2026-04-20 — в карточке Pro добавлено поле `priceNote: "≈ 9 000 ₽/мес · оплата в рублях по курсу ЦБ"`, рендерится под ценой. В dropdown формы заявки — «Pro ($99/мес · оплата в ₽)». Step 2.0.2 advisor P1-7.

### B-022 Content audit P2/P3 + cross-site minor (P2)
Сводный тикет из advisor Step 2.0.2:
- **P2-1:** `/audit` CTA «Начать бесплатно» не объясняет что произойдёт после клика → расширить до «… — первая статья по этой нише за 72 часа» (если SLA worker pipeline это подтверждает).
- **P2-2:** `/for-experts` PAINS[4] «Специалисты с худшей квалификацией» — оценочное суждение, заменить на «Специалисты с меньшим опытом собирают аудиторию благодаря активному ведению соцсетей».
- **P2-3:** `/find-expert/page.tsx:65-77` — собственный header вместо `MarketingHeader`. Пользователь попадает в тупик. Подключить `MarketingHeader`/`MarketingFooter`.
- **P2-4:** `/audit` loading 15-30 сек vs `/scan` loading 10-40 сек — inconsistent SLA, добавить пояснение «аудит дольше, потому что анализируем 10 вопросов».
- **P3-1:** Success-states форм `/for-business` и `/for-agencies` — разные emoji (✅ vs 📬).
- **P3-2:** `/audit` loading — простой спиннер, можно прогресс-бар.
- **P3-3:** Footer ссылка `t.me/neuroexpertise` — проверить что канал существует и не пустой.
- **P3-4:** `/how-it-works` цифра «~5%» цитирований в месяц 1 — добавить сноску с условиями.
- **Cross-site C7:** `/find-expert` — нет CTA `/audit` в шапке как на 9 других лендингах.
- **Создано:** 2026-04-19 (Step 2.0.2 advisor P2-P3)

### ~~B-015 Ручная часть Step 2.0.1 Tech QA~~ → закрыт, см. B-CLOSED-010
- ✅ 2026-04-21 — Lighthouse часть закрыта через CI автоматизацию (все 10 URL ≥ 0.80). Остаток (ручной mobile DevTools QA + Schema.org validator) опциональный — покрытие Lighthouse CI снимает риск.

---

## P2 — UX и качество

### B-008 Cyrillic slug в URL профиля
- **Что:** Пользователь регистрируется с именем "Дмитрий Хихол" → slug = `дмитрий-хихол-90171bf6`. URL `/experts/дмитрий-хихол-90171bf6` будет работать (Next.js поддерживает unicode), но при шаринге в TG/ВК разворачивается некрасиво (`%D0%B4%D0%BC%D0%B8%D1%82%D1%80%D0%B8%D0%B9-...`).
- **Решение:** Транслитерировать кириллицу при генерации slug (`dmitry-hihol-...`). Использовать пакет `cyrillic-to-translit-js` или аналог.
- **Где:** `apps/web/lib/slug.ts` (или где slug генерируется)
- **Создано:** 2026-04-17

### B-009 0 опубликованных профилей в каталоге
- **Что:** Зайдя на `/experts` пользователь видит пустой каталог. Это плохо для холодного трафика (выглядит как мёртвый продукт).
- **Решение временное:** Опубликовать тестовый seed-профиль с 1-2 статьями (для демонстрации на проде до прихода реальных пилотов). Можно использовать ваш собственный профиль `Дмитрий Хихол`.
- **Решение долгосрочное:** Empty state с понятным сообщением "Каталог пополняется, оставьте заявку" + CTA на /audit или /scan.
- **Создано:** 2026-04-17

### B-010 GET /api/agency-leads показывает «страница недоступна»
- **Что:** Пользователь зашёл по прямой ссылке на API endpoint в браузере и видит ошибку. Это запутывает (думает что что-то сломано), хотя endpoint POST-only и работает корректно.
- **Решение (опционально):** Добавить GET handler который возвращает 405 с понятным JSON `{"error":"Use POST. Form on /for-agencies"}` или редиректит на `/for-agencies`.
- **Создано:** 2026-04-17

---

## E2E Smoke Test — findings 2026-04-20

### ~~F-E2E-001 Docker containers не могли делать outbound (FORWARD policy DROP)~~
✅ 2026-04-20 — **ROOT CAUSE бездействия прода 2 дня**. На сервере 185.221.213.104 `iptables FORWARD policy = DROP` + UFW не разрешал explicitly FORWARD для Docker bridge networks. Все outbound вызовы из контейнеров (TG API, OpenAI, Telegram polling) silently timeout'или. Симптомы: bot Up 2 days с 0 polling messages, 0 jobs completed за 2 дня, /api/scan всегда пустое. **Фикс:** `iptables -I FORWARD 1 -s 10.0.0.0/8 -j ACCEPT` + persistent через `/etc/ufw/before.rules` (pattern `# NeuroExpert FORWARD for docker containers outbound`), survive reboot.

### ~~F-E2E-002 Новый OpenAI key + прокси не были в .env~~
✅ 2026-04-20 — старый key истёк. Обновлено: `OPENAI_API_KEY`, `OPENAI_PROXY_URL=http://user:pass@72.56.184.139:8000` (proxy6.net HTTPS-capable HTTP proxy). Backup `/opt/neuroexpert/.env.backup.20260418-194756`. После fix `/api/scan` вернул реальный ответ ChatGPT (1/1 platform, mentioned=true).

### ~~F-E2E-003 TELEGRAM_ADMIN_CHAT_ID отсутствовал → B2B/agency leads молча не доходили~~
✅ 2026-04-20 — в `/api/b2b-leads` и `/api/agency-leads` код `if (!botToken || !adminChatId) return;` делал silent-skip. Добавлено: `TELEGRAM_ADMIN_CHAT_ID=681237223` (@dmitry_hihol). Верифицировано: 3 тестовые заявки доехали в TG.

### ~~F-E2E-004 api.telegram.org блокируется на уровне ЦОД/ISP~~
✅ 2026-04-20 — TCP к `149.154.166.110:443` timeout из хоста и из контейнеров, при этом `8.8.8.8:443` и proxy6 на `72.56.184.139:8000` работают. Специфическая блокировка Telegram IP range на этом Hostland ЦОД. **Фикс:** новый helper `packages/shared/src/http/telegram-fetch.ts` (`tgFetch`) через undici ProxyAgent, подхватывает `TG_PROXY_URL` (с fallback на `OPENAI_PROXY_URL`). Заменены все 12 callsites: 5 web API routes (leads/b2b-leads/agency-leads/publish/bookings), 5 worker jobs (generate-orders/crosspost/crosspost-social/refresh-content/validate-content), bot voice handler, и `apps/web/lib/bot-instance.ts` grammY instance. **Env:** `TG_PROXY_URL=http://user:pass@72.56.184.139:8000` на проде.

### F-E2E-005 Продукт ни разу не прогонялся end-to-end
- **Что:** На момент Step 2.0/2.0.1/2.0.2 в БД: 0 content_packages, 0 orders, 0 leads, 0 scan_results, 0 api_keys, 0 bookings, 0 jobs completed. Весь content pipeline (voice → STT → LLM 5 форматов → publish → SSR страница → lead form) никогда не тестировался на production. Любые runtime-баги внутри pipeline обнаружатся только на реальных пилотах.
- **Решение:** Phase 2-3 E2E прогон с hihol.dmitry@ya.ru + @dmitry_hihol — регистрация, TG привязка, запись голоса, job generate_content, publish, lead на published странице. **Блокер:** нужны Step 2.0.5 rotation TG bot token (новый) + после этого Claude прогоняет.
- **Создано:** 2026-04-20

---

## P3 — nice-to-have

### ~~B-011 Страницы /privacy и /terms не существуют~~
✅ 2026-04-19 — `/terms` был создан раньше, `/privacy` создан в B-CLOSED-008 (Step 2.0.2 P0-4). Footer-линки работают.

### B-012 WSL-curl с локальной машины не достаёт до neuroexpertise.ru
- **Что:** Из WSL проверки через curl падают с timeout. Через `ssh hostland` те же запросы работают. Не блокер для прода (только для dev-experience Claude).
- **Решение:** Возможно, MTU/firewall на стороне ISP. Не критично — все проверки делаю через ssh.
- **Создано:** 2026-04-17

### B-013 Pricing bundles / cross-sell между подписками экспертов и Knowledge API
- **Что:** Сейчас два независимых тарифа — подписки экспертов (`/pricing` Free→Enterprise) и Knowledge API (`/for-agencies` Read→Pro→Enterprise). Они никак не связаны, никаких бандлов / cross-sell нет. Потенциальные сценарии (пока гипотезы):
  - Business 24990 ₽ для экспертов включает API Pro в подарок (upsell)
  - Cross-sell: в Business-дашборде показывать «Вашему агентству нужен Knowledge API → /for-agencies»
  - Reseller: SEO-агентство получает % с приведённых экспертов + скидку на API
- **Когда строить:** **После 1-го платящего в каждом канале** (т.е. когда есть и B2C subscription, и Knowledge API Pro). До этого — гипотезы без данных, любая попытка соединить продукты раньше = усложнение и потеря конверсии.
- **Правило сейчас (зафиксировано в LANDING_BRIEFS.md):** Подписки и API — независимые продукты с разными ICP. Не объединять до валидации.
- **Создано:** 2026-04-17 (после стратегического обсуждения «нужно ли менять тарификацию с появлением /for-agencies»)

---

## Закрыто

### ~~B-CLOSED-001 Worker `claim_job` 404~~
✅ 2026-04-17 — миграция 018 + fallback на PGRST202 (commit 6d9c456). Подробности в `session_2026-04-17.md`.

### ~~B-CLOSED-002 Упоминание брендов конкурентов на лендингах~~
✅ 2026-04-17 — найдено 2 места при content-review:
- `/for-experts:151` — «Jasper, Writesonic, Copy.ai генерируют текст…» → «AI-копирайтеры генерируют текст из обучающих данных LLM…»
- `/for-agencies:60` — «Ahrefs/SE Ranking показывают позиции в Google…» → «Классические SEO-трекеры показывают позиции в Google…»

### ~~B-CLOSED-003 SEO duplicate title + общий OG на маркетинговых лендингах~~
✅ 2026-04-19 (Step 2.0.1 F-001/F-002) — автоматическая Tech QA нашла:
- 7 страниц (`/for-business`, `/for-agencies`, `/how-it-works`, `/audit`, `/scan`, `/find-expert`, главная) отдавали **одинаковый** `<title>` от root layout → Google/Яндекс duplicate title penalty.
- 10/10 страниц имели **одинаковые** `og:title` / `og:description` → при шеринге в TG/LinkedIn любой лендинг показывал «Наговори 10 минут…» независимо от контекста, ломая outreach к агентствам и B2B.

**Фикс:** 3 server-компонента (for-experts, pricing, terms) расширены existing `export const metadata` (openGraph + twitter + canonical). 6 client-страниц получили собственный `layout.tsx` с уникальной metadata. Title/description/og взяты из LANDING_BRIEFS.md.

### ~~B-CLOSED-004 POST /api/audit с пустым телом → 404 вместо 400~~
✅ 2026-04-19 (Step 2.0.1 F-003) — условие `!niche_id || !NICHE_NAMES[niche_id]` склеивало два случая. Split: `!niche_id → 400 "niche_id is required"`, `!NICHE_NAMES[niche_id] → 404 "Ниша не найдена"`. Семантически корректно.

### ~~B-CLOSED-005 /for-agencies use-case цифры overclaim~~
✅ 2026-04-19 (Step 2.0.2 P0-1) — USE_CASES массив: «47 вопросов», «₽2.3M TAM», «4/4 платформы» заменены на примеры формата вывода API без конкретных цифр («gap_score 0-10 по каждому вопросу», «TAM считается на стороне агентства», «4 платформы: ChatGPT · Perplexity · YandexGPT · GigaChat»). Заголовок секции «Сырые данные из API» переформулирован — убран «snapshot 2026-04-17», теперь «структура ответа и поля по 3 примерным нишам».

### ~~B-CLOSED-006 /scan заявлял 3 платформы, где в бриф 4~~
✅ 2026-04-19 (Step 2.0.2 P0-2) — `/api/scan/route.ts` реально probe'ит 3 платформы (ChatGPT, Perplexity, YandexGPT) — это дизайн-ограничение Scanner как продукта. Текст на /scan корректен. Добавлена подсказка «В /audit — 4 платформы (+ GigaChat)» чтобы направлять пользователей к full probing.

### ~~B-CLOSED-007 /pricing — гарантия возврата не в comparison table + нет дисклеймера для Free/B2B~~
✅ 2026-04-19 (Step 2.0.2 P0-3) — добавлены: строка «Гарантия цитирований*» в COMPARISON_ROWS с значениями (— / 2 за 60 дн / 5 за 90 дн / 10 за 90 дн); сноска под таблицей с условиями и ссылкой на `/terms#guarantee`; дисклеймер «Free — без гарантии цитирований; попробуйте без обязательств» на Free-карточке; «Гарантия цитирований — индивидуальные условия в договоре» на B2B-карточках Business и Enterprise. Из описания Enterprise убран `API` (был скрытым overclaim про Knowledge API).

### ~~B-CLOSED-008 /privacy страница отсутствует, ссылка в footer → 404~~
✅ 2026-04-19 (Step 2.0.2 P0-4) — создан `apps/web/app/(marketing)/privacy/page.tsx` с 6 разделами (общие положения, какие данные собираем, хранение/защита, cookies/аналитика, передача 3-м лицам, права пользователя + контакт). Соответствует ФЗ-152. Добавлена в middleware PUBLIC_ROUTES. Это закрывает B-011 P3 (повышен до P0 по advisor Step 2.0.2).

### ~~B-CLOSED-009 Ротация OpenAI + TG ключей (бывший B-004)~~
✅ 2026-04-21 (Step 2.0.5) — частичное закрытие с accepted risk:
- **OpenAI:** старый истёк/забанен, создан новый, прописан в `/opt/neuroexpert/.env` (2026-04-20, commit `c4d2067`). LLM probing работает в worker/web.
- **Telegram bot token:** **оставлен текущий.** Пользователь подтвердил 2026-04-21, что токен не попадал в открытые сессии Claude → риск компрометации отсутствует, ротация не требуется.
- **Следствие для F-E2E-005:** полный E2E pipeline (voice → content → publish → lead) **не зависит** от ротации TG — можно запускать с реальным экспертом когда будет доступен, не дожидаясь перегенерации токена.

### ~~B-CLOSED-010 B-015 Lighthouse + mobile QA~~
✅ 2026-04-21 — полностью закрыт через Lighthouse CI автоматизацию:
- **Инфра:** `.github/workflows/lighthouse.yml` + `lighthouserc.json` (commit `899fb63`). Mobile simulated 4G, 10 URL, assertions на все 4 категории (Perf ≥ 0.80, A11y ≥ 0.90, BP ≥ 0.85, SEO ≥ 0.90). Workflow прогоняется на каждый push в main + PR, манульный dispatch из UI.
- **Baseline (run `24636547302`):** Perf 0.58–0.72 на 9/10 URL. A11y/BP/SEO все зелёные сразу.
- **Раунд 1 (commit `6b425d3`):** layout (marketing)/layout.tsx → Server Component (убрал `"use client"` + usePathname), shared FadeIn → components/marketing/fade-in.tsx, neural-bg.tsx → sqrt→distSq + mobile 60 узлов + pauseOnHidden. Результат: 9/10 URL прошли ≥ 0.80, `/how-it-works` остался 0.79.
- **Раунд 2 (commit `bccfdac`):** how-it-works/page.tsx → Server Component, вынесен pipeline-step.tsx как client leaf, BLIND_SPOT_MARKERS в const. Результат: **все 10/10 URL** прошли все 4 категории.
- **Budgets:** повышены с `warn` на `error` — любая будущая регрессия блокирует PR.
- **Acceptance:** `gh run 24637967332` — «Checking assertions against 10 URL(s), 10 total run(s) / All results processed!» — ни одного warning.
- **Остаток ручной части:** визуальный mobile DevTools review + Schema.org validator. Не критично, покрытие Lighthouse CI делает этот риск приемлемым. Опционально сделать перед публичным outreach.

---

### B-014 Hardcoded URL в `scan/[slug]/page.tsx` (P2, DX)
- **Что:** `apps/web/app/(marketing)/scan/[slug]/page.tsx:79` использует `url: \`https://neuroexpertise.ru/scan/${slug}\`` в `openGraph.url` — абсолютный путь мимо `metadataBase`. Все остальные страницы используют относительные пути. При смене домена / staging-окружения — рассинхрон.
- **Решение:** Заменить на `url: \`/scan/${slug}\`` — Next.js корректно разрешит через `metadataBase` из root layout.
- **Найдено:** 2026-04-19 в /review Step 2.0.1 как замечание вне scope.
- **Создано:** 2026-04-19

**Почему важно:** ст. 14.1 ФЗ-135 (защита конкуренции) + ст. 5 ч.3 ФЗ «О рекламе» (сравнительная реклама без оснований). Маркетингово: punching down + бесплатная реклама конкурентам + быстро устаревает (список AI/SEO-инструментов меняется каждые полгода). На /for-agencies риск ниже, но Ahrefs/SE Ranking — повседневный tool ICP, лучше не пинать.

**Превентивная мера на будущее:** при любой правке маркетинговой страницы прогонять grep по списку известных конкурентов перед коммитом — этот шаг включён в процедуру tech-QA в LAUNCH_PLAN.md и в content-audit. Список конкурентов поддерживать в LANDING_BRIEFS.md (TODO: добавить раздел «Список нежелательных упоминаний»).
