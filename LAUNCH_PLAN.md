# NeuroExpert — Пошаговый план запуска под цель 2M ₽/мес к декабрю 2026

> Создан 2026-04-16. Обновлён 2026-04-17 (порядок шагов Block 2, дашборд, раздел «Что НЕ потеряно»).
> Следующая сессия Claude Code читает этот файл первым.

## 📊 Статус (обновлять после каждой сессии)

**Прогресс:** Block 1 ✅ · Block 2 🔶 (~55%) · Block 3-6 ⬜
**Текущая фаза:** Pre-outreach (Step 2.0.5 + 2.2 — оба на пользователе)
**Следующий шаг:** Step 2.0.5 — ротация OpenAI + TG ключей (на пользователе) ИЛИ Step 2.2 ЮKassa (на пользователе). При получении любого — Claude продолжит.
**Активные блокеры P0:** Step 2.2 ЮKassa ключи · Step 2.0.5 новые OpenAI + TG токены · B-015 ручная Tech QA (mobile/Lighthouse) — все на пользователе.

**Что новое 2026-04-20:**
- Content P1-pack из Step 2.0.2 ✅ — закрыты B-016..B-019 + B-021 (5 тикетов). Правки: +GigaChat в 2 места /how-it-works, убран «SSR < 1 сек» до B-015 Lighthouse QA, дисклеймер к кейсу Анны на /for-experts, `*`-footnote с «По отраслевым данным 2024» для 86%/58% + 500K+, «0 аналогов/конкурентов» → «Первая RU-платформа», ₽-эквивалент к $99 на /for-agencies.
- LANDING_BRIEFS.md синхронизирован — homepage и /for-experts обещания обновлены, правило запрета «0 аналогов» зафиксировано.
- **E2E Smoke Test ✅ вскрыл 5 critical findings** (см. BACKLOG F-E2E-001..005). P0: на проде `iptables FORWARD policy DROP` + UFW блокировал весь outbound из Docker → продукт **не работал 2 дня** (0 jobs / 0 leads / 0 scans). Fixed iptables + persistent UFW rules. Обновлён OpenAI key + proxy. Добавлен `TELEGRAM_ADMIN_CHAT_ID`. Обнаружено: `api.telegram.org` заблокирован на Hostland ЦОД — создан helper `tgFetch` через `undici.ProxyAgent`, все 12 TG callsites перешли на proxy routing. Bot полноценно заработал (polling) впервые с deploy.
- **F-E2E-005 (P1)**: Full E2E pipeline (voice → content → publish → lead) никогда не прогонялся на проде — нужен Phase 2-3 прогон с реальным экспертом после ротации TG bot token.

**Что новое 2026-04-19:**
- Step 2.0.1 Tech QA ✅ (auto) — 3 finding зафикшены (commit `1dba85a`). Ручная часть → B-015.
- Step 2.0.2 Content audit ✅ — /advisor нашёл 4 P0 overclaim/gap, все зафикшены на проде (commit `a38ddd5`). P1-P3 + cross-site в BACKLOG B-016..B-022. Закрыты B-CLOSED-003..008 + B-011 + B-020.
- Step 2.0.3 LANDING_BRIEFS.md синхронизирован — use-case /for-agencies переписан (убраны цифры без данных), добавлена секция /privacy.
- Step 2.0.4 BACKLOG.md — добавлены все findings Step 2.0.1 + 2.0.2.
- Остаётся Step 2.0.5 (rotation) — на пользователе.
**Известные P0/P1 из BACKLOG.md (страховка):**
- B-004 Ротация OpenAI + TG ключей (security, перед outreach) — см. Step 2.0.5
- B-005 Backend tier-логика для API ключей — отложена до 1-го платящего Pro
- B-006 Маркетинговые лендинги в middleware whitelist — DX improvement
- B-007 PostgREST schema cache automation — DX improvement
- B-013 Pricing bundles / cross-sell — после 1-го платящего в каждом канале
- **B-015 Ручная часть Step 2.0.1 Tech QA** (mobile 375/768px + Lighthouse ≥80 + Schema.org validator) — на пользователе, **перед** outreach. Auto-часть закрыта 2026-04-19.

**Что новое 2026-04-17:**
- Worker `claim_job` 404 закрыт (миграция 018)
- `/for-agencies` лендинг + `/api/agency-leads` задеплоены
- LANDING_BRIEFS.md создан (источник правды контента)
- Hybrid стратегия выбрана (B2C-пилоты + B2B-API параллельно)
- Step 2.2 ЮKassa **перед** Step 2.1 E2E (E2E требует working subscription payment)
- Step 2.5 Knowledge API soft launch вынесен из Block 4.4 в Block 2 (параллельно 2.3)

## Цель
**2M ₽/мес MRR к декабрю 2026** из 5 потоков выручки:
1. **B2C subscription** (эксперты) — Starter/Pro/Expert/Business
2. **Marketplace commission** (% от платных консультаций)
3. **Premium placement** (эксперты платят за `is_featured`)
4. **B2B subscription** (клиники/юрфирмы/edu)
5. **Knowledge API Licensing** (SEO-агентства → Blind Spots data)

## Философия

- **Architectural decisions FIRST**
- **Validation BEFORE monetization**
- **Multi-sided marketplace + Data monetization**
- **Каждый шаг имеет acceptance criteria** — как убедиться что работает

---

## 📋 Общие процедуры проверки

### Как проверить AI-цитирование (процедура постоянная)

**Ручная проверка (для валидации работоспособности трекинга):**
1. Опубликуй статью эксперта через дашборд (например `/experts/ivan-petrov/kak-vybrat-psihologa`)
2. Подожди 72 часа (минимум — Google нужно время индексировать)
3. Открой **ChatGPT** (chat.openai.com) и задай вопрос по теме статьи, например: "Как выбрать психолога для взрослого"
4. Проверь: цитирует ли ChatGPT твою статью? Есть ли ссылка на neuroexpertise.ru? Упомянут ли автор (Иван Петров)?
5. Повтори для **YandexGPT** (ya.ru → Алиса → режим GPT), **Perplexity** (perplexity.ai), **GigaChat** (через Telegram-бот @gigachat_bot)
6. Результат сохрани: скриншот + дата + вопрос. Это кейс для маркетинга.

**Автоматическая проверка (через Worker):**
- Worker-задача `track_citations` (шаг 11) запускает `probeAI` по 4 платформам раз в сутки
- Проверка в БД:
  ```sql
  SELECT platform, COUNT(*), MAX(created_at) FROM citation_checks GROUP BY platform;
  ```
- Должно быть ≥4 записей/статью/месяц, по 1 на платформу каждые 7 дней

### Как запустить локальный dev

```bash
cd /home/hihol/projects/neuroexpert
pnpm install
pnpm --filter web dev       # http://localhost:3000
pnpm --filter bot dev       # Telegram-бот в polling
pnpm --filter worker dev    # Background jobs
```

