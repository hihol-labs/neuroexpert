# Scope Lock

## Current Task

- **R-05** (активирован 2026-09-08 после verified R-04b, tier medium): Хранилище и cron экспертов —
  миграция создаёт private bucket `voice` с политикой; бот заливает аудио в Storage; upload в
  `/api/voice` обязателен (ошибка → 500, не «принято»); health проверяет `cron.job`
  (weekly-demand, generate-orders) и последний запуск; оракул
  `node scripts/verify-expert-path.mjs --stage=infra` пишется первым. **Стадия: ПЛАНИРОВАНИЕ** —
  контракт `.itd-memory/contracts/R-05.md` (ещё не написан; диагноз по коду — первый шаг).
  Разрешены (после плана): `scripts/verify-expert-path.mjs` (+ тест), миграция 031 (bucket `voice`
  + политика), `apps/bot/*` (заливка аудио), `apps/web/app/api/voice/route.ts` (обязательный
  upload), `apps/web/app/api/health/route.ts` (cron.job), OPERATIONS, `.itd*`, BACKLOG,
  CURRENT_PLAN, READINESS_PLAN. Запрещены: цены, реестр пакетов, checkout-флаг, касса,
  Business-контур (R-01..R-04b — только регрессии). Операционные тикеты — по решению владельца.

Предыдущий юнит: **R-04b — VERIFIED 2026-09-08** (ОТК exit 0 через проброс: «Preflight verification
passed for http://127.0.0.1:13100» с `--check-paid-alert`, квитанция `r04b-otk-adjudication-3.json`;
канарейка `70c3c6aa` — владелец оплатил тестовой картой, алерт в админ-чате, `operator_alerts`
count=1, `paid → delivered` за 62 с). Ниже — история юнита.

