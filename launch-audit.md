# Launch Audit — замечания по E2E прогону (Фаза 0)

> Файл для фиксации багов, опечаток и устаревших текстов на проде https://neuroexpertise.ru
> Заполняется по ходу пунктов 0.2–0.11 плана запуска. На 0.12 — разбираем и фиксим.

## 0.2 — Лендинг и публичные страницы

### Главная — https://neuroexpertise.ru
- [ ] TODO: проверить тексты, USP, обещания, кнопки CTA
- [ ] TODO: мобильная вёрстка
- [ ] **БАГ P2 (CSP):** браузер блокирует eval — `Content Security Policy of your site blocks the use of 'eval' in JavaScript` (script-src). Скорее всего CSP-заголовок добавлен в next.config.js / middleware и слишком строгий. Влияет на сторонние библиотеки (Recharts, аналитика). Проверить, не ломает ли что-то в дашборде.

### /audit — https://neuroexpertise.ru/audit
- [ ] TODO: пройти полный аудит на своей нише
- [ ] TODO: проверить правдоподобность данных (estimated_monthly_volume, маркеры)
- [ ] TODO: проверить CTA после результата

### /pricing — https://neuroexpertise.ru/pricing
- [ ] TODO: сверить 4 тарифа с TIER_CONFIG (lib/subscription.ts)
- [ ] TODO: проверить сравнительную таблицу 14 строк
- [ ] TODO: проверить блок B2B и ROI

### /for-experts — https://neuroexpertise.ru/for-experts
- [ ] TODO: проверить тексты и CTA

### /for-business — https://neuroexpertise.ru/for-business
- [ ] TODO: проверить тексты, 6 преимуществ, 10 отраслей, форму заявки

### /how-it-works — https://neuroexpertise.ru/how-it-works
- [ ] TODO: проверить шаги и логику

## 0.3 — Регистрация эксперта

- [ ] **БАГ P0 (PROD DOWN с 2026-03-15): supabase-auth не запускается.** При регистрации браузер получает `Invalid authentication credentials`. GoTrue падает на миграции `20221208132122_backfill_email_last_sign_in_at.up.sql` с ошибкой `operator does not exist: uuid = text` (SQLSTATE 42883). Причина: в `auth.identities` колонка `id` имеет тип `uuid`, новая версия GoTrue ждёт `text`. Фикс: `ALTER TABLE auth.identities ALTER COLUMN id TYPE text USING id::text;` → перезапуск supabase-auth. **Следствие:** уже 3 недели никто не мог зарегистрироваться/войти.
- [x] **БАГ P0 (FIXED): Kong не подставлял `${ANON_KEY}` / `${SERVICE_ROLE_KEY}` в kong.yml.** Kong с declarative config НЕ выполняет автоматическую подстановку env-переменных в YAML. Раньше Kong сравнивал входящие apikey с буквальной строкой `${ANON_KEY}` → 401 для всех. Это же ломало и signup (`Invalid authentication credentials`), и worker (`claim_job` 401), и web (`content_packages` 401). **Фикс:** (1) добавил `ANON_KEY`/`SERVICE_ROLE_KEY` в `environment:` сервиса `supabase-kong` в `docker/docker-compose.prod.yml`; (2) сделал `envsubst` шаблона `docker/supabase/kong.yml` на сервере (шаблон сохранил как `kong.yml.template`); (3) перезапустил kong. После фикса signup → HTTP 200, worker key-auth прошёл (теперь падает на 404 — отдельный баг).
- [ ] **БАГ P1: worker получает 404 от PostgREST на `rpc/claim_job`.** После фикса key-auth Kong пропускает запрос, но PostgREST отвечает 404 — функция `claim_job` отсутствует в публичной схеме. Проверить миграции 001/008, накатить недостающее.
- [ ] **TODO P1: сделать фикс kong.yml постоянным.** Сейчас `docker/supabase/kong.yml` на сервере содержит подставленные ключи (через ручной envsubst). Шаблон → `kong.yml.template`. При следующем `rsync`/`git pull` файл откатится к плейсхолдерам и Kong снова сломается. Нужно: добавить шаг envsubst в `scripts/deploy.sh` (или `scripts/fix-prod.sh`), `kong.yml` положить в `.gitignore` или генерировать перед `docker compose up`.

## 0.4 — Дашборд и онбординг

- [ ] TODO

## 0.5 — Запись голосового и генерация контента

- [ ] TODO

## 0.6 — Контент-пакет (5 вкладок)

- [ ] TODO

## 0.7 — Публичная SSR-страница статьи

- [ ] TODO

## 0.8 — Форма заявки и /leads

- [ ] TODO

## 0.9 — Marketplace (фильтры, matching, compare, booking)

- [ ] TODO

## 0.10 — Telegram-бот

- [ ] TODO

## 0.11 — Scanner

- [ ] TODO
