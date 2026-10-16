# НейроЭксперт — инструкции для AI-агента

> ВСЕГДА читай этот файл ПЕРВЫМ перед любой работой.
> Это тонкий указатель. Контент живёт в специализированных документах (ниже).

**Отвечай всегда на русском языке.**

## Куда смотреть

| Нужно | Документ |
|---|---|
| **ЧТО и в каком порядке строить** (роадмап, статус этапов, видение, финмодель, аудит, gates) | [`CURRENT_PLAN.md`](CURRENT_PLAN.md) — единственный канонический план |
| **КАК деплоить/эксплуатировать** (deploy-runbook, прод-инфра, known issues, тарифы, API-ключи, ЮKassa, метрики) | [`OPERATIONS.md`](OPERATIONS.md) |
| **Runtime-контракты** (scope-lock, data-policy, fallback, запреты) | [`.pfo/`](.pfo/) |
| **Память сессий** | `.codex-memory/MEMORY.md`, `.codex-memory/STATE.json` |

## Жёсткое правило очередности

Движение — строго по `CURRENT_PLAN.md` сверху вниз. Перед задачей: открыть `CURRENT_PLAN.md`, определить активный этап, работать только внутри него. Нельзя переходить к следующему этапу или брать задачи из `BACKLOG.md`/старых документов, пока gate текущего этапа не закрыт (исключение — явное указание пользователя). После каждого meaningful шага обновлять статус в памяти и в плане.

## Стек

- **Monorepo:** Turborepo + pnpm workspaces, TypeScript strict.
- **Frontend:** Next.js 14 (App Router), React, TailwindCSS — `apps/web/`
- **Telegram-бот:** grammY (webhook + polling) — `apps/bot/`
- **Worker:** Node.js, polling таблицы `jobs` из Supabase — `apps/worker/`
- **БД:** Supabase self-hosted (PostgreSQL 15+, Auth, Storage)
- **LLM:** абстрактный слой (Claude primary → OpenAI/YandexGPT/GigaChat fallback) — `packages/shared/src/llm/`
- **STT:** абстрактный слой (Whisper primary, YandexSTT fallback) — `packages/shared/src/transcription/`

## Структура

```text
apps/
  web/       — Next.js фронтенд + все API-роуты
  bot/       — Telegram-бот (grammY)
  worker/    — Background jobs worker
packages/
  shared/    — типы, LLM, STT, промпты, константы
  supabase/  — миграции (001-024+), seed
```

## Правила работы

- SQL-миграции: `packages/supabase/migrations/` с порядковой нумерацией.
- Общие типы и утилиты: `packages/shared/` (после правок — `pnpm --filter shared build`).
- `.env.local` в корне — локальные переменные; секреты не коммитить.
- Бот/worker используют Supabase client с service_role key.
- **pnpm build после каждого шага.** Не собирается — не коммить.
- **Не забегай вперёд:** работаешь только внутри активного этапа плана.
- **Деньги и доступ: проверка всего модуля по классам** (ADR-012 idea-to-deploy, вариант B, не гейт). Если задача
  трогает биллинг, платежи, лимиты или авторизацию, перед отчетом прочитай весь модуль, а не только свой дифф, на
  четыре класса: владелец или пустой id; валюта и сумма; дедупликация и идемпотентность; границы времени. Итог
  (нашла что-то или нет, `file:line`) запиши строкой в `docs/LEAK_JOURNAL.md`.
