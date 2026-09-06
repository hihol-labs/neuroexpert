# Scope Lock

## Current Task

- **G-013** (активирован 2026-09-06 после verified G-012, tier medium): Proof-слой (фаза B) —
  публичный «пример отчёта» доступен с лендингов (структура отчёта v2 по AEO_PLAN §2), единая
  CTA-цепочка «лид-магнит → аудит → оплата» на всех 9 маршрутах, задел под кейсы.
  **Стадия: РЕАЛИЗАЦИЯ** (план утверждён владельцем 2026-09-06 с пятью решениями — DECISIONS
  2026-09-06, контракт `.itd-memory/contracts/G-013.md`).
  Разрешены: `scripts/verify-proof-layer.mjs` (новый) + `scripts/tests/proof-layer.test.mjs`
  (новый), `scripts/export-example-report.mjs` (новый, read-only к БД); `apps/web/content/
  example-report.json` (новый, фикстура реального отчёта без идентификаторов), `apps/web/content/
  cases.ts` (новый); `apps/web/components/report/report-view.tsx` (новый — рендер, вынесенный из
  страницы заказа), `apps/web/components/marketing/proof-strip.tsx` (новый);
  `apps/web/components/marketing/checkout-context.tsx` (новый) и `apps/web/app/(marketing)/layout.tsx` (провайдер ссылки заказа + force-dynamic — ссылка checkout не запекается в сборку, класс ошибки хотфикса 109be20; расширение scope 2026-09-06 по находке реализации);
  `apps/web/app/orders/[id]/page.tsx` (только замена inline-рендера на ReportView, доступ и
  поведение прежние); `apps/web/app/(marketing)/audit/example/page.tsx` (новый);
  9 маркетинговых страниц (`page.tsx` главной, for-business, for-experts, for-agencies,
  how-it-works, launch, pricing, scan, audit/audit-client.tsx) — только подключение ProofStrip и
  замена захардкоженного `/launch?package=audit_start` на `auditStartHref()` в how-it-works и
  for-business; `apps/web/middleware.ts` (только `/audit/example` в PUBLIC_ROUTES),
  `apps/web/lib/sitemap-xml.ts` (только новый маршрут); `.itd/VERIFICATION_CONTRACT.json`,
  `.itd*`, BACKLOG, CURRENT_PLAN, OPERATIONS, документы плана.
  Запрещены: продюсер отчёта (`packages/shared/src/delivery/**`, worker, `/api/audit`),
  платёжный код, цены, миграции, `llm/*`, выдуманные цифры/кейсы, оффер-блоки других SKU
  (`/launch`, `/for-experts`, `/for-agencies`).
  Операционные тикеты (SEC-2…SEC-5, OPS-2, DEMAND-4, OPS-1) — только по решению владельца.

Предыдущий юнит: **G-012 — VERIFIED 2026-09-06** (ОТК exit 0: `Analytics verification passed for
http://127.0.0.1:13100 (ym-id 112328031)`; коммиты `9f50e93`, `57f9c0a`; full-чекер r2 PASSED;
`g012-high-adjudication.json`; `.deploy-sha=57f9c0a`, образ web пересобран с id; счётчик
112328031, 8 целей, сегмент «AI-трафик» созданы через Management API — контракт
`.itd-memory/contracts/G-012.md`). Его scope сохранён как история: оракул
`scripts/verify-analytics.mjs` + мутационный тест; `apps/web/lib/analytics.ts`,
`apps/web/components/yandex-metrika.tsx`, `apps/web/app/layout.tsx`, продюсеры целей (scan,
audit-client, order-form, for-agencies, `orders/[id]` + `order-paid-goal.tsx`); web.Dockerfile,
compose build args, `.env.example`, OPERATIONS §8c. Запрещалось: цены, платёжный код, `llm/*`,
миграции, кабинет, webvisor, PII в параметрах целей, Plausible.

