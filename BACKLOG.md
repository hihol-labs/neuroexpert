# NeuroExpert — Backlog

> Создан: 2026-04-17. Источник: E2E прогон Блока 2.1 LAUNCH_PLAN.md.
> Цель файла: фиксация UX-проблем, технического долга, идей до их решения.
> Формат: тикеты группируются по приоритету (P0 блокер выручки → P3 nice-to-have).

---

## Поправка 2026-09-06 (ADR-004, УТВЕРЖДЕНО 2026-09-06 — действует)

> Гейт перенесён на **2026-10-15** и стал гейтом готовности; фаза C (демо, outreach,
> SALES_LOG) приостановлена до него, G-014 пропущен. Активная последовательность —
> **R-01 → R-13** (`docs/plan/READINESS_PLAN.md`, `CURRENT_PLAN.md` «Readiness-период»).
> Тикеты B-AUTO-*/E-AUTO-* инвентаризаций 2026-09-06 разнесены по юнитам R-*; за гейт
> ушли Launch Start/Managed Lite автоматизация, Local Sales ввод в UI, AEO G-015/G-017.

> **SCAN-1 (2026-09-08, замечание владельца):** GigaChat участвует в платном аудите (`/api/audit`
> пробует ChatGPT, Perplexity, Яндекс.GPT, GigaChat), но в бесплатном сканере `/api/scan` не
> подключён (там ChatGPT, Perplexity, YandexGPT, DeepSeek-по-ключу). Это подпункт G-011b «GigaChat в
> /api/scan»; адаптер уже есть в аудите — маленький хотфикс (≤0,5 дня) сразу после R-02, отдельным
> коммитом, без ожидания ключа DeepSeek.

## Реприоритизация 2026-08-30 (ADR-003, УТВЕРЖДЕНО 2026-08-30 — действует)

> Заменяет реприоритизацию ADR-002 в части очередности delivery. Целевая модель —
> автоматический core для Business и Experts; сотрудники только
> support/exception/optional consulting.
> Phase C сохраняется как последовательный daily cadence: sales-квота и
> `SALES_LOG` выполняются до единственного активного implementation unit.
> Активная последовательность: **AF-0 → G-018 → G-019**.
> **G-011b (мультиплатформенность) — `blocked`**, не закрыт: ждёт
> `YANDEX_FOLDER_ID` и оплаченный ключ DeepSeek; при выполнении условия
> возвращается в очередь без нового решения владельца.
> Цены не меняются до 3-5 внешних оплат (gate `AF-1-COMM`).

### P0 — доказать автономную delivery

> **Схема идентификаторов.** `AF-P{приоритет}-{n}` — номер строки бэклога, `AF-0…AF-5` / `G-018` / `G-019` — канонические исполнимые блоки из `CURRENT_PLAN.md` и `GOAL.json`. Каждая строка ниже помечена своим каноническим блоком; работать и закрывать юниты нужно по каноническому номеру.

- **AF-P0-1 → канонический `AF-0`. Governance/runtime preflight:** один active unit; auth/email/payment/provider canary; решение по 754 historical `expand_query` failures без массового replay; server-authoritative package registry; report/provenance/SLA/refund contract.
- **G-018. Business Audit Start order/payment:** dark launch, authenticated owner, idempotent ЮKassa flow, неоплаченный заказ не запускает job.
- **G-019. Business Audit Start delivery:** fixed source-backed artifact, owner-only dashboard/email, visible failed/retry; публичное включение только после общего payment E2E.
- **AF-P0-2 → канонический `AF-2`. Experts self-service E2E:** `register/pay → demand → voice → draft → approval → publish → analytics`; 10 внешних экспертов, ≥80% без поддержки.

### P1 — превратить разовый результат в SaaS

- **AF-P1-1 → канонический `AF-3`. Shared recurring loop:** повторный замер, ДО/ПОСЛЕ, следующая задача и уведомление. Вход: первая внешняя автономная оплата + подтверждённое повторное использование + recurring price/cost model.
- **AF-P1-2 → канонический `AF-4`. Business Copilot:** evidence-backed tasks/drafts для карточек, отзывов, страниц и follow-up; writes только после approval/policy клиента.
- **AF-P1-3 → канонический `AF-3` (экспертная ветка того же shared loop, не отдельный блок). Expert Growth Loop:** новый спрос, обновление контента, CTA/leads и следующая возможность без сотрудника.
- **AF-P1-4 → канонический `AF-5`. Bounded Autopilot:** один connector/action за раз; shadow mode, allowlist, budgets, audit trail, rollback и kill switch.