### Как проверить прод после деплоя

```bash
# 1. Базовые endpoints
curl -sI https://neuroexpertise.ru/api/health      # 200 OK
curl -sI https://neuroexpertise.ru/                 # 200
curl -sI https://neuroexpertise.ru/pricing          # 200
curl -sI https://supabase.neuroexpertise.ru/       # 200 или 404 от Kong

# 2. Контейнеры на сервере (185.221.213.104)
ssh hostland 'docker ps | grep docker-'             # 8 контейнеров UP

# 3. Логи
ssh hostland 'docker logs docker-web-1 --tail 20'
ssh hostland 'docker logs docker-bot-1 --tail 10'
```

---

### Как проверить лендинг — технический QA (после каждой правки)

**Когда:** после любой правки страницы в `apps/web/app/(marketing)/` или связанного API.
**Ожидаемое время:** 5-7 минут на лендинг.
**Источник правды для CTA:** `LANDING_BRIEFS.md`.

**Чек-лист (для одного лендинга):**

1. **HTTP-статус страницы и всех CTA:**
   ```bash
   ssh hostland 'curl -sk -o /dev/null -w "%{http_code}\n" https://neuroexpertise.ru/<URL>'
   # ожидаемо 200 (не 307/404/500)
   ```
   Каждая ссылка из секции CTA в `LANDING_BRIEFS.md` → curl → 200.

2. **Middleware whitelist:** убедись что путь есть в `apps/web/middleware.ts` PUBLIC_ROUTES (иначе 307 на `/login`).

3. **Форма (если есть):**
   ```bash
   # пустое тело — должна быть валидация
   ssh hostland 'curl -sk -X POST -H "Content-Type: application/json" -d "{}" -o /dev/null -w "%{http_code}\n" https://neuroexpertise.ru/api/<form-endpoint>'
   # ожидаемо 400
   # валидное тело — должна вернуть 200 + сработать сайд-эффект (TG-уведомление / запись в БД)
   ```

4. **Schema.org / OG-теги (если страница SSR):**
   - https://validator.schema.org/ — без ошибок
   - https://www.opengraph.xyz/url/<URL> — превью корректное

5. **Mobile responsive:** Chrome DevTools → Device Toolbar → проверить iPhone SE (375px) + iPad (768px). Текст не выходит, кнопки нажимаемы.

6. **Performance (Lighthouse, опционально):** ≥ 80 Performance, LCP < 2.5s, CLS < 0.1.

7. **Сверка с `LANDING_BRIEFS.md`:** все CTA, числа, обещания совпадают с брифом. Расхождение → либо обновить страницу, либо обновить бриф.

**Output:** OK / список расхождений → в `BACKLOG.md` как P0/P1/P2.

---

### Как провести content-аудит лендингов (раз в месяц / перед outreach)

**Когда:**
- Перед началом outreach (Шаг 2.0)
- Раз в месяц как regression
- После крупного редизайна (3+ страниц)

**Ожидаемое время:** 30-60 минут на 9 страниц.

**Процедура:**

1. **Запуск:** в Claude Code сессии:
   ```
   /advisor — content-аудит всех маркетинговых лендингов NeuroExpert по критериям: адекватность, тех. грамотность, понятность для ICP. Используй subagents business-analyst + devils-advocate.
   ```
   `/advisor` параллельно запускает business-analyst (market fit) + devils-advocate (overclaims, противоречия).

2. **Что проверяет:**
   - **Адекватность:** обещания соответствуют реальному функционалу; числа консистентны между страницами и кодом (`apps/web/lib/subscription.ts`)
   - **Тех. грамотность:** AI/нейросеть/LLM/GPT — корректное разделение; jargon уместен для ICP; API-термины (Bearer, Schema.org, JSON-LD) — для нужной аудитории
   - **Понятность:** холодный пользователь поймёт без расшифровки; CTA однозначны; длина предложений; англицизмы

3. **Output:** отчёт со структурой Executive Summary → По каждой странице (P0/P1/P2/P3 findings) → Cross-site проблемы → Рекомендации.

4. **Действия после:**
   - Все P0 (расхождение с реальностью / overclaim / юридический риск) → исправить **до** outreach
   - P1 → исправить в течение недели
   - P2/P3 → внести в `BACKLOG.md` с приоритетом

5. **Обновить `LANDING_BRIEFS.md`** если контент менялся. Бриф = источник правды для следующего аудита.

---

## 🏗️ БЛОК 1 — Фундамент (Неделя 1-2)

### ⭐ Шаг 1.1 — Sanner без регистрации (1-2 дня)

**Цель:** превратить `/scan` в главную воронку продаж.

**Действия:**
- [x] Убрать auth-middleware с `/scan` — уже в `PUBLIC_PREFIXES` (middleware.ts)
- [x] Генерация `scan_id` — используем slug (идемпотентный, shareable, SEO-friendly). UUID не нужен
- [x] Хранение результата — `scan_results` таблица (Supabase). Redis избыточен для single-server
- [x] Share-link `/scan/[slug]` — роут + OG-теги + share-кнопки (TG/VK)
- [x] CTA в конце отчёта (два):
  - Primary (B2C): динамический текст по visibility% + конкурент → `/register?from=scan&niche=...`
  - Secondary (B2B): "Агентство? Blind Spots API от $99/мес" → `/for-business`
- [x] Rate limit 3/час/IP — in-memory rate limit в `/api/scan/route.ts`

**Как проверить что работает:**

1. Открой в **режиме инкогнито** (Ctrl+Shift+N) `https://neuroexpertise.ru/scan`
   - ✓ Страница открывается, нет редиректа на /login
   - ✓ Форма выбора ниши работает, можно ввести данные

2. Пройди сканер с любой нишей (например "психолог Москва")
   - ✓ Появляется loader на 10-30 сек
   - ✓ Результат отображает проверку по 4 AI: ChatGPT/YandexGPT/Perplexity/GigaChat
   - ✓ Показан % невидимости ("Вас нет в 3 из 4 AI")
   - ✓ Внизу два CTA-блока (Primary для экспертов, Secondary для агентств)

3. Скопируй URL после сканера (должен быть вида `/scan/abc123-def456-...`)
   - ✓ Открой в другом браузере/инкогнито — тот же результат виден

4. Нажми Primary CTA
   - ✓ Редирект на /register с pre-filled формой (email если ввёл, ниша)

5. Нажми Secondary CTA
   - ✓ Редирект на /api-keys/pricing

6. Попробуй прогнать 4 сканера за 5 минут с одного IP
   - ✓ 4-й раз показывает "Превышен лимит 3 сканирования/час"

**Файлы для правки:** `apps/web/app/(marketing)/scan/page.tsx`, `app/scan/[slug]/page.tsx`, `middleware.ts`, `/api/scan/route.ts`

---

### ⭐ Шаг 1.2 — Result-based pricing + гарантия (30 мин)