Предыдущий: **OPS-DEBT-1 — VERIFIED 2026-09-06** (коммиты `7278d02` + `6e4e77f`; full-чекеры
PASSED; `ops-debt-1-fix-adjudication.json`; выкачено `.deploy-sha=6e4e77f`; health `providers`
на проде: wordstat/openai/yandexgpt/gigachat ok, perplexity no_key; канарейка повторного сбора
DEMAND-1 зелёная — `.itd-memory/contracts/OPS-DEBT-1.md`). Его scope сохранён как история:
  DEMAND-3 — проба провайдеров в `/api/health` (состояния `ok|no_key|forbidden|no_balance|empty|
  error|skipped`, кеш 10 мин, `degraded` при Wordstat≠ok или LLM<2); DEMAND-1 — повторный сбор
  для `empty`-пары при `demand_collected_at` старше `PAIR_RECOLLECT_DAYS`=7; файлы: health route,
  `apps/web/lib/providers-probe.ts`, `packages/shared/src/providers/**`, `pairs/index.ts`,
  orders route (claim `empty → queued`), `verify-preflight.mjs` + мутационный тест, OPERATIONS §8b.

Предыдущий: **SEC-1 — VERIFIED 2026-09-06** (коммит `2756623`; full-чекер PASSED;
`sec1-ch-adjudication.json`; выкачено `.deploy-sha=2756623`; живые оракулы ALL_GREEN;
канарейки лимитов и поддельного webhook зелёные — `.itd-memory/contracts/SEC-1.md`).
Его scope сохранён как история:
  закрытие пяти Important security-audit AF-1 — сверка webhook ЮKassa с API кассы,
  rate-limit `POST /api/orders`, bounded-лимитер + дневной бюджет `/api/audit` free,
  лимиты писем GoTrue; файлы: webhook/orders/audit routes, `apps/web/lib/yukassa-verify.ts`,
  `packages/shared/src/orders/reconcile.ts`, `packages/shared/src/security/**`, тесты,
  compose (GoTrue env), оракул + мутационный тест, OPERATIONS §8b.

Публикация: ветка `codex/self-serve-audit-start` (Draft PR #8, guarded push через
`itd pr create`; прямой push в зарегистрированный репозиторий заблокирован хуком ITD —
штатно). Ветка `codex/plan-north-star-marketing-contract` локально та же история.

- **G-012** (активирован 2026-09-05 после verified G-019, tier low): Яндекс.Метрика подключена
  на все публичные маршруты с целями на шаги воронки (лид-магнит, заявка, контакт).
  **Стадия: ПЛАНИРОВАНИЕ.** Последовательность ADR-003 AF-0 → G-018 → G-019 закрыта; порядок
  дальше (включение публичного checkout AF-1 `SELF_SERVE_CHECKOUT=live` или G-012) — решение
  владельца. До утверждённого плана кодовые правки `apps/**` и `packages/**` ЗАПРЕЩЕНЫ —
  разрешены план-документы, `.itd*`, BACKLOG, OPERATIONS.

Предыдущий юнит: **G-019 — VERIFIED 2026-09-05** (ОТК `--stage=delivery` exit 0 через проброс;
канарейка А `83a0bdfe` delivered, возврат по SLA `a02880f7` refunded; adjudication
`receipts/eb47011f10982d56/G-019-general-review-adjudication-a2.json`). Его запись сохранена
ниже как история scope.