### P2 — масштабирование

- **AF-P2-1 → после `AF-5`. Business Autopilot subscription:** Managed становится программным monitoring/action loop, а не оплатой delivery-часов.
- **AF-P2-2 → после `AF-5`. Teams/multi-location/API:** филиалы, роли, quotas, billing и партнёрская выдача без ручной сборки отчётов.
- **AF-P2-3 → вне блоков (коммерческая упаковка). Optional expertise:** консультация и guided setup продаются отдельно и не блокируют получение основного результата.

### Icebox до собственного safety/economics gate

- необратимые/high-impact действия: бюджеты, цены, массовый outbound, CRM delete/merge, refunds, кризисные и регулируемые публичные ответы;
- одновременный запуск нескольких write-коннекторов;
- бессрочные повторные замеры внутри разового Audit Start без recurring тарифа;
- автоматизация, которая скрывает ручную работу сотрудников за интерфейсом SaaS.

## Репиритизация 2026-08-14 (ADR-002, УТВЕРЖДЕНО 2026-08-14 — действует)

- **P0 — Must do:** только юниты плана v3 из `CURRENT_PLAN.md` (фазы A/B/C: деплой-путь + smoke + SHA-проверка, воронка CTA, приём денег счётом/ссылкой, proof-слой, 60-дневный цикл продаж).
- **P1 — Should do:** наполнение FEEDBACK_LOG ретроспективно по демо.
- **Фаза D (после 5 оплат):** auth (magic link → пароль/OTP), полная интеграция ЮKassa.
- **Icebox (до 5 оплат):** все продуктовые фичи этапов 6-17 CURRENT_PLAN, все тикеты этого файла ниже, если они не чинят конкретный шаг воронки. Из icebox тикет выходит только через чекпоинты ADR-002 (2026-09-28 промежуточный, 2026-10-15 финальный).

### Icebox-дополнения 2026-08-22 (из утверждённого AEO_PLAN.md, с условиями выхода)

- **AEO-ICE-1. Ключ YandexGPT в сканер** — **АКТИВИРОВАН 2026-08-27** явным указанием пользователя (см. `.itd/DECISIONS.md`), вошёл в юнит G-011b (**статус `blocked` с 2026-08-30** — ждём ключи). API-ключ сервисного аккаунта получен; ждём `YANDEX_FOLDER_ID`. В UI называть «YandexGPT», не «Алиса» — у Алисы нет публичного API, подмена = overclaim.
- **AEO-ICE-2. DeepSeek в панель сканера** (9,4% RU по Mediascope) — **АКТИВИРОВАН 2026-08-27** явным указанием пользователя, вошёл в юнит G-011b (**статус `blocked` с 2026-08-30** — ждём оплату ключа); адаптер написан (641e8fe), ключ пользователь оплатит.
- **AEO-ICE-3. Мониторинг-дашборд/алерты (gptfox-класс), абонентка как автоматизированный продукт.** Выход: 5 поставленных аудитов + письменная методика (G-017) — то же условие. Риск: официальные инструменты Яндекс/Сбер обесценят ручной мониторинг.
- **AEO-ICE-4. SaaS/white-label мониторинга для агентств.** Выход: 5 поставленных аудитов + письменная методика (G-017) — то же условие.
- **AEO-ICE-5. «Беклинк с усилением», контент-фабрика 10-15 статей/мес.** Уровень пакета сопровождения; выход: первая оплата сопровождения.

### Тикеты из юнита G-011 (2026-08-30)

