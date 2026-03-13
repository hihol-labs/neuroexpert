# Claude.md — Состояние проекта НейроЭксперт

> ВСЕГДА читай этот файл ПЕРВЫМ перед любой работой.
> После каждого шага — обнови статус.

## Статус

| Шаг | Описание | Статус |
|-----|----------|--------|
| 1 | Monorepo + инфраструктура | ✅ |
| 2 | БД: схема, миграции, RLS, seed | ✅ |
| 3 | Auth + лендинг | ✅ |
| 4 | LLM/STT слой + аудит | ⬜ |
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
- Шаг 3: Supabase clients (browser/server/admin), middleware (dashboard protected), auth pages (login magic link, register + niche select), auth callback, auth trigger (006), лендинг (hero, 2 канала, 3 шага, 5 ниш, CTA)

## Проблемы

(записывай баги, workaround'ы)

## Мониторинг AIO (после шага 7, еженедельно)

| Неделя | Страниц | Индексация | % цитирования | Заметки |
|--------|---------|------------|----------------|---------|
| | | | | |