**Действия:**
- [x] `/pricing`: headline каждого платного тарифа = гарантия цитирований + ссылка на /terms#guarantee
- [x] `/terms`: создана страница с секцией "Гарантия результата" (id=guarantee), условия возврата, исключения
- [x] `/analytics`: баннер прогресса "N/M цитирований к гарантии" с прогресс-баром (по тарифу)

**Как проверить:**

1. Открой `https://neuroexpertise.ru/pricing`
   - ✓ Каждый тариф показывает гарантированное число цитирований и период
   - ✓ Рядом с ценой: "или возврат 100%"
   - ✓ Ссылка на /terms → секция "Гарантия"

2. Зарегистрируйся как эксперт (magic link на свою почту)
3. Зайди в дашборд → `/analytics`
   - ✓ Вверху баннер: "Прогресс: 0/5 цитирований к гарантии"
   - ✓ Баннер обновляется после того как цитирование появилось в `citation_checks`

4. Проверь /terms
   - ✓ Раздел "Гарантия результата" — условия возврата прописаны

**Файлы:** `app/(marketing)/pricing/page.tsx`, `app/terms/page.tsx`, `app/(dashboard)/analytics/page.tsx`

---

### ⭐ Шаг 1.3 — Шаблон страниц экспертов как мини-лендингов (2-3 дня)

**Цель:** каждая SSR-страница = посадочная с **двойным CTA**.

**Действия:**
- [x] **Hero-блок** — H1 = question_text (уже было)
- [x] **Trust block:** avg_rating звёзды + review_count + число цитирований AI + verification badge ✓
- [x] **Social proof:** секция отзывов (top 3, is_published) на article page + ссылка на все отзывы
- [x] **Conversion CTA (ДВА):**
  - Primary: BookingForm (выбор слота из expert_schedule)
  - Secondary: Lead form (существующая — имя, контакт, сообщение)
- [x] **Booking widget** — BookingForm импортирован на article page
- [x] **Analytics events** — ArticleAnalytics component: article_view + cta_view (IntersectionObserver)

**Как проверить:**

1. Опубликуй статью эксперта через дашборд (`/content/new` → запись → publish)
2. Открой публичный URL (например `https://neuroexpertise.ru/experts/ivan-petrov/kak-vybrat-psihologa`)
3. Проверь **все блоки**:
   - ✓ Hero-заголовок с болью (например "Как выбрать психолога для взрослого?")
   - ✓ Trust block: "Иван Петров, 10 лет опыта, закончил МГУ, работает в Института Психологии"
   - ✓ Trust Score звезды/цифра
   - ✓ Badge ✓ "Верифицирован" (если is_verified=true)
   - ✓ Отзывы секция (или "Пока нет отзывов" с кнопкой "Оставить")
   - ✓ Primary CTA "Записаться на консультацию" (плавающая кнопка)
   - ✓ Secondary CTA "Похожая статья" → lead form

4. Нажми Primary CTA:
   - ✓ Открывается booking widget со слотами из `expert_schedule`
   - ✓ Выбор слота → форма (имя, контакт)
   - ✓ Редирект на ЮKassa для оплаты
   - ✓ После оплаты — возврат на thank-you page

5. Нажми Secondary CTA:
   - ✓ Форма (email, телефон) → сохраняется в `leads`
   - ✓ TG-уведомление эксперту в @neuroexpert_bot

6. Открой DevTools → Network → Filter `/api/events`
   - ✓ При scroll до Primary CTA — event `cta_primary_view`
   - ✓ При клике — event `cta_primary_click`

7. Проверь Schema.org:
   - Открой https://validator.schema.org/ и вставь URL
   - ✓ Article + Person + FAQPage + BreadcrumbList без ошибок

**Файлы:** `app/experts/[slug]/[articleSlug]/page.tsx` + `components/article/Hero.tsx`, `TrustBlock.tsx`, `ConversionCTA.tsx`, `BookingWidget.tsx`

---

### Шаг 1.4 — Архитектурная подготовка (1 день)

**Действия:**
- [x] Миграция 016: `referrals` + `settings` (cpa_rate_rub, cpa_enabled) + RLS
- [x] API `/api/referrals/payout` — заготовка 501 Not Implemented
- [x] `settings` таблица в миграции 016
- [x] Миграция 017: `api_keys` + `tier` (free/pro/enterprise), `monthly_limit`, `requests_this_month`, `month_reset_at`
- [x] `lib/subscription.ts`: Business (24990) и Enterprise (99990) уже есть
- [x] Комиссии: Free 15%, Starter 7%, Pro 3%, Expert 0%, Business 0% — корректно

**Как проверить:**

```bash
# На проде
ssh hostland 'docker exec -i docker-supabase-db-1 psql -U postgres -d postgres <<SQL
\d referrals
\d api_keys
\d settings
SELECT * FROM settings;
SQL'
```
- ✓ Таблица `referrals` содержит новые поля
- ✓ Таблица `api_keys` содержит `tier` и `monthly_limit`
- ✓ Таблица `settings` существует и содержит `cpa_rate_rub`, `cpa_enabled` (false на старт)

```bash
# API endpoint
curl -I https://neuroexpertise.ru/api/referrals/payout
# ✓ Ответ 501 Not Implemented (заготовка работает)
```

---

## 🧪 БЛОК 2 — Product Validation (Неделя 3-4)

### Шаг 2.0 — Pre-outreach Landing Readiness (½ дня) 🆕

**Цель:** не отправлять холодные письма пилотам и агентствам пока 1 битая ссылка или несоответствие может убить лида. Обязательный gate перед 2.3 (пилоты) и 2.5 (Knowledge API outreach).

**Substeps (выполнять в порядке):**

#### 2.0.1 Тех. QA каждого лендинга (по процедуре «Как проверить лендинг — технический QA») ✅ 2026-04-19
- [x] `/` — главная
- [x] `/for-experts`
- [x] `/for-business`
- [x] `/for-agencies`
- [x] `/pricing`
- [x] `/how-it-works`
- [x] `/audit`
- [x] `/scan`
- [x] `/terms`
- [x] `/find-expert`

**Findings (commit `1dba85a`):** F-001 duplicate title на 7 страницах, F-002 унаследованный og:title/description на 10/10, F-003 /api/audit → 404 вместо 400 на пустом теле. Все закрыты: B-CLOSED-003/004 в BACKLOG.md. Ручная часть (mobile responsive 375/768px, Lighthouse, Schema.org validator) не проходилась — требует Chrome DevTools у пользователя.

#### 2.0.2 Content audit (по процедуре «Как провести content-аудит лендингов») ✅ 2026-04-19
- [x] Запустить `/advisor` с subagents business-analyst + devils-advocate
- [x] Получить отчёт по всем страницам (P0/P1/P2/P3)
- [x] Все P0 (расхождения с реальностью, overclaims, противоречия) — **исправить до outreach**
- [x] P1-P3 — занести в `BACKLOG.md`