- **PAY-1. `/pay` в дизайн-системе Signal Room и в release smoke.** Сейчас страница сделана в стиле юридического кластера (`/requisites`, `/terms`) — простая вёрстка без Signal Room-разметки, поэтому не входит в route-matrix `scripts/verify-canonical-release.mjs` (он проверяет Signal Room-маркеры). Выход из icebox: после первой оплаты, когда станет понятно, какой вид шага оплаты реально нужен покупателю.
- **PAY-2. Тестовый платёж 100 ₽ на проде** (шаг Gate A плана). Ручной шаг фаундера по `docs/founder-payment-runbook.md`; машиной не эмулируется сознательно.
- **PAY-4. `.itd/` не отслеживается git — strict completion-gate без baseline.** Каталог контрактов методологии (`VERIFICATION_CONTRACT.json`, `COMPLETION_POLICY.json`, `SCOPE_LOCK.md` и прочие) существует только в рабочем дереве: `git ls-files .itd` пуст. Из-за этого хук `completion-gate.sh` на high-risk кандидате не может сверить контракт с последним source-checkpoint и блокирует коммит («verification contract is not present in the approved source checkpoint»). Коммит G-011 прошёл через аудируемый `COMPLETION_BYPASS`. Решение — отдельным коммитом добавить `.itd/` в репозиторий (сначала проверив, что там нет секретов и генерируемого мусора); это решение пользователя, а не побочный эффект продуктового юнита.
- ~~**QUEUE-1. Исполнить архивацию 754 `expand_query`**~~ **ВЫПОЛНЕНО 2026-09-01** (решение 2026-08-30, `.itd/DECISIONS.md`; санкция владельца на оба шага). Миграция 025 (`archived` в CHECK, коммит `a586167`) применена; построчный снимок ДО мутации — server-side артефакт `/opt/neuroexpert/.itd-artifacts/queue1-snapshot-2026-09-01.csv.gz` (sha256 `4c242d70…`, 754 строки; локальная копия не скачана — линк WARP рвёт передачи >2КБ, забрать при живом канале); UPDATE атомарным DO-блоком с защитой `ROW_COUNT=754`. Итог на проде: `archived=754, failed=0`, `failed_jobs` в health очищен. Откат при необходимости: обратный UPDATE по тому же предикату.
- ~~**QUEUE-4. Канарейка `expand_query` 2026-09-01 — «пустой успех» (silent failure).**~~ **ВЫПОЛНЕНО 2026-09-02:** `b2b0c12` выкачен (web + worker, гейтовый артефакт), провайдер worker'а переключён `LLM_PRIMARY_PROVIDER=openai` / `LLM_FALLBACK_PROVIDER=gigachat` (бэкап `.env.bak-2026-09-01`), повторная канарейка `a806eacf…` — `completed, attempts=1, subqueries=5`, 5 строк в `sub_queries`; `verify-preflight.mjs` с прода: единственная находка — `SALES_LOG.md`. История тикета: Один новый job (`0edfc837…`, вопрос `c4c80f95…` «как по английски», education) завершился `completed, attempts=1, result={"subqueries":0}`, в `sub_queries` — 0 строк. Primary (Claude) упал: `400 credit balance is too low` (Anthropic API — **нужно пополнение баланса владельцем**); fallback (OpenAI) вернул не-массив/пустой ответ без исключения. Два дефекта: (а) `expand-query.ts:60-63` считает пустой fan-out успехом и помечает job `completed` — это ровно «silent failure», запрещённый ADR-003/AF-1 («0 silent failures»); job обязан уходить в `failed` с ошибкой обоих провайдеров (связано с QUEUE-2); (б) оракул `verify-preflight.mjs` проверяет canary по `worker.by_type.expand_query.completed >= 1` — на пустом успехе он ПОЗЕЛЕНЕЕТ, хотя fan-out не состоялся; health должен отдавать факт созданных `sub_queries` (или последний `result`), а оракул — требовать его. До закрытия (а)+(б) канарейка AF-0 **не считается пройденной**, AF-0 не verified. **Статус 2026-09-01: (а) и (б) починены в коде — коммит `b2b0c12`** (root cause подтверждён: OpenAI `json_object` не допускает top-level массив при промпте-массиве → fallback на OpenAI для `expand_query` не срабатывал никогда; добавлены `normalizeFanoutResponse` + 6 тестов, пустой fan-out/ошибка insert → `failed` с ошибками обоих провайдеров, health отдаёт `worker.last_expand_query`, оракул требует `completed && subqueries>=1`). **Осталось:** выкатить `b2b0c12` (web + worker), повторить ОДНУ канарейку. Пополнение Anthropic для канарейки не обязательно — при живом OpenAI fallback теперь срабатывает; без Claude primary каждый job платит один лишний быстрый 400 — решение владельца: сменить `LLM_PRIMARY_PROVIDER` worker'а на `gigachat` (живой, оплачен) или `openai`, либо пополнить API-баланс Anthropic (подписка Claude Max API не покрывает).
- **QUEUE-2. `expand_query` теряет первичную ошибку.** `expand-query.ts:52-57` сохраняет в `jobs.error` только сообщение fallback-провайдера, ошибка primary уходит в stdout контейнера. Из-за этого причину падения нельзя разложить на первичную и вторичную по данным БД. Нужно писать обе (и в `error`, и в `result`), иначе следующая волна падений диагностируется так же вслепую.
- **QUEUE-3. `/api/health` не отделяет исторический хвост от свежих падений.** `failed_jobs` включает архивируемые 754, поэтому новое падение на 3-5 задач в этом фоне не видно. После `QUEUE-1` health обязан считать `archived` отдельно, а `failed_jobs` — только живые падения. Без этого у автономной delivery нет честного сигнала.
- **OPS-1. Постоянный канал к проду (Tailscale) — решение владельца 2026-09-04, выполнить ПОСЛЕ закрытия G-018b.** Диагноз 2026-09-04: VPN-клиент рабочей станции перехватывает адрес прода — `neuroexpertise.ru` резолвится в `198.18.80.33` (диапазон локального перехвата), `ping 185.221.213.104` отвечает за 0.6 мс от самого клиента, SSH виснет на banner exchange, HTTPS не проходит; локальный прокси `127.0.0.1:8899` доходит до sshd нестабильно (1 успех из 4). Каждая выкатка упирается в канал. Решение: поставить Tailscale на прод (через bypass-правило VPN или веб-консоль хостера), после чего прод доступен по адресу `100.x.y.z` поверх любого VPN. Приёмка: `ssh` на tailnet-адрес из WSL при включённом VPN отвечает, `deploy.sh` проходит целиком без обрывов. **Обходной путь 2026-09-05 (работает):** WSL не имеет прямого интернета, весь трафик идёт через Windows-мост `0.0.0.0:8899` (см. `~/wsl-tls-forward.js`); SSH к проду — `-o 'ProxyCommand=nc -X connect -x 127.0.0.1:8899 %h %p'`, линк флапает («banner exchange» / «UNKNOWN port 65535»), поэтому каждая команда в цикле до 8 попыток; живые оракулы — локально через `ssh -N -L 13100:127.0.0.1:3100`.

