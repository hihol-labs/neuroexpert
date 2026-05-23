# НейроЭксперт

Система привлечения клиентов из поиска, карт, Авито, отзывов и нейросетей.

НейроЭксперт находит реальный спрос в нише, показывает слабые места видимости и превращает экспертные ответы, карточки, отзывы и страницы в управляемый канал заявок. Главный коммерческий фокус — B2B-направление **Local Sales OS** для локального бизнеса; Solo-режим для экспертов остаётся нижним массовым слоем и источником контента, данных и кейсов.

## Продуктовые направления

- **Business / Local Sales OS** — для стоматологий, косметологий, салонов, автосервисов, юрфирм, клиник, детских центров и других локальных бизнесов. Включает аудит видимости, гео-рейтинг, ежедневные задачи, сбор отзывов и возврат потерянных лидов.
- **Solo / НейроЭксперт** — для индивидуальных экспертов: реальные вопросы пользователей -> голосовой ответ -> SEO/AIO-страница -> кнопка записи -> заявки.
- **Agencies / Demand API** — для SEO/GEO-агентств: данные спроса, blind spots, AI-probing и API/white-label слой для клиентских аудитов.
- **Marketing OS Runtime** — исполняемые методики для голоса эксперта, AEO, competitor profiling, CRO, weekly reports и unit economics. Подробно: `docs/MARKETING_OS_RUNTIME.md`.

## Быстрый старт

### Docker (рекомендуется)

```bash
cp .env.example .env.local
# Заполните переменные в .env.local

docker compose -f docker/docker-compose.yml build
docker compose -f docker/docker-compose.yml up -d

# Проверка
curl http://localhost:3000/api/health
```

### Локальная разработка

```bash
# Установка зависимостей
pnpm install

# Сборка shared-пакета
pnpm --filter shared build

# Запуск (в отдельных терминалах)
pnpm --filter web dev        # Next.js → http://localhost:3000
pnpm --filter bot dev         # Telegram-бот
pnpm --filter worker dev      # Background worker
```

## Стек

| Компонент | Технологии |
|-----------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 (App Router), React, TailwindCSS |
| Telegram-бот | grammY, webhook + polling |
| Worker | Node.js, polling jobs из Supabase |
| БД | Supabase self-hosted (PostgreSQL 15+) |
| LLM | Claude (primary), OpenAI/YandexGPT/GigaChat (fallback) |
| STT | Whisper (primary), Yandex SpeechKit (fallback) |
| Оплата | ЮKassa |
| Email | Resend |

## Структура

```
apps/
  web/       — Next.js фронтенд (SSR, API routes)
  bot/       — Telegram-бот (grammY)
  worker/    — Background jobs (17 обработчиков)
packages/
  shared/    — типы, LLM/STT слои, промпты, константы
  supabase/  — миграции (001-009), seed
docker/      — docker-compose, Dockerfiles, nginx
docs/        — архитектура, план, бизнес-логика
```

## Переменные окружения

См. `.env.example` — все переменные с комментариями.

Основные группы: Supabase, Telegram, OpenAI, Claude, Yandex, ЮKassa, Resend, SerpAPI, Bing Webmaster.

## Команды

| Действие | Команда |
|----------|---------|
| Dev web | `pnpm --filter web dev` |
| Dev bot | `pnpm --filter bot dev` |
| Dev worker | `pnpm --filter worker dev` |
| Build всё | `pnpm build` |
| Docker build | `docker compose -f docker/docker-compose.yml build` |
| Docker up | `docker compose -f docker/docker-compose.yml up -d` |
| Healthcheck | `curl http://localhost:3000/api/health` |
| Миграции | `npx supabase db push --db-url $SUPABASE_DB_URL` |

## Функциональность

- **Local Sales OS** — аудит Яндекс Карт, 2ГИС, Авито, VK, сайта, Telegram, отзывов, форм и телефонии
- **Гео-рейтинг и конкуренты** — сравнение позиций по локальным запросам рядом, цена, срочно, на районе
- **Ежедневные задачи роста** — конкретные действия для карточек, отзывов, услуг, объявлений, FAQ и follow-up
- **Сбор и возврат отзывов** — увеличение положительных отзывов и перехват негатива до публичной публикации
- **Потерянные лиды** — фиксация пропущенных звонков, сообщений без ответа и клиентов без повторного касания
- **AI Visibility Scanner** — проверка видимости бренда в ChatGPT/Perplexity/YandexGPT/GigaChat
- **Аудит спроса** — анализ реальных вопросов, intent, объёма спроса и слабости AI-ответов
- **Генерация контента** — 5 форматов из голосового сообщения
- **Профиль голоса эксперта** — voice_profile обновляется из записей и применяется при генерации контента
- **Marketing OS workflows** — реестр методик, роли генерации, AEO-кластеры, CRO-гипотезы и версия playbook-а в артефактах
- **Публичные SSR-страницы** — E-E-A-T, Schema.org, SEO
- **Дашборд эксперта** — заказы, контент, заявки, аналитика
- **B2B-пакеты** — аудит видимости, запуск канала заявок за 30 дней и managed-сопровождение
- **Оплата** — ЮKassa подписки и сервисные заказы
- **Трекинг** — цитирование, SERP, Trust Score, CWV
- **Кросспост** — Дзен, vc.ru, Telegram, VK
- **Email-рассылки** — уведомления подписчикам через Resend
- **Реферальная программа** — /?ref={slug}