**Findings (commit `a38ddd5`):** 4 P0 overclaim'а зафикшены: (P0-1) USE_CASES /for-agencies переписан на формат вывода API без неподкреплённых цифр; (P0-2) /scan получил подсказку «В /audit — 4 платформы»; (P0-3) /pricing — строка «Гарантия цитирований» в comparison + дисклеймеры для Free/B2B + убран скрытый overclaim «API» из Enterprise desc; (P0-4) создан /privacy — 6 разделов по ФЗ-152. Bonus: закрыт strategy-gap B-020 (убран Knowledge API из features /for-business Enterprise). 7 тикетов B-016..B-022 для P1/P2/P3/cross-site в BACKLOG.md.

#### 2.0.3 Обновить `LANDING_BRIEFS.md` после правок ✅ 2026-04-19
Бриф синхронизирован: use-case /for-agencies (убраны цифры), добавлена секция /privacy, таблица лендингов обновлена (убран статус «отсутствует» у /privacy).

#### 2.0.4 Зафиксировать в `BACKLOG.md` все findings + время устранения ✅ 2026-04-19
B-016..B-022 создано; B-CLOSED-005..008 + B-011 + B-020 закрыты.

#### 2.0.5 Ротация OpenAI + Telegram токенов (B-004 в BACKLOG, P1 security) 🔐
**Почему здесь:** ключи могли быть скомпрометированы (упоминались в открытом виде в чате прошлых сессий). Перед публичным outreach — обязательная санация.
- [ ] OpenAI: platform.openai.com → API keys → revoke старый → создать новый → прописать в `/opt/neuroexpert/.env`
- [ ] Telegram: @BotFather → `/token` → revoke → новый → прописать
- [ ] `docker compose -f docker/docker-compose.prod.yml restart bot worker web`
- [ ] Проверка: запросом со старым OpenAI ключом → 401; bot отвечает в TG; LLM probing работает в логах worker

**Acceptance criteria Step 2.0:**

- [ ] 0 P0-findings (всё критическое исправлено)
- [ ] Все 200 на CTA, формы валидируются
- [ ] LANDING_BRIEFS.md синхронизирован с продом
- [ ] BACKLOG.md содержит свежие P1-P3 findings
- [ ] Старые OpenAI/TG ключи отозваны, новые работают

**Когда применяется gate:**
- Перед началом outreach (Шаг 2.3 пилоты-эксперты)
- Перед Шагом 2.5 Knowledge API soft launch
- После любого редизайна 3+ страниц

---

### Шаг 2.1 — Финализация Phase 0 (4-5 дней)

**⚠️ Зависимость:** Step 2.2 (ЮKassa активация) должен быть выполнен **раньше** этого шага. Подшаг 0.6/0.7/0.8 проверки subscription включают редирект на ЮKassa и оплату — без ключей этот тест физически нельзя пройти.

Каждый подпункт проверяется отдельно:

**0.5 Голосовой ввод:**
- Зайди в /content/new → Нажми запись
- Скажи 30-секундное описание любой боли клиента
- ✓ Transcript появляется на экране
- ✓ Follow-up вопросы (2-3)
- ✓ Ответы → нажми "Готово"
- ✓ Job создался в таблице `jobs` со status `queued`
- ✓ Worker picks up → генерирует 5 форматов (telegram, SEO article, cards, reels, FAQ)

**0.6 Пакет контента:**
- Перейди в /content/[id]
- ✓ 5 вкладок (Telegram, SEO, Cards, Reels, FAQ) — каждая содержит готовый текст
- ✓ Счётчик слов у SEO-статьи ≥2900
- ✓ Кнопки Save (сохраняет правки) и Publish (меняет статус на published + триггерит revalidation)
- ✓ Поле meta_title и meta_description редактируемые

**0.7 Публичная страница:**
- После publish → `/experts/[slug]/[articleSlug]`
- ✓ SSR-рендер корректный (view-source показывает весь контент)
- ✓ Schema.org JSON-LD в `<script>`
- ✓ OG-теги, canonical, robots=index,follow
- Проверь в GSC через 1-3 дня: страница в индексе

**0.8 Форма заявки:**
- На публичной странице → форма "записаться"
- Заполни → submit
- ✓ POST /api/leads вернул 200
- ✓ Запись в `leads` таблице
- ✓ TG-уведомление эксперту в @neuroexpert_bot
- ✓ Заявка видна в дашборде /leads

**0.9 Marketplace:**
- `/experts` → фильтры работают (поиск, сортировка, ниша, опыт, Trust Score)
- `/find-expert` → AI-matching возвращает 3-5 экспертов с match%
- `/compare` → выбор 2-3 экспертов → side-by-side таблица
- Клик на эксперта → открытие профиля с booking-виджетом

**0.10 TG-бот:**
- `/start` → приветствие + главное меню
- `/orders` → список заказов (или empty state)
- `/record` → инструкция по записи голосового
- `/status` → дашборд с метриками
- Отправь голосовое — проверь транскрипцию

**0.11 Scanner с открытым режимом** (из Шаг 1.1 проверки)

---

### Шаг 2.2 — ЮKassa активация (1 день)

**Действия:**
- [ ] Получить ключи в ЛК ЮKassa
- [ ] Вписать в `/opt/neuroexpert/.env`:
  - `YUKASSA_SHOP_ID=...`
  - `YUKASSA_SECRET_KEY=...`
  - `YUKASSA_WEBHOOK_SECRET=...`
- [ ] Перезапустить web: `docker compose -f docker/docker-compose.prod.yml restart web`
- [ ] В ЛК ЮKassa настроить webhook URL: `https://neuroexpertise.ru/api/webhooks/yukassa`

**Как проверить подписку:**

1. Зарегистрируйся как эксперт на /register
2. Перейди `/billing` → выбери тариф Starter (1 490₽)
3. Редирект на ЮKassa → оплата тестовой картой (5555 5555 5555 4444, ЮKassa тест-режим)
4. Redirect на thank-you page
5. Проверь в БД:
   ```sql
   SELECT tier, payment_status FROM profiles WHERE user_id = '...';
   -- tier=starter, payment_status=active
   ```
6. Проверь `payments` таблицу — запись есть
7. Webhook лог:
   ```bash
   ssh hostland 'docker logs docker-web-1 --tail 50 | grep yukassa'
   # Должно быть "Webhook received: payment.succeeded"
   ```

**Как проверить split-payment консультации:**

1. Эксперт настроил `yukassa_account_id` в своём профиле
2. Клиент заходит на `/experts/[slug]/[article]` → booking → оплата 3 000₽
3. ЮKassa split: 2 790₽ → эксперту, 210₽ (7%) → платформе (на тарифе Starter)
4. Проверь `bookings` таблицу + `payments` — запись с split
5. В Excel-отчёте ЮKassa увидеть 2 транзакции (к эксперту и к платформе)

---