### Тикеты из security-audit AF-1 и юнита SEC-1 (2026-09-06)

- ~~**SEC-1. Пять Important security-audit AF-1.**~~ **ЗАКРЫТО 2026-09-06** (коммит `2756623`, выкачено, канарейки на проде): webhook ЮKassa меняет статус заказа/платежа только после сверки с API кассы (`GET /v3/payments`, `/v3/refunds`; поддельные `payment.succeeded`/`payment.canceled` с XFF из allowlist отвергнуты); rate-limit `POST /api/orders` (5/10 мин на IP, 3/час на email); бесплатный `/api/audit` — bounded-лимитер + суточный бюджет `AUDIT_FREE_DAILY_BUDGET`; GoTrue `GOTRUE_SMTP_MAX_FREQUENCY=15s`, `GOTRUE_RATE_LIMIT_EMAIL_SENT=60`. Отчёт аудита: `.itd-memory/verification-loop/reports/af1-security-audit-2026-09-05.md`.
- **SEC-2. Ротация секретного ключа боевого магазина ЮKassa — ЗАКРЫТ 2026-09-08 решением владельца: «ротации не будет».** Ключ передавался в чат 2026-09-04/05; риск принят владельцем осознанно, тикет не переоткрывать без нового инцидента. Процедура на случай компрометации остаётся в OPERATIONS: новый ключ в ЛК кассы → `.env` → `up -d --force-recreate web worker`.
- **SEC-3. Лимитеры in-memory → Redis при масштабировании web.** `SlidingWindowLimiter`/`DailyBudget` живут в процессе одного контейнера `web`; при втором инстансе лимиты станут «на инстанс». Выход: второй контейнер web или переезд на управляемый хостинг.
- **SEC-4. Политика X-Forwarded-For на Traefik.** IP-allowlist webhook берёт первый адрес из XFF; доверие заголовку зависит от `forwardedHeaders.trustedIPs` Traefik (вне репо, не проверялось). После SEC-1 allowlist — только первый рубеж (источник истины — API кассы), поэтому P2: задокументировать/зафиксировать trustedIPs в конфиге прокси.
- **SEC-5. Minor из аудита:** security headers/CSP в Next (`next.config` headers или Traefik middleware), email в логах worker (маскировать), `next` в `/auth/callback` (сейчас закрыт allow-list GoTrue — оставить проверку префикса `/` в коде).

