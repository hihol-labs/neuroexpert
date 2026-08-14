#!/bin/bash
# =============================================================================
# НейроЭксперт — Deploy to production (ADR-002: SHA-pinned, fail-loud)
# Запуск с локальной машины: bash scripts/deploy.sh
#
# Контракт:
#   - Деплоится ровно DEPLOY_SHA (по умолчанию локальный HEAD), не origin/main.
#     Если SHA нет на origin — скрипт падает с подсказкой «сначала git push».
#   - Миграции трекаются в public.schema_migrations; ошибка миграции валит деплой.
#   - «Деплой завершён» печатается ТОЛЬКО после: health зелёный И
#     /api/version отдаёт DEPLOY_SHA. Иначе exit 1.
# =============================================================================

set -euo pipefail

SERVER="${SERVER:-hostland}"
APP_DIR="/opt/neuroexpert"
DOMAIN="neuroexpertise.ru"
DEPLOY_SHA="${DEPLOY_SHA:-$(git rev-parse HEAD)}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# DEPLOY_SHA — только полный 40-hex SHA (никаких символических refs).
if ! [[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "✗ DEPLOY_SHA должен быть полным 40-hex SHA, получено: '$DEPLOY_SHA'"
  exit 1
fi
# DEPLOY_BRANCH — только имя ветки, не rev-выражение (main~2 и т.п.).
if ! [[ "$DEPLOY_BRANCH" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || [[ "$DEPLOY_BRANCH" == *..* ]]; then
  echo "✗ DEPLOY_BRANCH содержит недопустимые символы: '$DEPLOY_BRANCH'"
  exit 1
fi

echo "=== НейроЭксперт: Deploy ==="
echo "→ SHA: $DEPLOY_SHA (ветка: $DEPLOY_BRANCH)"

# Любой сбой после захвата lock снимает его (ревью-находка r5: fail-путь
# оставлял lock до stale-таймаута и блокировал срочный корректирующий деплой).
trap 'ssh "$SERVER" rm -rf /opt/neuroexpert/.deploy.lock 2>/dev/null || true' ERR

# --- 1. Lock + sync repo on server to exact SHA ---
echo "[1/6] Lock и синхронизация кода (checkout $DEPLOY_SHA)..."
ssh "$SERVER" bash -s -- "$DEPLOY_SHA" "$DEPLOY_BRANCH" <<'REMOTE'
set -euo pipefail
DEPLOY_SHA="$1"; DEPLOY_BRANCH="$2"
APP_DIR="/opt/neuroexpert"
REPO="git@github.com:hihol-labs/neuroexpert.git"
LOCK="$APP_DIR/.deploy.lock"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
fi

# Deploy-lock: один запуск за раз. Stale-lock (>60 мин) переустанавливается;
# rm -rf, т.к. каталог непустой (внутри started). Остаточно: активный деплой
# длиннее часа теоретически может быть перекрыт — принято для соло-оператора.
if ! mkdir "$LOCK" 2>/dev/null; then
  AGE=$(( $(date +%s) - $(stat -c %Y "$LOCK") ))
  if [ "$AGE" -gt 3600 ]; then
    echo "  → Stale lock (${AGE}s), переустанавливаю"
    rm -rf "$LOCK" && mkdir "$LOCK"
  else
    echo "  ✗ Идёт другой деплой (lock ${AGE}s). Повтори позже или удали $LOCK"
    exit 1
  fi
fi
date +%s > "$LOCK/started"

cd "$APP_DIR"
# Полная очистка: tracked-модификации сбрасываются, untracked и ignored
# удаляются из build context (ревью-находка: stale overlays в образе).
# Исключения — только серверные runtime-файлы: .env и рендеренный kong.yml.
git reset --hard HEAD
git clean -fdx -e .env -e '.env.*' -e docker/supabase/kong.yml -e .deploy.lock
git fetch origin --prune
# SHA обязан быть ровно tip задеплоиваемой ветки на origin — не «какой-то
# достижимый коммит». show-ref не парсит rev-выражения (защита от main~2).
TIP=$(git show-ref --hash --verify "refs/remotes/origin/$DEPLOY_BRANCH")
if [ "$TIP" != "$DEPLOY_SHA" ]; then
  echo "  ✗ origin/$DEPLOY_BRANCH tip = $TIP, ожидался $DEPLOY_SHA."
  echo "  → Запушь актуальный HEAD: git push origin HEAD"
  rm -rf "$LOCK"
  exit 1
fi
git checkout --detach "$DEPLOY_SHA"
echo "  → checked out $(git rev-parse --short HEAD)"
REMOTE

# --- 2. Check .env + render kong.yml ---
echo "[2/6] Проверка .env и kong.yml..."
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/neuroexpert
if [ ! -f .env ]; then
  echo "  ✗ /opt/neuroexpert/.env не найден!"
  echo "  → Сгенерируй: bash scripts/generate-env.sh > .env и заполни ключи"
  exit 1
fi
bash scripts/render-kong.sh
echo "  → .env и kong.yml OK"
REMOTE

# --- 3. Build & start (SHA baked into image) ---
echo "[3/6] Сборка и запуск..."
ssh "$SERVER" bash -s -- "$DEPLOY_SHA" "$BUILD_TIME" <<'REMOTE'
set -euo pipefail
export GIT_SHA="$1" BUILD_TIME="$2"
cd /opt/neuroexpert
docker compose -f docker/docker-compose.prod.yml --env-file .env build --parallel
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d
echo "  → Контейнеры запущены"
REMOTE

# --- 4. Migrations (tracked, fail-loud, atomic) ---
# BASELINE_THROUGH=<filename.sql> — явное операторское утверждение «на проде
# применены все миграции по этот файл включительно». Догадки по числу таблиц
# запрещены (ревью-находка: count-эвристика молча пропустила бы 020-024).
echo "[4/6] Миграции БД..."
ssh "$SERVER" bash -s -- "${BASELINE_THROUGH:-}" <<'REMOTE'
set -euo pipefail
BASELINE_THROUGH="${1:-}"
cd /opt/neuroexpert
COMPOSE="docker compose -f docker/docker-compose.prod.yml"

echo "  → Ожидание PostgreSQL..."
timeout 60 bash -c "until $COMPOSE exec -T supabase-db pg_isready -U postgres >/dev/null 2>&1; do sleep 2; done" \
  || { echo "  ✗ PostgreSQL не поднялся за 60с"; exit 1; }

PSQL="$COMPOSE exec -T supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1"

# Трекинг применённых миграций (checksum — против молчаливого пропуска
# изменённого уже-применённого файла, ревью-находка r2).
$PSQL -qAtc "CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY, checksum text, applied_at timestamptz NOT NULL DEFAULT now())"
$PSQL -qAtc "ALTER TABLE public.schema_migrations ADD COLUMN IF NOT EXISTS checksum text"

# Только tracked-файлы текущего checkout — stale/untracked SQL не исполняем.
MIGRATIONS=$(git ls-files -- 'packages/supabase/migrations/*.sql' | sort)
[ -n "$MIGRATIONS" ] || { echo "  ✗ tracked-миграции не найдены"; exit 1; }

TRACKED=$($PSQL -qAtc "SELECT count(*) FROM public.schema_migrations")
# Обжитость схемы — по pg_class (таблицы, вьюхи, секвенсы), не только по
# information_schema.tables (ревью-находка r5: обход guard схемой без таблиц).
TABLES=$($PSQL -qAtc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname <> 'schema_migrations' AND c.relkind IN ('r','v','m','S','p')")
if [ "$TRACKED" = "0" ] && [ "$TABLES" -gt "0" ]; then
  if [ -z "$BASELINE_THROUGH" ]; then
    echo "  ✗ Схема обжита ($TABLES таблиц), а schema_migrations пуст."
    echo "  → Fail-closed: укажи явно BASELINE_THROUGH=<последний применённый файл.sql>"
    echo "    (проверь на проде, какие миграции реально применены), например:"
    echo "    BASELINE_THROUGH=019_transliterate_slugs.sql bash scripts/deploy.sh"
    exit 1
  fi
  echo "$MIGRATIONS" | grep -qxF "packages/supabase/migrations/$BASELINE_THROUGH" \
    || { echo "  ✗ BASELINE_THROUGH='$BASELINE_THROUGH' не найден среди tracked-миграций"; exit 1; }
  echo "  → Baseline по операторскому указанию: файлы по $BASELINE_THROUGH включительно"
  # Все baseline-строки — ОДНОЙ транзакцией (ревью-находка r5: прерванный
  # построчный baseline оставлял частичную таблицу и обходил guard TRACKED=0).
  BASELINE_SQL=""
  for f in $MIGRATIONS; do
    NAME=$(basename "$f")
    SUM=$(sha256sum "$f" | cut -d' ' -f1)
    BASELINE_SQL="$BASELINE_SQL INSERT INTO public.schema_migrations(filename, checksum) VALUES ('$NAME','$SUM') ON CONFLICT DO NOTHING;"
    [ "$NAME" = "$BASELINE_THROUGH" ] && break
  done
  printf '%s\n' "$BASELINE_SQL" | $PSQL --single-transaction -f /dev/stdin
fi

APPLIED=0
for f in $MIGRATIONS; do
  NAME=$(basename "$f")
  SUM=$(sha256sum "$f" | cut -d' ' -f1)
  EXISTS=$($PSQL -qAtc "SELECT count(*) FROM public.schema_migrations WHERE filename='$NAME'")
  if [ "$EXISTS" != "0" ]; then
    STORED=$($PSQL -qAtc "SELECT coalesce(checksum,'') FROM public.schema_migrations WHERE filename='$NAME'")
    if [ -n "$STORED" ] && [ "$STORED" != "$SUM" ]; then
      echo "  ✗ $NAME изменён после применения (checksum mismatch)."
      echo "  → Уже применённые миграции неизменяемы; новая правка = новый файл."
      exit 1
    fi
    continue
  fi
  echo "  → Applying $NAME (single transaction)..."
  # Файл + запись трекинга в ОДНОЙ транзакции: неудача откатывает и то и другое.
  { cat "$f"; printf "\nINSERT INTO public.schema_migrations(filename, checksum) VALUES ('%s','%s');\n" "$NAME" "$SUM"; } \
    | $PSQL --single-transaction -f /dev/stdin
  APPLIED=$((APPLIED+1))
done
echo "  → Миграции OK (новых применено: $APPLIED)"
REMOTE

# --- 5. Health + release identity (fail-loud) ---
echo "[5/6] Проверка health и версии релиза..."
ssh "$SERVER" bash -s -- "$DEPLOY_SHA" <<'REMOTE'
set -euo pipefail
DEPLOY_SHA="$1"
COMPOSE="docker compose -f /opt/neuroexpert/docker/docker-compose.prod.yml"

HEALTHY=0
for i in $(seq 1 18); do
  if $COMPOSE exec -T web wget -q --spider http://localhost:3000/api/health 2>/dev/null; then
    HEALTHY=1; break
  fi
  echo "  → Ожидание health... ($i/18)"; sleep 5
done
if [ "$HEALTHY" != "1" ]; then
  echo "  ✗ Web не стал healthy за 90с"
  $COMPOSE ps
  $COMPOSE logs --tail 50 web
  exit 1
fi
echo "  → Web healthy ✓"

LIVE_SHA=$($COMPOSE exec -T web wget -qO- http://localhost:3000/api/version 2>/dev/null \
  | tr -d ' ' | sed -n 's/.*"sha":"\([^"]*\)".*/\1/p')
if [ "$LIVE_SHA" != "$DEPLOY_SHA" ]; then
  echo "  ✗ /api/version отдаёт '$LIVE_SHA', ожидался '$DEPLOY_SHA'."
  echo "  → Релиз НЕ состоялся: работает не тот код."
  exit 1
fi
echo "  → Release identity ✓ ($LIVE_SHA)"
$COMPOSE ps
REMOTE

# --- 5b. Canonical host check (через публичный домен, с сервера) ---
echo "[5b] Проверка canonical-хоста https://$DOMAIN ..."
ssh "$SERVER" bash -s -- "$DEPLOY_SHA" "$DOMAIN" <<'REMOTE'
set -euo pipefail
DEPLOY_SHA="$1"; DOMAIN="$2"
# Строгий статус: 200 без редиректов (ревью-находка r2: 3xx/5xx с телом,
# содержащим ожидаемый sha, не должны считаться успехом).
CODE=$(curl -sS -o /tmp/nx-version.json -w '%{http_code}' --max-redirs 0 --max-time 20 "https://$DOMAIN/api/version") \
  || { echo "  ✗ https://$DOMAIN/api/version недоступен с сервера"; exit 1; }
if [ "$CODE" != "200" ]; then
  echo "  ✗ https://$DOMAIN/api/version вернул HTTP $CODE (ожидался 200 без редиректов)."
  exit 1
fi
CANON_SHA=$(tr -d ' ' < /tmp/nx-version.json | sed -n 's/.*"sha":"\([^"]*\)".*/\1/p')
if [ "$CANON_SHA" != "$DEPLOY_SHA" ]; then
  echo "  ✗ Canonical-хост отдаёт sha='$CANON_SHA', ожидался '$DEPLOY_SHA'."
  echo "  → Прокси/edge ведёт не на этот релиз. Деплой НЕ завершён."
  exit 1
fi
echo "  → Canonical host ✓ ($CANON_SHA)"
REMOTE

# --- 6. Release lock ---
echo "[6/6] Снятие deploy-lock..."
ssh "$SERVER" rmdir /opt/neuroexpert/.deploy.lock/started /opt/neuroexpert/.deploy.lock 2>/dev/null \
  || ssh "$SERVER" rm -rf /opt/neuroexpert/.deploy.lock

echo ""
echo "=== Деплой завершён: $DEPLOY_SHA на https://$DOMAIN ==="
echo "→ Внешняя проверка: EXPECTED_SHA=$DEPLOY_SHA node scripts/verify-canonical-release.mjs --require-head"