### Шаг 2.3 — 3-5 пилот-экспертов (2-3 дня)

**Действия:**
- [ ] Список из 5-10 знакомых с разными нишами
- [ ] Предложение через TG/Email: "Бесплатно 90 дней Pro + 0% комиссия первые 3 консультации"
- [ ] Получить от каждого согласие на публичный кейс

**Как проверить:**
- ✓ Минимум 3 соглашения подписаны (email/TG)
- ✓ Каждый зарегистрирован в системе, ручками в БД выставлено `tier=pro`, `trial_ends=...+90 days`

---

### Шаг 2.4 — Полный цикл с пилотами (1 неделя)

**Для каждого эксперта:**

1. Записать 3-5 голосовых на реальные боли его ЦА
2. Сгенерировать контент (4-5 пакетов)
3. Опубликовать 3 статьи (в разные ниши)
4. Ждать 72ч, проверить AI-цитирование вручную (по процедуре в начале плана)
5. Разослать публичные ссылки в соцсети эксперта
6. Получить хотя бы 1 заявку через форму "записаться"
7. Провести 1 платную консультацию через booking (по возможности)

**Acceptance criteria Блока 2 (B2C-канал):**
- [ ] 3+ эксперта опубликовали 3+ статей каждый
- [ ] Минимум 5 статей в индексе Google (проверить GSC)
- [ ] Минимум 1 зафиксированное AI-цитирование (скриншот)
- [ ] Минимум 3 реальные заявки через формы
- [ ] Минимум 1 оплаченная консультация через split-payment
- [ ] Фидбек: топ-3 UX-проблемы зафиксированы в `BACKLOG.md`

---

### Шаг 2.5 — Knowledge API Soft Launch (параллельно 2.3) 🆕

> **Перенесено из Block 4.4** в Block 2 как часть Hybrid-стратегии (2026-04-17). API готов на 100% (шаги 15-16), нет смысла ждать месяц 3.

**Цель:** валидировать B2B-канал параллельно с пилотами-экспертами. Не выбираем «B2C сначала» vs «API сначала» — оба канала запускаем одновременно, какой даст первого платящего — туда фокус на месяц 3.

**Действия:**
- [ ] Cold outreach 20 SEO-агентств (TopExpert, SEOnews, vc-сообщества, Telegram-каналы про SEO/GEO)
  - Шаблон: «бесплатный beta-доступ 14 дней к /api/v1/blind-spots, кейс психология/право, после beta — Pro $99/мес или Enterprise»
- [ ] Лендинг `/for-agencies` готов и задеплоен ✅ (commits 8107dad + 565e299, 2026-04-17)
- [ ] OpenAPI docs `/api/v1/docs` — публично доступны ✅
- [ ] Soft Launch tier — выдавать Pro/Enterprise ключи **вручную через psql** до 1-го платящего:
  ```sql
  UPDATE api_keys SET tier='pro',
                       permissions=ARRAY['read','answers','all'],
                       rate_limit_per_hour=1000,
                       monthly_limit=30000
   WHERE prefix='ne_xxx';
  ```
- [ ] Пост на vc.ru: «Карта слепых зон AI» с примерами cURL + JSON response
- [ ] При первом платящем Pro → начать Backend tier-логику (B-005 в BACKLOG)

**🔑 Ключи нужные перед стартом:** только то что уже есть (OpenAI, Anthropic, SMTP). Для расширенного probing полезен SerpAPI (P1) — но Soft Launch можно начать без него на seed-данных.

**Acceptance criteria Step 2.5:**
- [ ] 5+ ответов от агентств (open rate ≥25%)
- [ ] 3-5 beta-агентств активно используют API (last_used_at < 7 дней)
- [ ] Минимум 2 интервью с агентствами с конкретным фидбеком
- [ ] Опубликован пост vc.ru → ≥50 просмотров

---

## 💰 БЛОК 3 — Первая монетизация (Месяц 2)

### Шаг 3.1 — Кейс-маркетинг (1 неделя)
- [ ] Статья vc.ru с **реальным** кейсом (цифры, скриншот AI-цитирования)
- [ ] Статья Habr (технический угол)
- [ ] 5-10 TG-постов в нишевых каналах

**Как проверить:**
- ✓ vc.ru статья опубликована, ≥50 просмотров в первый день
- ✓ Habr статья опубликована, ≥1 комментарий
- ✓ GA / Яндекс.Метрика показывает приток трафика с vc.ru

### Шаг 3.2 — Re-engagement beta-юзеров (3 дня)

**⚠️ Pre-acceptance: validate the «107» number first** (отмечено в /strategy 2026-04-17 как непроверенный миф):
```sql
SELECT COUNT(*) AS total_users,
       COUNT(*) FILTER (WHERE last_sign_in_at > NOW() - INTERVAL '30 days') AS active_30d,
       COUNT(*) FILTER (WHERE telegram_id IS NOT NULL) AS with_telegram
FROM auth.users;
```
Если фактическое число < 30 — переименовать шаг и пересмотреть стратегию (массовая рассылка по 5-10 юзерам — overkill).

**Действия (если есть критическая масса beta-юзеров):**
- [ ] Массовая рассылка через TG-бот (`bot.api.send_message` в цикле по `users.telegram_id`)
- [ ] Персональные сообщения топ-10 returning users
- [ ] 5 интервью

**Как проверить:**
- ✓ Open rate рассылки ≥40% (trackable через unique URL)
- ✓ 20+ пользователей зашли в дашборд в течение недели (проверь `last_sign_in_at`)
- ✓ 5 интервью записаны в `FEEDBACK.md`

### Шаг 3.3 — Первые 10 платящих + marketplace-сделки (2 недели)
- [ ] Конвертировать пилотов и re-engaged в Starter/Pro
- [ ] Early adopter discount 50% первые 3 мес (через ЮKassa discount API)
- [ ] 5-10 оплаченных консультаций через маркетплейс

**Как проверить:**
```sql
SELECT COUNT(*) FROM profiles WHERE tier != 'free' AND payment_status = 'active';
-- должно быть ≥10
SELECT SUM(amount_rub) FROM payments WHERE type='subscription' AND status='succeeded' AND created_at > NOW() - INTERVAL '30 days';
-- должно быть ≥20000₽ (10 платящих × ~2000₽)
SELECT COUNT(*) FROM bookings WHERE payment_status='paid' AND created_at > NOW() - INTERVAL '30 days';
-- должно быть ≥5
```

---

## 🚀 БЛОК 4 — Growth + Knowledge API Soft Launch (Месяц 3)

### Шаг 4.1 — Scanner как главная воронка
**Действия:** встроить в 3-5 TG-ботов конкурентов, статья vc.ru
**Проверка:**
- ✓ 100+ прогонов сканера/неделю (смотреть в `scan_results` таблицу)
- ✓ 5%+ конверсия в регистрацию