### Тикеты из юнита G-018b (2026-09-05)

- ~~**DEMAND-1. Политика повторного сбора для пары в `empty`.**~~ **ЗАКРЫТО 2026-09-06 (OPS-DEBT-1, `7278d02`):** `decidePairPreflight` разрешает повтор, если `demand_collected_at` старше `PAIR_RECOLLECT_DAYS`=7 (`empty → queued`); без отметки времени повтор не ставится (ручной сброс, как раньше). Остаток — DEMAND-4 ниже. Исходный текст: Сейчас после честного `empty` повторный `collect_demand` по паре не ставится никогда (`decidePairPreflight`: enqueue только при `demand_status IS NULL`); единственный путь — ручной сброс `demand_status` оператором (так делались канарейки 3 и 4). Нужно правило: авто-повтор через N дней (`demand_collected_at`) или после смены источника/баланса; учесть OTP-лимиты и расход XMLRIVER. Выход: первая реальная пара, упавшая в `empty`.
- **DEMAND-2. Релевантность города в фразах спроса.** `isRelevantPairPhrase` требует термин вертикали, но не город: в выборке dental × Тюмень прошла «стоматология колпино» (чужой город) и «стоматология для детей» (без города). Варианты: приоритет фраз с городом, стоп-лист чужих топонимов, `WORDSTAT_REGIONS` по городу пары. Не блокирует: порог 10 набран с запасом (74).
- **PAIR-2. Health должен отдавать «активные пары без оплаченного заказа» (2026-09-09, R-05).** Оракул `--stage=pair` требовал `local_pairs.active = 0`; с R-03 пара активируется оплатой, с R-05 cron реально собирает по ней спрос, поэтому живые прогоны идут с выключателем `SELFSERVE_PAIRS_ACTIVATED=1`. Настоящий инвариант: активной может быть только пара с оплаченным заказом; его нужно отдать в health и проверять вместо выключателя, иначе «самопроизвольная» активация не будет поймана.
- **TG-PROXY-1 (P0, инцидент 2026-09-26). Прокси Telegram не отвечает.** `TG_PROXY_URL` (хост `72.56.184.139`) не отвечает даже на `example.com`; напрямую `api.telegram.org` с Hostland заблокирован. Бот после пересоздания (R-08) падает в цикле перезапуска на `deleteWebhook`; Telegram-канал уведомлений эксперту фиксируется как `failed`, письма уходят. Нужен рабочий прокси (владелец) → `up -d --force-recreate bot`. Проверка: `curl -x "$TG_PROXY_URL" https://api.telegram.org` с сервера.
- **SEC-TG-1 (P1, 2026-09-26). Токен бота попадает в логи.** При сетевой ошибке grammY пишет в stderr полный URL `api.telegram.org/bot<token>/…`: токен виден в `docker logs docker-bot-1` и попал в журнал рабочей сессии R-08. Рекомендация владельцу — перевыпустить токен у @BotFather и обновить `TELEGRAM_BOT_TOKEN`; в коде — маскировать токен в логах ошибок бота.
- **NOTIFY-2 (2026-09-26, R-08).** Блок «Рекомендуемые чаты для вашей ниши» в уведомлении «опубликовано» не переносился: карта `apps/web/lib/niche-channels.ts` пуста с Фазы 0 (файл без потребителей). Когда карту заполнят — перенести в shared и подключить в `formatExpertNotification`.
- **NOTIFY-3 (2026-09-26, R-08).** Уведомления «новые темы» (`generate-orders`) и «контент устарел» (`refresh-content`) остаются только в Telegram — перевести на `notify_expert` (e-mail всегда).
- **BOOK-1 (2026-09-26, R-08).** У записей на консультацию нет обработки «подтвердить / отменить» (кнопки убраны из уведомления, раньше они ничего не делали). **LEADS-1:** `/api/leads` доверяет `expert_id` из тела без проверки существования и публичности профиля.
- **MACHINE-1 (2026-09-26, методология).** Квитанция machine хранит только хэши вывода — упавшую команду нельзя разобрать без повторного прогона. Сохранять хвост stdout/stderr упавших команд.
- **PGRST-1. Неоднозначный embed `niches(...)` из `profiles` (2026-09-19, R-07).** У `profiles` две связи с `niches` (FK `niche_id` и `expert_niches`); PostgREST отклоняет embed без подсказки (PGRST201, HTTP 300), supabase-js отдаёт `data = null` без исключения. В R-07 исправлены каталог `/experts` и сервис публикации. Остались: `api/v1/experts`, `api/v1/machine-profiles`, `api/compare`, `api/match`, `api/v1/blind-spots`, бот `/status` — проверить каждый запрос из `profiles` и заменить на `niches!profiles_niche_id_fkey(...)`; добавить needle-проверку в оракул.
- **R07-M1. Форма FAQ: `save()` берёт состояние из замыкания (2026-09-19, Minor full-чекера R-07).** Символы, набранные за время сетевого запроса сохранения, могут быть перезаписаны после успеха. Данные в БД не портятся. Фикс: функциональный `setFaq((cur) => …)`.
- **CSRF-1. Проверка origin для остальных POST с cookie-сессией (2026-09-18, R-06).** В R-06 проверку origin (`isSameOriginPost`, `apps/web/lib/expert-orders.ts`) получили только `/api/expert-orders/*`. `/api/voice`, `/api/publish`, `PATCH /api/orders/[id]` и другие state-changing роуты с cookie-сессией полагаются на SameSite cookie. Вынести хелпер в общий `lib/` и применить ко всем таким роутам отдельным юнитом.
- **R06-M1. `backToOrders`: база редиректа только из конфигурации (2026-09-18, Minor full-чекера R-06).** Сейчас `NEXT_PUBLIC_APP_URL || request.url`; при пустом env база берётся из запроса. Привести к тому же config-only правилу, что `isSameOriginPost`.
- **PAIR-1. Коллизия 5-буквенных основ.** `pairKeywordStems` даёт «автос» для «автосервис», что ложно принимает фразы про автосалон (находка чекера 2026-09-05, minor). Фикс: основа 6 букв для слов длиннее 8 или явный словарь основ в `local_verticals`.
- ~~**DEMAND-3. Баланс XMLRIVER в health.**~~ **ЗАКРЫТО 2026-09-06 (OPS-DEBT-1, `7278d02`):** `/api/health` отдаёт `providers` (Wordstat/OpenAI/YandexGPT/GigaChat/Perplexity → `ok|no_key|forbidden|no_balance|empty|error|skipped`) и `providers_summary`; `degraded`, если Wordstat не `ok` или живых LLM < 2; кеш 10 мин; оракул preflight краснеет на degraded. Остаток — OPS-2 ниже. Исходный текст: Пустой баланс даёт «успешный» сбор с 0 фраз (канарейка 2: `empty` без единой ошибки). Добавить в `/api/health` пробу баланса Wordstat (или счётчик «0 фраз при 0 ошибок» как degraded) — иначе новые пары молча уходят в `empty`.
- **DEMAND-3 (дополнение 2026-09-05):** второй случай за сутки — YandexGPT отдавал 403 из-за блокировки облака по биллингу (−2,04 ₽), отчёты тихо уходили в `degraded`. Проба провайдеров в health должна различать «нет ключа», «нет прав/биллинга», «нет баланса».
- ~~**DARK-1. Письмо «данные готовы» ведёт на dark-страницу.**~~ **СНЯТ 2026-09-05:** checkout включён (AF-1), `/order/audit-start` отвечает 200; allow-list GoTrue расширен (AUTH-1). Исходный текст: Magic-link из `collect-demand.ts` (on_demand) редиректит на `/order/audit-start?vertical=…&city=…`, а страница отвечает 404, пока `SELF_SERVE_CHECKOUT != live` — владелец получил письмо канарейки 4 (2026-09-05) и не смог пройти по ссылке (вторая возможная причина — VPN рабочей станции не пропускает HTTPS к сайту). До AF-1: либо не слать письмо в dark, либо вести на страницу статуса пары вне dark. Снимается автоматически при включении checkout. Не входит в G-019.
- ~~**AUTH-1. Magic-link после оплаты вёл на главную.**~~ **ИСПРАВЛЕНО НА ПРОДЕ 2026-09-05 (конфиг).** Причина: `GOTRUE_URI_ALLOW_LIST` (из `ADDITIONAL_REDIRECT_URLS` в `.env`) разрешал только `/auth/callback` и `/auth/callback?next=/dashboard`; ссылки писем G-018/G-019 (`?next=/orders/<id>`) и G-018b (`?next=/order/audit-start…`) не проходили allow-list, GoTrue после успешного входа редиректил на Site URL (главную). Добавлены шаблоны `https://neuroexpertise.ru/auth/callback?next=/orders/*` и `…?next=/order/audit-start*`, auth пересоздан (бэкап `.env.bak-2026-09-05-auth`). Остаток долга: перенести в `.env.example`/`OPERATIONS.md` (сделано в OPERATIONS §9) и учесть в `deploy.sh`/`generate-env.sh`, чтобы свежий сервер не потерял правило.
- **OPS-2. Таймаут пробы провайдеров (15 с) больше таймаута docker-healthcheck web (10 с).** Находка full-чекера OPS-DEBT-1 (minor): при холодном кеше (раз в 10 мин) и зависшем провайдере один healthcheck может не уложиться; смягчено `retries: 3` и кешем (не более одного медленного ответа за окно). Варианты: `PROBE_TIMEOUT_MS` 8 с, либо пробу считать в фоне и отдавать последнее известное состояние (`stale`), либо отдельный лёгкий путь для docker-healthcheck. Без спешки: на проде первая проба через проброс укладывалась.
- **DEMAND-4. Worker при исключении в on_demand-job сбрасывает `demand_status` в null.** Находка full-чекера OPS-DEBT-1 (minor, файл `apps/worker/src/jobs/collect-demand.ts` не менялся): для нового пути повтора (`empty → queued → running`) сбой попытки снимает недельный лимит `PAIR_RECOLLECT_DAYS` (следующий POST поставит сбор сразу). Фикс: при сбое возвращать `empty`, если `demand_collected_at` уже есть, иначе `null`. Вне scope OPS-DEBT-1 (worker запрещён), делать отдельным маленьким юнитом.
- **PAY-3. Ветка отката `deploy.sh` не покрыта рантайм-тестом** (тикет с 2026-08-27, остаётся открытым). Захват точки возврата переведён на `docker inspect` живого контейнера, но сам сценарий отката по-прежнему проверяется только статически.

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

