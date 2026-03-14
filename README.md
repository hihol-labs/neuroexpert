# НейроЭксперт

AI-система, которая превращает экспертизу в клиентов из поиска и нейросетей.

Эксперт наговаривает ответ за 10 минут — система создаёт SEO-статью, Telegram-пост, карточки, Reels-сценарий и FAQ. Нейросети начинают цитировать, поисковики — ранжировать.

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

- **AI Visibility Scanner** — проверка видимости бренда в ChatGPT/Perplexity/YandexGPT
- **Бесплатный аудит** — анализ AI-ответов по 20 нишам
- **Генерация контента** — 5 форматов из голосового сообщения
- **Публичные SSR-страницы** — E-E-A-T, Schema.org, SEO
- **Дашборд эксперта** — заказы, контент, заявки, аналитика
- **Оплата** — ЮKassa подписки (Free/Starter/Pro/Business)
- **Трекинг** — цитирование, SERP, Trust Score, CWV
- **Кросспост** — Дзен, vc.ru, Telegram, VK
- **Email-рассылки** — уведомления подписчикам через Resend
- **Реферальная программа** — /?ref={slug}