### Шаг 4.2 — Контент-маркетинг
**Проверка:**
- ✓ 4+ внешних статей за месяц
- ✓ Трафик с vc.ru/habr растёт week-over-week

### Шаг 4.3 — Revenue-share партнёры
**Проверка:**
- ✓ 3+ партнёра с активным UTM в `/partners`
- ✓ 5+ платящих приведены через партнёров (атрибуция по `referrer_id`)

### Шаг 4.4 — Knowledge API expansion (после Step 2.5)

> **Soft Launch перенесён в Block 2 как Step 2.5** (2026-04-17, Hybrid стратегия). В Block 4 остаётся **расширение** — переход от Soft Launch beta к публичному запуску.

**Действия (после успешного Step 2.5):**
- [ ] Конвертировать активных beta-агентств в Pro $99/мес через ЮKassa
- [ ] Backend tier-логика (B-005 в BACKLOG): permissions по subscription_tier юзера, не hardcoded
- [ ] Расширенный probing с **SerpAPI** (требуется ключ — см. P1 в таблице ключей)
- [ ] Маркетинг в TopExpert, SEOKurs

**Проверка:**
```bash
# Beta-агентства активны
SELECT name, tier, last_used_at FROM api_keys WHERE tier='pro';
# ✓ 3-5 записей с last_used_at за последние 7 дней
```

**Цель месяца 3:**
- B2C: 30 платящих × 3 000₽ = 90 000₽
- Marketplace: 30 × 500₽ = 15 000₽
- Knowledge API: 0₽ (beta)
- **Итого: ~105 000₽ MRR**

---

## 📈 БЛОК 5 — Scale + API Monetization (Месяц 4-5)

### Шаг 5.1 — Активация денежной CPA
**Проверка:**
```sql
UPDATE settings SET value = '3000' WHERE key = 'cpa_rate_rub';
UPDATE settings SET value = 'true' WHERE key = 'cpa_enabled';
```
- ✓ 10+ CPA-партнёров, 5+ новых платящих/нед через CPA

### Шаг 5.2 — B2B вертикальные лендинги
**Проверка:**
- ✓ `/for-clinics`, `/for-law-firms`, `/for-education` открываются и рендерят
- ✓ 20 cold emails отправлены клиникам
- ✓ 1-2 B2B-пилота подписаны

### Шаг 5.3 — Knowledge API коммерциализация
**Действия:**
- [ ] Конвертировать beta-агентства в Pro ($99/мес) через ЮKassa
- [ ] Маркетинг в TopExpert, SEOKurs

**Проверка:**
- ✓ 3-5 агентств на Pro тарифе
- ✓ $300-500/мес MRR от API
- ✓ 1-2 Enterprise-переговоры в процессе

### Шаг 5.4 — SEO long-tail
**Проверка через GSC (поквартально):**
- ✓ 200+ проиндексированных URL
- ✓ 1000+ impressions/мес
- ✓ 5-10 clicks/мес на каждую статью в среднем

### Шаг 5.5 — Premium placement
**Проверка:**
- ✓ Эксперты на Expert тарифе показываются в топе `/experts` (is_featured=true)
- ✓ На них в 3-5× больше кликов чем на обычных

**Цель месяца 5:** 500 000₽ MRR (подробности в таблице ниже)

---

## 🎯 БЛОК 6 — Зрелая машина (Месяц 6 — декабрь)

### Шаг 6.1 — B2C маркетинговая машина работает сама
**KPI:**
- CPA + аффилиаты = 50%+ трафика
- SEO: 500+ страниц экспертов × 10 статей = 5000+ URL

### Шаг 6.2 — B2B в фокусе
**KPI:**
- 8-10 B2B-клиентов
- Dedicated onboarding

### Шаг 6.3 — Marketplace Take-off
**KPI:**
- 300+ консультаций/мес через booking
- Yclients интеграция для 20+ экспертов

### Шаг 6.4 — Knowledge API ramp-up
**KPI:**
- 10-15 агентств на Pro
- 1-2 Enterprise

**Цель декабря 2026:**

| Поток | Клиентов | ARPU | MRR |
|---|---|---|---|
| B2C subscription | 150 | 4 000₽ | 600 000₽ |
| Marketplace commission | 300 консультаций | 700₽ | 210 000₽ |
| B2B subscription | 8-10 | 50 000₽ | 400-500 000₽ |
| Knowledge API Pro | 10-15 × $99 | 10 000₽ | 100-150 000₽ |
| Knowledge API Enterprise | 1-2 | 200 000₽ | 200-400 000₽ |
| **Итого NeuroExpert** | — | — | **1.5-1.9M ₽/мес** |

### Добор до 2M

- **Skutr-docs ЭДО pivot:** 300-500k MRR
- **Добавочный проект:** 500-800k MRR
- **Jogai фон:** 50-150k MRR

**Портфель декабря: 2.3-3.4M ₽/мес**

---

## 📊 Ключевые метрики — проверка еженедельно

```sql
-- Каждое воскресенье вечером запускать:

-- 1. Платящие
SELECT tier, COUNT(*), SUM(price) as mrr_potential
FROM profiles WHERE tier != 'free' AND payment_status = 'active'
GROUP BY tier;

-- 2. Реальная выручка за неделю
SELECT SUM(amount_rub), COUNT(*) FROM payments
WHERE status = 'succeeded' AND created_at > NOW() - INTERVAL '7 days';

-- 3. Новые регистрации
SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days';

-- 4. Активность (returning)
SELECT COUNT(DISTINCT user_id) FROM user_sessions
WHERE last_active > NOW() - INTERVAL '7 days';

-- 5. Marketplace
SELECT COUNT(*) bookings, SUM(commission_rub) commission
FROM bookings WHERE status = 'completed' AND created_at > NOW() - INTERVAL '7 days';

-- 6. API usage
SELECT name, requests_this_month FROM api_keys ORDER BY requests_this_month DESC LIMIT 10;

-- 7. Citation tracking
SELECT platform, COUNT(DISTINCT article_id) articles_cited
FROM citation_checks WHERE cited=true AND created_at > NOW() - INTERVAL '7 days'
GROUP BY platform;
```

---

## ❌ Что НЕ делать на этом этапе

- White Label для агентств (2027)
- Холодный B2B outreach до 10 B2C-кейсов
- Денежный CPA до PMF
- Новые фичи "на всякий случай"
- Multi-tenancy архитектура
- Knowledge API до 3-5 beta-кейсов

---

## 🔑 Необходимые API-ключи и интеграции

Без этих ключей часть функций в degraded-режиме или не работает совсем.
Проставлять в `/opt/neuroexpert/.env` на проде + в local `.env.local` для dev.

### 🔴 P0 — Критично (блокирует монетизацию, нужно в Блоке 2)