- **G-019** (VERIFIED 2026-09-05; активирован 2026-09-05 после verified G-018b, tier high): автономная выдача
  артефакта — worker исполняет job `run_audit` (замер платформ + разрывы + план) и складывает
  отчёт фиксированного формата (контракт Audit Start v1 §2/§3), degraded mode §4, SLA §5,
  авто-возврат §6 при полном провале; `/orders/[id]` показывает статус (в работе → готов) и
  отдаёт отчёт владельцу заказа и только ему; при готовности — письмо; ошибка job переводит
  заказ в failed с видимым клиенту статусом. **Стадия: РЕАЛИЗАЦИЯ.** План и уточнения G-019
  утверждены владельцем 2026-09-05 («утверждаю»).
  Разрешены: scripts/verify-selfserve-path.mjs, scripts/tests/*delivery*,
  scripts/tests/selfserve-path.test.mjs; packages/supabase/migrations/028_audit_delivery.sql;
  packages/shared/src/delivery/**, packages/shared/src/orders/state.ts,
  packages/shared/src/index.ts, packages/shared/tests/*delivery*, packages/shared/tests/orders.test.cjs;
  apps/worker/src/jobs/run-audit.ts, apps/worker/src/services/audit-delivery.ts,
  apps/worker/src/index.ts, apps/worker/tests/*delivery*;
  apps/web/app/api/audit/route.ts, apps/web/app/api/orders/** (режим магазина и отчёт),
  apps/web/app/api/webhooks/yukassa/route.ts (пакетный контур, SLA и возврат),
  apps/web/app/orders/**, apps/web/app/api/health/route.ts (audit_delivery),
  docker-compose.yml / docker-compose.prod.yml (только передача audit env, если нужна),
  документы G-019, .itd/**, .itd-memory/**.
  Уточнения плана имеют приоритет: durable notification/refund, атомарный финал,
  достоверный provenance, готовые локальные пары и свежая успешная канарейка.
  Публичный checkout остаётся dark; цены и llm/* не меняются.

Предыдущий юнит: **G-018b — VERIFIED 2026-09-05** (ОТК exit 0 через проброс к проду; коммиты
`b53dcec`, `736caf3`, `6f9f111`, `9e2d25c`, `469c3b8`; adjudication `receipts/a165e92b4d09237e/…a2`).
Его запись сохранена ниже как история scope.

- G-018b (VERIFIED 2026-09-05; активирован 2026-09-04 после verified G-018, tier high): on-demand пара
  «вертикаль × город» по спецификации вертикалей v1 — при первом интересе создаётся
  строка `niches` (UUID `b…`, slug `<vertical>-<city-slug>`, `city`, `seed_keywords`
  из шаблона 8×3), ставится `collect_demand` по паре, клиенту — экран «готовим замер»
  + email; оплата открывается только после наполнения `questions` по паре (pre-flight
  §6 «данные раньше денег»); активация пар — только после зелёной канарейки.
  **Стадия: РЕАЛИЗАЦИЯ** (план утверждён владельцем 2026-09-04, контракт
  `.itd-memory/contracts/G-018b.md`, план — `SELF_SERVE_PLAN.md` «Юнит G-018b»,
  7 шагов producer-first, шесть решений в `.itd/DECISIONS.md` 2026-09-04).
  Разрешённые области G-018b: `scripts/verify-selfserve-path.mjs` (стадия `pair`;
  стадия `order` не меняется) + `scripts/tests/selfserve-path.test.mjs`;
  `scripts/tests/strategy-docs.test.py` (только фрагмент `**G-018**` → активный юнит —
  регрессия мутационного теста после перевода леджера); `packages/supabase/migrations/027_*.sql`;
  `packages/shared/src/pairs/**` (+ экспорт в `index.ts`) и `packages/shared/tests/pairs.test.cjs`;
  `apps/web/app/api/orders/route.ts` (ветка `vertical`), `apps/web/app/api/health/route.ts`
  (только блок `local_pairs`), `apps/web/app/(marketing)/order/audit-start/**`;
  `apps/worker/src/jobs/collect-demand.ts` (только режим `on_demand`; cron-режим не меняется);
  **расширение 2026-09-05 (санкция владельца «разрешаю расширить scope»):**
  `apps/worker/src/services/wordstat.ts` — только опции `questionsOnly` и `minVolume`
  (порог частотности для пары, env `PAIR_WORDSTAT_MIN_VOLUME`, default 300; без опций —
  прежнее поведение), `packages/shared/src/pairs/**` — фильтр релевантности фраз пары.
  ЗАПРЕЩЕНЫ: cron 003, экспертные ниши `a0000000-…`, `decidePreflight` G-018 (порог 1),
  webhook, `packages.ts` (цены), провайдерный слой `llm/*`, `/audit` бесплатный сканер,
  `service_orders`, `payments`, публичное включение checkout, обработчик `run_audit` (G-019).

Предыдущий юнит: **G-018 — VERIFIED 2026-09-04** (adjudication a1 PASSED, receipt
`receipts/c2a07bc5afe236c3/G-018-adjudication-a1.json`; канарейка через тестовый
магазин: paid + job run_audit). Его запись сохранена ниже как история scope.

- G-018 (VERIFIED 2026-09-04; активирован 2026-09-02 после verified AF-0, tier high): автономный заказ
  и оплата пакета «Аудит Старт» без человека — `/pricing` и `/audit` ведут на оплату,
  `POST /api/orders` создаёт платёж ЮKassa (metadata `{type:"package", package:"audit_start",
  user_id}`) и `orders(status=pending)`; webhook `payment.succeeded` → `paid` + job аудита
  (идемпотентно по `yukassa_payment_id`); неоплаченный заказ работу не запускает.
  **Стадия: РЕАЛИЗАЦИЯ** (план утверждён владельцем 2026-09-03, контракт
  `.itd-memory/contracts/G-018.md`, план — `SELF_SERVE_PLAN.md` «Юнит G-018»).
  Разрешённые области G-018: `packages/supabase/migrations/026_*.sql`;
  `packages/shared/src/orders/**` (+ экспорт в `index.ts`) и `packages/shared/tests/`;
  `apps/web/app/api/orders/**`, `apps/web/app/api/webhooks/yukassa/route.ts` (ветка
  `type:"package"`), `apps/web/app/(marketing)/order/**`, `apps/web/app/orders/**`,
  `apps/web/app/api/audit/route.ts` (только замена `NICHE_NAMES` на чтение из БД),
  `apps/web/app/(marketing)/pricing/**` и `apps/web/app/(marketing)/audit/**` (только
  переключение CTA по флагу; страница разделена на серверную обёртку page.tsx +
  audit-client.tsx — находка чекера 2026-09-03, код перенесён без изменений), `apps/web/app/(marketing)/terms/page.tsx` (§5 — автоматический возврат),
  `apps/web/middleware.ts` (публичность `/order/*`), `scripts/verify-selfserve-path.mjs`
  + `scripts/tests/selfserve-path.test.mjs`. Провайдерный слой `llm/*`, `service_orders`,
  `payments`, цены, публичное включение checkout — ЗАПРЕЩЕНЫ.
  Обязательные входы плана: контракт Audit Start v1 (§1 три поля, §4 порог, §6
  pre-flight «данные раньше денег» и авто-возврат), спецификация вертикалей v1 (город
  свободное поле, on-demand пара), B-024 (оферта → автоматический возврат), QUEUE-2/
  QUEUE-3 (health считает archived отдельно), снятие хардкода `NICHE_NAMES`.

Предыдущий юнит: **AF-0 — VERIFIED 2026-09-02** (adjudication a1 PASSED, receipt
`receipts/2f743297eb118a36/AF-0-adjudication-a1.json`, оракул `verify-preflight.mjs`
exit 0 против прода). Его запись сохранена ниже как история scope.

- AF-0 (ADR-003 ACCEPTED 2026-08-30, VERIFIED): контракты и runtime-preflight автономной delivery.
  Один active unit согласован между `GOAL.json`, `STATE.json` и этим файлом; canary
  magic-link / SMTP / кассы / одного нового `expand_query`; явное решение по 754
  историческим failures (массовый replay запрещён); фиксация SKU, report schema,
  provenance, degraded mode, SLA и refund/failure policy ДО кода приёма денег;
  приведение маркетинговых страниц в соответствие с границей автоматизации.

  Активная последовательность: **AF-0 → G-018 → G-019**. Параллельная разработка
  режимов (Experts E2E, Copilot, Autopilot) запрещена — WIP=1.

## Allowed Change Areas

- `CURRENT_PLAN.md`
- `BACKLOG.md`
- `docs/adr/`
- `docs/plan/SELF_SERVE_PLAN.md`
- `.itd/DECISIONS.md`
- `.itd/SCOPE_LOCK.md`
- `.itd-memory/GOAL.json`
- `.itd-memory/STATE.json`
- `.itd-memory/verification-loop/`
- `scripts/verify-preflight.mjs` (оракул AF-0)
- `scripts/tests/preflight.test.mjs` (мутационный тест оракула preflight — парный
  артефакт, добавлен в scope 2026-08-31 по той же логике, что strategy-docs.test.py)
- `scripts/tests/strategy-docs.test.py` (мутационный тест оракула)
- `scripts/verify-strategy-docs.py` (оракул стратегического пакета: согласованность
  ADR-003 / плана v5 / BACKLOG / SELF_SERVE_PLAN и леджера GOAL/STATE/SCOPE_LOCK)
- маркетинговые страницы платных SKU — ТОЛЬКО текстовая правка границы автоматизации
  (`apps/web/app/(marketing)/pricing/`, `for-business/`, `launch/`, `audit/`)
- `packages/supabase/migrations/025_jobs_archived_status.sql` — ТОЛЬКО этот файл:
  исполнение тикета QUEUE-1 (санкционирован acceptance AF-0 и явным указанием
  владельца 2026-09-01 «делай QUEUE-1»); расширение CHECK jobs.status значением
  archived, других схемных правок нет
- **QUEUE-4 (санкция владельца 2026-09-01 «чини QUEUE-4»)** — ровно четыре
  места: `packages/shared/src/prompts/query-fanout.ts` (+ тест
  `packages/shared/tests/query-fanout.test.cjs`) — нормализация ответа
  провайдера; `apps/worker/src/jobs/expand-query.ts` — пустой fan-out и ошибка
  записи = failed с ошибками обоих провайдеров; `apps/web/app/api/health/route.ts` —
  поле `worker.last_expand_query` (status + subqueries); оракул preflight и его
  тест — канарейка по существу. Провайдерный слой (`llm/*.ts`) не трогается.

## Forbidden Change Areas

- Everything outside the explicit allowed areas above.
- **Цены и публичные SKU** — 7 900 / 31 100 / 29 000 руб. заморожены до gate `AF-1-COMM`
  (3-5 внешних оплат). Pilot-лестница ADR-002 публичные SKU не меняет.
- **Код приёма денег** (`/api/orders`, webhook, package registry) — открывается только
  после закрытия AF-0, в юните G-018.
- **Массовый replay 754 историческх `expand_query` failures** — запрещён; допустимо
  только archive или bounded replay по явному решению внутри AF-0.
- **G-011b** (мультиплатформенность) — `blocked`; не брать в работу, пока не выполнено
  условие выхода: `YANDEX_FOLDER_ID` в прод-env И оплаченный ключ DeepSeek.
- **Публичный checkout — ВКЛЮЧЁН 2026-09-05 (AF-1, `SELF_SERVE_CHECKOUT=live`, боевой
  магазин 1336507).** Выключение обратно в dark — только явным решением владельца; регрессия
  `g018-selfserve-order` в VERIFICATION_CONTRACT переведена на `--checkout live`.

## Review Rule

If the diff touches product code, database migrations, runtime configuration, prices, or any
other area outside the allowed list, pause and obtain explicit scope approval.

Phase C ADR-002 (acquisition) сохраняется как ежедневный последовательный cadence: sales-квота
и запись в `SALES_LOG` выполняются ДО продолжения активного implementation unit. Автоматизация
delivery не даёт права пропускать проверку спроса.