- **R-04b** (= R-04'; вставлен и активирован 2026-09-08 по решению владельца «вариант (а), делай
  R-04' и дальше R-05»; tier medium): триггер чека самозанятого — при переходе заказа Audit Start
  в `paid` (webhook и сверка R-01) оператор получает алерт `order_paid` в админ-чат (сумма, email
  клиента, id и ссылка на заказ, напоминание выбить чек в «Мой налог»); дедуп по заказу (ключ
  `order_paid:<id>`, гонка webhook/сверка → одно сообщение); алерт не ломает оплату
  (fire-and-forget). Оракул `node scripts/verify-preflight.mjs --check-paid-alert` пишется первым.
  **Стадия: ВЫКАЧЕНО, ЖДЁТ КАНАРЕЙКУ** (2026-09-08): коммит `46b021a`, targeted r1→r3 (два Minor
  исправлены) и full-чекер committed head PASSED, review-кеш `r04b-gr-adjudication.json`, гейт
  `r04b-ch-adjudication.json` ALLOWED, `.deploy-sha=46b021a` (web+worker, миграций нет), live-оракулы
  ALL_GREEN, ОТК-квитанция `r04b-otk-adjudication.json` (точная команда живьём, exit 0).
  **Инцидент канарейки:** заказ `39402498…` ушёл в боевой магазин (при live-checkout заголовок
  обходил только 404) — отменён без списания. Фикс `560f4d9` + `211c14c` + `2b77741`: под
  канареечным заголовком магазин всегда тестовый (`shopMode`), оракул `--check-paid-alert` покрывает
  все точки выбора магазина (49 мутаций), full-чекер PASSED, `.deploy-sha=2b77741`. L3: канареечный
  заказ **тестового** магазина `70c3c6aa-142f-4fda-8f86-7ea8f981e699` (`payment_test=true`, сверено по
  БД) ждёт оплаты владельцем тестовой картой → `r04b-canary.py observe` (алерт `order_paid:<id>` в
  админ-чате с «тест: да», count=1) → `itd_goal_verify.py R-04b` → verified. Контракт
  `.itd-memory/contracts/R-04b.md`. Разрешены:
  `scripts/verify-preflight.mjs` (+ `scripts/tests/preflight.test.mjs`), shared `ops/alerts.ts`
  (новый kind), `apps/web/app/api/webhooks/yukassa/route.ts` (только вызов алерта внутри
  `if (t.changed)` paid-ветки), `apps/worker/src/services/payment-reconcile.ts` (алерт в markPaid),
  тесты shared/worker, OPERATIONS §9b, `.itd*`, BACKLOG, CURRENT_PLAN, READINESS_PLAN. Запрещены:
  цены, реестр пакетов, checkout-флаг, касса (`receipt` — R-04 blocked), экспертный контур.
  R-05 возвращён в `pending` (ручной фоллбэк; кода по нему не было) — следующий после R-04b.

Ранее активированный (2026-09-08, без кода): **R-05** (tier medium): Хранилище и cron экспертов —
  миграция создаёт private bucket `voice` с политикой; бот заливает аудио в Storage; upload в
  `/api/voice` обязателен (ошибка → 500, не «принято»); health проверяет `cron.job`
  (weekly-demand, generate-orders) и последний запуск; оракул
  `node scripts/verify-expert-path.mjs --stage=infra` пишется первым. **Стадия: ПЛАНИРОВАНИЕ** —
  контракт `.itd-memory/contracts/R-05.md` (ещё не написан; диагноз по коду — первый шаг).
  Разрешены (после плана): `scripts/verify-expert-path.mjs` (+ тест), миграция 031 (bucket
  `voice` + политика), `apps/bot/*` (заливка аудио), `apps/web/app/api/voice/route.ts`
  (обязательный upload), `apps/web/app/api/health/route.ts` (cron.job), OPERATIONS, `.itd*`,
  BACKLOG, CURRENT_PLAN, READINESS_PLAN. Запрещены: цены, реестр пакетов, checkout-флаг, касса,
  Business-контур (R-01..R-03 — только регрессии). Операционные тикеты — по решению владельца;
  R-04' (алерт `order_paid`) — только после решения владельца, отдельным юнитом.

Предыдущий юнит: **R-04 — BLOCKED 2026-09-08** (активирован после verified R-03, tier **high**): чек
  самозанятого через `receipt` ЮKassa невозможен — ЮKassa прекратила сервисы для самозанятых с
  29.12.2025 (changelog 2025-12-23), `GET /v3/me`: `fiscalization_enabled=false` у обоих магазинов.
  Леджер: `--block` с причиной; чек — ручное исключение (ADR-004). **Кода нет и не будет до решения
  владельца:** (а) R-04' «алерт оператору при `paid`» (kind `order_paid` в канале R-02, S) или
  (б) пропуск к R-05. Контракт `.itd-memory/contracts/R-04.md` (диагноз сохранён). Исходно
  разрешались (после плана):
  `scripts/verify-payment-path.mjs` (+ тест), `apps/web/app/api/orders/route.ts` (только блок
  `receipt` в теле платежа), shared `orders/*` (сборка receipt), `payment-reconcile`/webhook
  (фиксация статуса чека при необходимости), миграция при необходимости, `.itd*`, BACKLOG,
  CURRENT_PLAN, OPERATIONS, READINESS_PLAN. Запрещены: цены, реестр пакетов, checkout-флаг,
  ключи кассы (SEC-2 — владелец), экспертный контур, `pay-consultation`/`subscribe` (за гейтом).
  Операционные тикеты (SEC-2…SEC-5, OPS-2, DEMAND-4, OPS-1) — только по решению владельца.
  Хотфикс **SCAN-1** (GigaChat в `/api/scan`, BACKLOG) — отдельным коммитом по решению владельца.

Предыдущий юнит: **R-03 — VERIFIED 2026-09-08** (ОТК exit 0 через проброс: «Self-serve delivery
stage verification passed for http://127.0.0.1:13100» с `--check-details`; коммит `7a12ab4`;
targeted r1 → находка Important (prompt-injection через details) → редизайн: текст клиента в LLM
не передаётся, детерминированная пометка `clientMentions`; targeted r2 + full committed-head
PASSED (Minor: substring-поиск hostname без границ слова — информационная пометка); квитанции
`r03-gr-adjudication.json` (review-кеш), `r03-ch-adjudication.json` (pre-deploy гейт),
`r03-otk-adjudication.json` (ОТК); `.deploy-sha=7a12ab4`, миграций нет; worker 24 handlers без
`track_geo_services`; live-оракулы ALL_GREEN). Scope сохранён как история: worker `audit-delivery.ts`
(details в теле), web `api/audit/route.ts` (`sanitizeDetails`, `clientMentions`,
`annotateClientMentions`), shared `orders/pair-activation.ts` + вызовы в webhook и
`payment-reconcile`, `send-email-digest` через `createMailer` (bcc), удалены `services/resend.ts`,
`jobs/track-geo-services.ts`, `RESEND_API_KEY`; оракул `--check-details` + 14 мутаций; OPERATIONS §9c.

Предыдущий: **R-02 — VERIFIED 2026-09-08** (ОТК exit 0 через проброс: «Preflight verification
passed for http://127.0.0.1:13100» с `--check-alerts`; коммиты `e67bc8a`, `af898fb`, `2805086`,
`54476d2`, `b872579`, `0f1483c`, `78b107e`, `5f644ab`; targeted r2 + full r7 PASSED (семь раундов:
гонка INSERT в claim, await алертов, гонка sweep/run по SLA, exception-путь причины, канареечный
шум в run и refund); квитанции `r02-gr-adjudication.json`/`r02-fix*-adjudication.json` (review-кеш),
`r02-ch-adjudication.json` (pre-deploy гейт), `r02-otk-adjudication.json` (ОТК); `.deploy-sha=5f644ab`,
миграция 030 применена; канарейка — реальная заявка `da3a08ae` → сообщение в админ-чат, дедуп RPC
`f`/count=2, health `alerts {sent_24h:1, failed_24h:0}`, live-оракулы ALL_GREEN, providers все `ok`
включая Perplexity). Scope сохранён как история: shared `ops/{alerts,notify-operator}.ts`, миграция
030, worker `services/operator-alerts.ts` + hooks в `audit-delivery.ts`/`payment-reconcile.ts`/`index.ts`,
web `lib/operator-alerts.ts` + `service-orders` + health `alerts`, оракул `--check-alerts` + мутации,
гигиена `selfserve-path.test.mjs`, OPERATIONS §9b, `.env.example`.

Предыдущий: **R-01 — VERIFIED 2026-09-08** (ОТК exit 0 через проброс: «Self-serve reconcile
stage verification passed for http://127.0.0.1:13100»; коммит `f640f3b`; full-чекеры r4 (staged)
и committed head PASSED; квитанции `r01-gr-adjudication.json` (review-кеш), `r01-ch-adjudication.json`
(pre-deploy гейт), `r01-otk-adjudication-4.json` (ОТК); `.deploy-sha=f640f3b`, миграция 029 применена
с бэкапом `/root/backup-before-029-2026-09-08.sql`; канарейки ALL_GREEN; канареечный pending-заказ
`0980cd52` ждёт протухания через 24 ч — проверить в R-02). Его scope сохранён как история:
`scripts/verify-selfserve-path.mjs` (+ мутационный тест, exact-tree раннер `reconcile-candidate.py`),
`packages/shared/src/orders/{state,reconcile}.ts`, миграция 029, worker `services/{payment-reconcile,
mailer,audit-delivery}.ts`, `emails/package-order.ts`, `jobs/run-audit.ts`, `index.ts`; web webhook,
`orders/[id]/page.tsx`, health; OPERATIONS §9a, `.env.example`.

Контекст очереди: **ADR-004 ACCEPTED 2026-09-06** — readiness gate 2026-10-15, фаза C
приостановлена, последовательность R-01 → R-13 (`docs/plan/READINESS_PLAN.md`); G-015/G-016/G-017
за гейтом (G-015 деактивирован без кода), G-011b blocked, G-014 skipped.

Пропущен: **G-014 — SKIPPED 2026-09-06** (решение владельца: enforcement продаж/SALES_LOG
не нужен до готовности 100%; контракт-черновик `.itd-memory/contracts/G-014.md` сохранён на
случай возврата к фазе C).

Предыдущий юнит: **G-013 — VERIFIED 2026-09-06** (ОТК exit 0 с `PROOF_URL` через проброс:
«Proof-layer verification passed for http://127.0.0.1:13100»; коммиты `3bc7d57`, `d5891a3`;
targeted + full чекеры PASSED; `g013-high-adjudication.json`; `.deploy-sha=d5891a3`; живые
оракулы ALL_GREEN, `/audit/example` на проде — контракт `.itd-memory/contracts/G-013.md`).
Его запись сохранена ниже как история scope.

- **G-013** (VERIFIED 2026-09-06; активирован 2026-09-06 после verified G-012, tier medium): Proof-слой (фаза B) —
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