| Интеграция | Где взять | Переменные | Стоимость | Нужен в шаге |
|---|---|---|---|---|
| **ЮKassa** (ИП/самозанятый) | yookassa.ru → ЛК → Настройки → Ключи API. Webhook URL: `https://neuroexpertise.ru/api/webhooks/yukassa` | `YUKASSA_SHOP_ID`, `YUKASSA_SECRET_KEY`, `YUKASSA_WEBHOOK_SECRET` | Комиссия 2.8-3.5% | **Шаг 2.2** |
| **SMTP** (Yandex 360) | `noreply@neuroexpertise.ru` — app password из Яндекс ID | `SMTP_HOST=smtp.yandex.ru`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL` | 0 ₽ (до 1000 ящиков) | ✅ **Уже есть** |
| **Disable autoconfirm** | В compose: `GOTRUE_MAILER_AUTOCONFIRM=false` | — | — | ✅ Уже сделано 2026-04-07 |

**Проверка:** `curl -X POST /api/subscribe` возвращает URL ЮKassa-оплаты, magic link доходит на email.

---

### 🟡 P1 — Важно (реальные данные вместо захардкоженных, нужно в Блоке 3)

| Интеграция | Где | Переменные | Стоимость | Нужен в шаге |
|---|---|---|---|---|
| **XMLRiver** (Wordstat API) | xmlriver.com → регистрация → API | `XMLRIVER_USER_ID`, `XMLRIVER_API_KEY` | ~1000 ₽/мес | Шаг 3.1 (кейсы), Шаг 4.1 (Scanner) |
| **SerpAPI** (PAA + Яндекс Кью + SERP) | serpapi.com | `SERPAPI_API_KEY` | $50/мес | Шаг 4.4 (Blind Spots API) |
| **Resend** (email-дайджесты) | resend.com + SPF/DKIM/DMARC на домене | `RESEND_API_KEY`, `EMAIL_FROM=noreply@neuroexpertise.ru` | 0 ₽ до 3000 писем/мес | Шаг 3.2 (re-engagement), Блок 4 (дайджесты) |

**Без этого:** Scanner показывает захардкоженные 3000/5000/8000 запросов в аудите; email-дайджесты подписчикам не уходят; Blind Spots API без реального SERP-сигнала.

---

### 🟢 P2 — Аналитика (полный probing 4 платформы, нужно в Блоке 4)

| Интеграция | Где | Переменные | Стоимость | Шаг |
|---|---|---|---|---|
| **OpenAI** | platform.openai.com | `OPENAI_API_KEY`, `OPENAI_PROXY_URL=http://ymrBa9:DFjAAX@72.56.184.139:8000` | ~$20/мес на probing | ✅ Уже есть |
| **Anthropic Claude** | console.anthropic.com | `ANTHROPIC_API_KEY` | ~$10/мес | ✅ Уже есть |
| **Perplexity** | perplexity.ai/settings/api | `PERPLEXITY_API_KEY` | ~$5/мес | Шаг 4.4 |
| **YandexGPT** | console.yandex.cloud (без прокси) | `YANDEX_API_KEY`, `YANDEX_FOLDER_ID` | Бесплатный грант 4000₽/60 дней | Шаг 4.4 |
| **GigaChat** | developers.sber.ru/portal/products/gigachat | `GIGACHAT_CLIENT_ID`, `GIGACHAT_CLIENT_SECRET` | Бесплатный лимит | Шаг 4.4 |
| **PageSpeed** | console.cloud.google.com → PageSpeed Insights API | `PAGESPEED_API_KEY` | Бесплатно 25k/день | Блок 5 (CWV мониторинг) |

**Без этого:** probing только через OpenAI; 4 AI-платформы в отчётах сканера невалидны; аналитика Trust Score/Share of Voice неточная.

---

### 🔵 P3 — Кросспост (обещан в тарифах Pro+, нужно в Блоке 5)

| Площадка | Где | Переменные | Приоритет | Нужен в шаге |
|---|---|---|---|---|
| **Дзен** | dzen.ru → Студия → API | `DZEN_API_TOKEN` | Высокий | Шаг 5.x (кросспост Pro+) |
| **Хабр** | habr.com → настройки → API | `HABR_API_TOKEN` | Средний | Шаг 5.x |
| **vc.ru** | vc.ru → настройки приложения | `VCRU_API_TOKEN` | Высокий | Шаг 3.1 (кейсы) + 5.x |
| **VK** | vk.com/dev | `VK_API_TOKEN` | Средний | Шаг 5.x |

**Без этого:** статус кросс-поста в БД — "prepared", эксперт копирует вручную. На тарифах Pro+ это обещано как автоматическое.

---

### 🟣 P4 — Индексация (ускорение SEO, нужно в Блоке 5)

| Сервис | Где | Переменные | Нужен в шаге |
|---|---|---|---|
| **Google Search Console API** | console.cloud.google.com → Service Account → JSON base64 | `GSC_SERVICE_ACCOUNT_JSON` | Шаг 5.4 (SEO long-tail) |
| **Яндекс.Вебмастер API** | webmaster.yandex.ru → OAuth | `YANDEX_WEBMASTER_TOKEN`, `YANDEX_WEBMASTER_HOST_ID` | Шаг 5.4 |
| **Bing Webmaster API** | bing.com/webmasters | `BING_WEBMASTER_API_KEY` | Шаг 5.4 |

**Без этого:** sitemap сабмитится вручную (страницы проиндексируются, но медленнее).

---

### ⚪ P5 — Опционально (GEO-мониторинг + веб-аналитика)