### B-024 Оферта `/terms` §5.1 — привести к автоматическому возврату Audit Start (P1, в G-018)
- **Что:** Оферта описывает возврат по заявлению на email (`apps/web/app/(marketing)/terms/page.tsx:128`), а «Контракт продукта Audit Start v1» (`docs/plan/SELF_SERVE_PLAN.md`, ACCEPTED 2026-08-31) требует автоматического 100% возврата при полном провале замера — без заявки и без сотрудника (ADR-003). Контракт строже оферты, клиенту хуже не становится, но текст надо выровнять.
- **Кто:** Claude, в юните G-018 вместе с кодом возврата (правка `/terms` вне scope AF-0).
- **Acceptance:** §5 оферты явно описывает автоматический возврат при невыполнении замера Audit Start; заявление на email остаётся для остальных случаев.
- **Создано:** 2026-08-31 (фиксация контракта Audit Start, AF-0).

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

### ~~B-022 Content audit P2/P3 + cross-site minor (P2)~~
✅ 2026-04-22 — закрыт одним пакетом (B-022 polish commit). Сводно:
- **P2-1 ✅** `/audit` CTA: добавлен подзаголовок «Без карты · Регистрация 2 минуты · Первый контент-пакет бесплатно» вместо запрошенного «за 72 часа» (SLA worker pipeline не гарантирует end-to-end — цепочка зависит от действий эксперта: регистрация → заказ → голос → approve → publish; решили не overclaim).
- **P2-2 ✅** `/for-experts/page.tsx:45` PAINS[4]: «Специалисты с худшей квалификацией собирают аудиторию. Вы невидимый.» → «Специалисты с меньшим опытом собирают аудиторию благодаря активному ведению соцсетей. Вас — не видно.»
- **P2-3 ✅** `/find-expert/page.tsx`: заменён собственный header на `MarketingHeader`, добавлен `MarketingFooter`. Закрывает cross-site C7 автоматически. **Визуальный долг:** footer тёмный на белой странице — выделено в B-023.
- **P2-4 ✅** `/audit` loading: добавлено «мы проверяем 10 вопросов на 4 платформах, поэтому дольше, чем Scanner».
- **P3-1 ✅** `/for-agencies:206` success emoji 📬 → ✅ (унификация с `/for-business:164`).
- **P3-2** `/audit` прогресс-бар вместо спиннера — оставлен в backlog как P3.
- **P3-3** Footer ссылка `t.me/neuroexpertise` — проверка на пользователе (не код).
- **P3-4 ✅** `/how-it-works` таблица: `~5%` / `10-15%` / `20-30%` → добавлен `*` маркер + footnote «Ориентир по отраслевым данным 2024. Реальные значения зависят от ниши, конкуренции, качества ответов и регулярности публикаций».
- **Cross-site C7 ✅** закрыт вместе с P2-3.
- **P3-2 остаётся** как nice-to-have, новый тикет создавать не надо.

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

