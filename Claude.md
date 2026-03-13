# Claude.md — Состояние проекта НейроЭксперт

> ВСЕГДА читай этот файл ПЕРВЫМ перед любой работой.
> После каждого шага — обнови статус.

## Статус

| Шаг | Описание | Статус |
|-----|----------|--------|
| 1 | Monorepo + инфраструктура | ✅ |
| 2 | БД: схема, миграции, RLS, seed | ✅ |
| 3 | Auth + лендинг | ✅ |
| 4 | LLM/STT слой + аудит | ✅ |
| 5 | Telegram-бот | ⬜ |
| 6 | Генерация контента (Worker) | ⬜ |
| 7 | Публичные страницы (SSR + SEO) | ⬜ |
| 8 | Дашборд эксперта | ⬜ |
| 9 | Сбор спроса + поиск дыр | ⬜ |
| 10 | Оплата (ЮKassa) | ⬜ |
| 11 | Трекинг + аналитика | ⬜ |
| 12 | Scanner + финализация | ⬜ |

## Что работает

- Шаг 1: Monorepo (turbo + pnpm), apps/web (Next.js 14 + Tailwind), apps/bot, apps/worker, packages/shared, packages/supabase, docker (compose + Dockerfiles + nginx), .env.example
- Шаг 2: 15 таблиц (001), RLS (002), pg_cron (003), 20 ниш (004), 300 seed-вопросов (005), TypeScript-типы (database.ts), константы (constants.ts)
- Шаг 3: Supabase clients (browser/server/admin), middleware (dashboard protected), auth pages (login magic link, register + niche select), auth callback, auth trigger (006), лендинг (hero, 2 канала, 3 шага, 20 ниш, CTA с воронкой на аудит)
- Шаг 4: LLM-слой (Claude, OpenAI, YandexGPT, GigaChat) с фабрикой + fallback, STT-слой (Whisper, Yandex SpeechKit), промпты (gap-analysis с 4 маркерами, filter), аудит-страница (выбор 20 ниш → loading → мультиплатформенная таблица сравнения с раскрытием по клику → CTA), API /api/audit (POST, rate limit 2/мин, real-time запросы к AI через прокси, поддержка ChatGPT/Perplexity/YandexGPT/GigaChat), error/not-found страницы, страница-заглушка /pricing

## Проблемы

- OpenAI API заблокирован по геолокации (РФ) — используется HTTP-прокси через undici ProxyAgent (OPENAI_PROXY_URL в .env.local)
- Next.js dev server в WSL слушает только localhost — добавлен флаг `-H 0.0.0.0` в package.json, доступ через IP WSL (172.25.203.60)
- `.next` кэш периодически ломается при переключении build/dev — удалять `rm -rf apps/web/.next` перед запуском

## Мониторинг AIO (после шага 7, еженедельно)

| Неделя | Страниц | Индексация | % цитирования | Заметки |
|--------|---------|------------|----------------|---------|
| | | | | |