| Сервис | Где | Переменные | Нужен в шаге |
|---|---|---|---|
| **Pixel Tools** | pixeltools.ru | `PIXEL_TOOLS_API_KEY` | Block 6 (опц.) |
| **GptFox** | gptfox.io | `GPTFOX_API_KEY` | Block 6 (опц.) |
| **Яндекс.Метрика** | metrika.yandex.ru | `NEXT_PUBLIC_YANDEX_METRIKA_ID` | Block 6 (опц.) |
| **Plausible** | Self-hosted | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_PLAUSIBLE_HOST` | Block 6 (опц.) |

---

## 🛟 Что НЕ потеряно (страховка от пропусков)

Список задач которые **не входят как явные шаги Block 1-6**, но должны быть выполнены. Если задача переходит в шаг плана — переносим её туда и убираем отсюда.

### Из BACKLOG.md — известные P0/P1/P2

| Тикет | Где встроено | Ответственный |
|---|---|---|
| **B-004** Ротация OpenAI + TG ключей | ✅ Встроено в Step 2.0.5 | Пользователь (получает) + Claude (прописывает) |
| **B-005** Backend tier-логика для API ключей | Триггер: 1-й платящий Pro → начать. Упомянуто в Step 4.4 | Claude |
| **B-006** Маркетинговые лендинги в middleware whitelist refactor | Не блокер. Сделать оппортунистически (DX) | Claude |
| **B-007** PostgREST schema cache automation после миграций | Не блокер. Документировано, добавить в `/deploy` skill | Claude |
| **B-008** Cyrillic slug в URL (транслитерация) | До публичного маркетинга в Block 4 | Claude |
| **B-009** Empty state для пустого `/experts` каталога | Закроется автоматически когда появятся 3+ публичных эксперта (Step 2.4) | — |
| **B-010** GET `/api/agency-leads` 405 handler с понятным сообщением | Опционально. Можно перед Step 2.5 outreach | Claude |
| **B-011** Страницы `/privacy` и `/terms` (footer 404) | `/terms` уже есть. `/privacy` — перед публичным маркетингом (Block 3-4). Юр. консультация. | Пользователь (текст) + Claude (страница) |
| **B-012** WSL-curl с локальной машины (timeout) | Не блокер прода. Workaround: ssh hostland. | — |
| **B-013** Pricing bundles между подписками и API | Триггер: 1-й платящий в **каждом** канале | Стратегическое решение |

### Маркетинговые ассеты (нужны до outreach)

- [ ] Email-шаблон для outreach пилот-экспертам (B2C) — текст в `BACKLOG.md` или draft
- [ ] Email-шаблон для outreach SEO-агентств (B2B) — текст
- [ ] Список 5-10 знакомых экспертов с разными нишами (для Step 2.3)
- [ ] Список 20 SEO-агентств с контактами (для Step 2.5)
- [ ] Кейс «Карта слепых зон» в нише психологии и права (data из БД, для vc.ru)

### Документы

- [x] LAUNCH_PLAN.md (этот файл)
- [x] BACKLOG.md
- [x] LANDING_BRIEFS.md
- [x] CLAUDE.md
- [ ] FEEDBACK.md (создаётся после первых 5 интервью в Step 3.2)
- [ ] PARTNERS.md (создаётся в Step 4.3 — список revenue-share партнёров)

### Регулярные процедуры (запускать по триггеру)

- **После каждой правки маркетинговой страницы** → процедура «Tech QA лендинга» (см. начало документа)
- **Раз в месяц / перед outreach** → процедура «Content audit» (см. начало документа)
- **После завершения значимой фичи** → `/session-save`
- **Каждое воскресенье** → SQL-метрики (см. секцию «Ключевые метрики»)
- **Каждый месяц** → пересмотр LAUNCH_PLAN.md (обновить дашборд статуса в начале)

---

## 🛠️ Серверные задачи (не API-ключи)

| Задача | Критичность | Нужен в шаге |
|---|---|---|
| **ЮKassa подключить** | 🔴 P0 | 2.2 |
| **SMTP работает** | 🔴 P0 | ✅ Сделано |
| **GOTRUE_MAILER_AUTOCONFIRM=false** | 🔴 P0 | ✅ Сделано |
| **Перегенерировать OpenAI + TG ключи** (были в открытом виде в чате) | 🟡 P1 | После Блока 1 |
| **Увеличить RAM до 8 GB** (сейчас 15Gi на Hostland — ОК) | ⚪ P5 | Пока не нужно |
| **DNS `supabase.neuroexpertise.ru → 185.221.213.104`** | ✅ Сделано | — |
| **SPF/DKIM/DMARC для домена** (при подключении Resend) | 🟡 P1 | Шаг 3.2 |
| **Пересгенерировать TypeScript типы БД** (после миграций 016, 017) | ✅ Готово (16.04) | После Шага 1.4 |
| **Закрыть Coolify UI порт 8000 от внешнего мира** | ✅ Готово (16.04) | iptables DOCKER-USER |
| **Настроить ежедневный pg_dump cron** (3:00 AM) | ✅ Готово (16.04) | systemd timer, 7-day rotation |
| **Продлить proxy6.net** (истёк 16.04.2026) | ✅ Продлён (16.04) | — |

---

## 📅 Roadmap интеграций по блокам

**Перед Блоком 1 (эта неделя):**
- Убедиться что ЮKassa-аккаунт в процессе верификации (1-3 дня)
- Получить Resend API key (10 мин регистрация, SPF/DKIM займёт 1-2 дня пропагации)

**Блок 2 (неделя 3-4):**
- Активировать **ЮKassa** 🔴 (шаг 2.2)
- Перегенерировать OpenAI + TG токены 🟡
- Пересгенерировать TypeScript типы БД ✅

**Блок 3 (месяц 2):**
- **Resend** 🟡 (для rescue-engagement рассылки)
- **XMLRiver** 🟡 (для Scanner с реальными цифрами)

**Блок 4 (месяц 3):**
- **Perplexity + YandexGPT + GigaChat** 🟢 (полный 4-platform probing)
- **SerpAPI** 🟡 (для Blind Spots API)

**Блок 5 (месяц 4-5):**
- **Кросспост токены** (Дзен, Хабр, vc.ru, VK) 🔵
- **Индексация API** (GSC, Яндекс.Вебмастер, Bing) 🟣
- **PageSpeed API** 🟢

**Блок 6 (месяц 6):**
- GEO-мониторинг (Pixel Tools, GptFox) — опционально ⚪
- Веб-аналитика (Метрика + Plausible) — опционально ⚪

---

## Уже построенные монетизационные артефакты (код шагов 15-16)

- ✅ Marketplace: booking, reviews, compare, match, split-payment
- ✅ Knowledge API: `/api/v1/experts`, `/articles`, `/questions`, `/answers`, `/blind-spots`
- ✅ API keys management с tier-based permissions
- ✅ B2B: `/for-business`, `/team`, Scanner сравнение
- ✅ Premium placement (`is_featured`, +5..25 скоринг)
- ✅ Referral system с auth trigger (миграция 011)
- ✅ Commission по тарифам (Free 15% → Business 0%)

**План — монетизировать это, а не строить новое.**

---

## Следующая сессия начинает с

**Шаг 1.1 — Sanner без регистрации.** Самый высокий ROI.
Переход к 1.2 сразу после — их можно сделать за один день.

**Контекст для Claude Code:**
- Проект: `/home/hihol/projects/neuroexpert`, main
- Прод: `https://neuroexpertise.ru` на Hostland (185.221.213.104)
- Стек: CLAUDE.md в корне репо
- Архитектурные детали: `~/.claude/projects/-home-hihol-projects/memory/`
- Фидбек/решения: `feedback_*.md` там же
- Текущие баги: `BACKLOG.md` (создадим)

---

## Принципы работы из сессии в сессию

1. **Перед значимым шагом — сверка с LAUNCH_PLAN.md**
2. **После шага — отметить `[x]` + commit**
3. **Новые идеи — в `BACKLOG.md`**, не в план на ходу
4. **Маркетинг > Разработка**
5. **Validation > Assumption**

## Как работает проверка прогресса

- **Ежедневно:** смотрим на `/analytics` админ-дашборд и прогресс ближайшего шага
- **Еженедельно:** воскресный SQL-run (см. выше) + сверка с планом
- **Ежемесячно:** пересмотр целей, обновление LAUNCH_PLAN.md, возможная корректировка
