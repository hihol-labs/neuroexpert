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
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "=== НейроЭксперт: Deploy ==="
echo "→ SHA: $DEPLOY_SHA"

# --- 1. Sync repo on server to exact SHA ---
echo "[1/5] Синхронизация кода (checkout $DEPLOY_SHA)..."
ssh "$SERVER" bash -s -- "$DEPLOY_SHA" <<'REMOTE'
set -euo pipefail
DEPLOY_SHA="$1"
APP_DIR="/opt/neuroexpert"
REPO="git@github.com:hihol-labs/neuroexpert.git"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
# Сбрасываем tracked-модификации (артефакты старых деплоев). Untracked
# (.env, kong.yml) не трогаем, КРОМЕ каталога миграций: там stale-файлы
# опасны — шаг 4 исполняет только tracked-файлы, а clean страхует glob.
git reset --hard HEAD
git clean -fd packages/supabase/migrations
git fetch origin --prune
# SHA обязан быть достижим из актуального remote-ref, а не просто лежать
# в локальной object-db после старого fetch.
if ! git branch -r --contains "$DEPLOY_SHA" 2>/dev/null | grep -q .; then
  echo "  ✗ SHA $DEPLOY_SHA не достижим ни из одного origin/* ref."
  echo "  → Сначала запушь ветку: git push origin HEAD"
  exit 1
fi
git checkout --detach "$DEPLOY_SHA"
echo "  → checked out $(git rev-parse --short HEAD)"
REMOTE

# --- 2. Check .env + render kong.yml ---
echo "[2/5] Проверка .env и kong.yml..."
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
echo "[3/5] Сборка и запуск..."
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
echo "[4/5] Миграции БД..."
ssh "$SERVER" bash -s -- "${BASELINE_THROUGH:-}" <<'REMOTE'
set -euo pipefail
BASELINE_THROUGH="${1:-}"
cd /opt/neuroexpert
COMPOSE="docker compose -f docker/docker-compose.prod.yml"

echo "  → Ожидание PostgreSQL..."
timeout 60 bash -c "until $COMPOSE exec -T supabase-db pg_isready -U postgres >/dev/null 2>&1; do sleep 2; done" \
  || { echo "  ✗ PostgreSQL не поднялся за 60с"; exit 1; }

PSQL="$COMPOSE exec -T supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1"

# Трекинг применённых миграций
$PSQL -qAtc "CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"

# Только tracked-файлы текущего checkout — stale/untracked SQL не исполняем.
MIGRATIONS=$(git ls-files -- 'packages/supabase/migrations/*.sql' | sort)
[ -n "$MIGRATIONS" ] || { echo "  ✗ tracked-миграции не найдены"; exit 1; }

TRACKED=$($PSQL -qAtc "SELECT count(*) FROM public.schema_migrations")
TABLES=$($PSQL -qAtc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name <> 'schema_migrations'")
if [ "$TRACKED" = "0" ] && [ "$TABLES" -gt "0" ]; then
  if [ -z "$BASELINE_THROUGH" ]; then
    echo "  ✗ Схема обжита ($TABLES таблиц), а schema_migrations пуст."
    echo "  → Fail-closed: укажи явно BASELINE_THROUGH=<последний применённый файл.sql>"
    echo "    (проверь на проде, какие миграции реально применены), например:"
    echo "    BASELINE_THROUGH=019_transliterate_slugs.sql bash scripts/deploy.sh"
    exit 1
  fi
  echo "$MIGRATIONS" | grep -qx "packages/supabase/migrations/$BASELINE_THROUGH" \
    || { echo "  ✗ BASELINE_THROUGH='$BASELINE_THROUGH' не найден среди tracked-миграций"; exit 1; }
  echo "  → Baseline по операторскому указанию: файлы по $BASELINE_THROUGH включительно"
  for f in $MIGRATIONS; do
    NAME=$(basename "$f")
    $PSQL -qAtc "INSERT INTO public.schema_migrations(filename) VALUES ('$NAME') ON CONFLICT DO NOTHING"
    [ "$NAME" = "$BASELINE_THROUGH" ] && break
  done
fi

APPLIED=0
for f in $MIGRATIONS; do
  NAME=$(basename "$f")
  DONE=$($PSQL -qAtc "SELECT 1 FROM public.schema_migrations WHERE filename='$NAME'")
  if [ "$DONE" != "1" ]; then
    echo "  → Applying $NAME (single transaction)..."
    # Файл + запись трекинга в ОДНОЙ транзакции: неудача откатывает и то и другое.
    { cat "$f"; printf "\nINSERT INTO public.schema_migrations(filename) VALUES ('%s');\n" "$NAME"; } \
      | $PSQL --single-transaction -f /dev/stdin
    APPLIED=$((APPLIED+1))
  fi
done
echo "  → Миграции OK (новых применено: $APPLIED)"
REMOTE

# --- 5. Health + release identity (fail-loud) ---
echo "[5/5] Проверка health и версии релиза..."
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
BODY=$(curl -sS --max-time 20 "https://$DOMAIN/api/version") \
  || { echo "  ✗ https://$DOMAIN/api/version недоступен с сервера"; exit 1; }
CANON_SHA=$(printf '%s' "$BODY" | tr -d ' ' | sed -n 's/.*"sha":"\([^"]*\)".*/\1/p')
if [ "$CANON_SHA" != "$DEPLOY_SHA" ]; then
  echo "  ✗ Canonical-хост отдаёт sha='$CANON_SHA', ожидался '$DEPLOY_SHA'."
  echo "  → Прокси/edge ведёт не на этот релиз. Деплой НЕ завершён."
  exit 1
fi
echo "  → Canonical host ✓ ($CANON_SHA)"
REMOTE

echo ""
echo "=== Деплой завершён: $DEPLOY_SHA на https://$DOMAIN ==="
echo "→ Внешняя проверка: EXPECTED_SHA=$DEPLOY_SHA node scripts/verify-canonical-release.mjs --require-head"
