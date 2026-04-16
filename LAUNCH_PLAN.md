# NeuroExpert — Пошаговый план запуска под цель 2M ₽/мес к декабрю 2026

> Создан 2026-04-16. Обновлён с учётом Marketplace + Knowledge API + подробных проверок.
> Следующая сессия Claude Code читает этот файл первым.

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

### Шаг 2.1 — Финализация Phase 0 (4-5 дней)

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

**Acceptance criteria Блока 2:**
- [ ] 3+ эксперта опубликовали 3+ статей каждый
- [ ] Минимум 5 статей в индексе Google (проверить GSC)
- [ ] Минимум 1 зафиксированное AI-цитирование (скриншот)
- [ ] Минимум 3 реальные заявки через формы
- [ ] Минимум 1 оплаченная консультация через split-payment
- [ ] Фидбек: топ-3 UX-проблемы зафиксированы в `BACKLOG.md`

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

### Шаг 3.2 — Re-engagement 107 beta-юзеров (3 дня)
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

### Шаг 4.4 — Knowledge API Soft Launch (2 недели)
**Действия:**
- [ ] 3-5 SEO-агентств в closed beta (бесплатный доступ к `/api/v1/blind-spots`)
- [ ] Пост на vc.ru: "Карта слепых зон AI" с примерами
- [ ] Лендинг `/api-keys/pricing` переработан под B2B-SEO

**Проверка:**
```bash
# API работает
curl -H "Authorization: Bearer ne_..." https://neuroexpertise.ru/api/v1/blind-spots?niche=psychology
# ✓ Возвращает JSON с opportunity_score, gap-маркерами

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

| Площадка | Где | Переменные | Приоритет |
|---|---|---|---|
| **Дзен** | dzen.ru → Студия → API | `DZEN_API_TOKEN` | Высокий |
| **Хабр** | habr.com → настройки → API | `HABR_API_TOKEN` | Средний |
| **vc.ru** | vc.ru → настройки приложения | `VCRU_API_TOKEN` | Высокий |
| **VK** | vk.com/dev | `VK_API_TOKEN` | Средний |

**Без этого:** статус кросс-поста в БД — "prepared", эксперт копирует вручную. На тарифах Pro+ это обещано как автоматическое.

---

### 🟣 P4 — Индексация (ускорение SEO, нужно в Блоке 5)

| Сервис | Где | Переменные |
|---|---|---|
| **Google Search Console API** | console.cloud.google.com → Service Account → JSON base64 | `GSC_SERVICE_ACCOUNT_JSON` |
| **Яндекс.Вебмастер API** | webmaster.yandex.ru → OAuth | `YANDEX_WEBMASTER_TOKEN`, `YANDEX_WEBMASTER_HOST_ID` |
| **Bing Webmaster API** | bing.com/webmasters | `BING_WEBMASTER_API_KEY` |

**Без этого:** sitemap сабмитится вручную (страницы проиндексируются, но медленнее).

---

### ⚪ P5 — Опционально (GEO-мониторинг + веб-аналитика)

| Сервис | Где | Переменные |
|---|---|---|
| **Pixel Tools** | pixeltools.ru | `PIXEL_TOOLS_API_KEY` |
| **GptFox** | gptfox.io | `GPTFOX_API_KEY` |
| **Яндекс.Метрика** | metrika.yandex.ru | `NEXT_PUBLIC_YANDEX_METRIKA_ID` |
| **Plausible** | Self-hosted | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_PLAUSIBLE_HOST` |

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
| **Пересгенерировать TypeScript типы БД** (после миграций 016, 017) | 🟡 P1 | После Шага 1.4 |
| **Закрыть Coolify UI порт 8000 от внешнего мира** | 🟡 P1 | Эту неделю |
| **Настроить ежедневный pg_dump cron** (3:00 AM) | 🟡 P1 | Блок 2 |
| **Продлить proxy6.net** (истёк 16.04.2026) | ✅ Продлён (16.04) | — |

---

## 📅 Roadmap интеграций по блокам

**Перед Блоком 1 (эта неделя):**
- Убедиться что ЮKassa-аккаунт в процессе верификации (1-3 дня)
- Получить Resend API key (10 мин регистрация, SPF/DKIM займёт 1-2 дня пропагации)

**Блок 2 (неделя 3-4):**
- Активировать **ЮKassa** 🔴 (шаг 2.2)
- Перегенерировать OpenAI + TG токены 🟡
- Пересгенерировать TypeScript типы БД 🟡

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