### ~~B-014 Hardcoded URL в `scan/[slug]/page.tsx`~~
✅ 2026-04-22 — `url: \`https://neuroexpertise.ru/scan/${slug}\`` → `url: \`/scan/${slug}\``. Next.js резолвит через `metadataBase` из root layout (`apps/web/app/layout.tsx:17`). Закрыт одним коммитом вместе с B-022.

### B-023 `/find-expert` — тёмная тема как у остальных лендингов (P3)
- **Что:** `apps/web/app/find-expert/page.tsx` использует `bg-white` + светлую типографию (`text-gray-900`, `text-gray-600`). После подключения `MarketingHeader` + `MarketingFooter` (B-022 P2-3) header/footer тёмные (`bg-[#0a0e1a]/80`, `bg-[#040714]/60`), основной контент — белый. Визуальный разрыв между шапкой/подвалом и content body.
- **Решение:** Перевести страницу на тёмную схему — `bg-transparent` (наследует от root layout), заменить `text-gray-900` → `text-white`, `bg-white` у expert cards → `bg-white/5 border-white/10`, blue-акценты → cyan/blue из брендовой палитры.
- **Зависимости:** LANDING_BRIEFS.md — подтвердить что `/find-expert` должен быть в dark theme.
- **Создано:** 2026-04-22 (B-022 /review I-2).

**Почему важно:** ст. 14.1 ФЗ-135 (защита конкуренции) + ст. 5 ч.3 ФЗ «О рекламе» (сравнительная реклама без оснований). Маркетингово: punching down + бесплатная реклама конкурентам + быстро устаревает (список AI/SEO-инструментов меняется каждые полгода). На /for-agencies риск ниже, но Ahrefs/SE Ranking — повседневный tool ICP, лучше не пинать.

**Превентивная мера на будущее:** при любой правке маркетинговой страницы прогонять grep по списку известных конкурентов перед коммитом — этот шаг включён в процедуру tech-QA в LAUNCH_PLAN.md и в content-audit. Список конкурентов поддерживать в LANDING_BRIEFS.md (TODO: добавить раздел «Список нежелательных упоминаний»).
