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
# Сбрасываем tracked-модификации (артефакты старых деплоев), untracked
# (.env, kong.yml) не трогаем.
git reset --hard HEAD
git fetch origin --prune
if ! git cat-file -e "${DEPLOY_SHA}^{commit}" 2>/dev/null; then
  echo "  ✗ SHA $DEPLOY_SHA не найден на origin."
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

# --- 4. Migrations (tracked, fail-loud) ---
echo "[4/5] Миграции БД..."
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/neuroexpert
COMPOSE="docker compose -f docker/docker-compose.prod.yml"

echo "  → Ожидание PostgreSQL..."
timeout 60 bash -c "until $COMPOSE exec -T supabase-db pg_isready -U postgres >/dev/null 2>&1; do sleep 2; done" \
  || { echo "  ✗ PostgreSQL не поднялся за 60с"; exit 1; }

PSQL="$COMPOSE exec -T supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1"

# Трекинг применённых миграций
$PSQL -qAtc "CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"

# Baseline: если трекинг пуст, а схема уже обжита (>5 таблиц) — помечаем
# существующие файлы применёнными без прогона (прод жил без трекинга до ADR-002).
TRACKED=$($PSQL -qAtc "SELECT count(*) FROM public.schema_migrations")
TABLES=$($PSQL -qAtc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [ "$TRACKED" = "0" ] && [ "$TABLES" -gt "5" ]; then
  echo "  → Baseline: помечаю существующие миграции применёнными (таблиц: $TABLES)"
  for f in packages/supabase/migrations/*.sql; do
    $PSQL -qAtc "INSERT INTO public.schema_migrations(filename) VALUES ('$(basename "$f")') ON CONFLICT DO NOTHING"
  done
fi

APPLIED=0
for f in packages/supabase/migrations/*.sql; do
  NAME=$(basename "$f")
  DONE=$($PSQL -qAtc "SELECT 1 FROM public.schema_migrations WHERE filename='$NAME'")
  if [ "$DONE" != "1" ]; then
    echo "  → Applying $NAME..."
    $PSQL -f /dev/stdin < "$f"
    $PSQL -qAtc "INSERT INTO public.schema_migrations(filename) VALUES ('$NAME')"
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

echo ""
echo "=== Деплой завершён: $DEPLOY_SHA на https://$DOMAIN ==="
echo "→ Внешняя проверка: node scripts/verify-canonical-release.mjs --require-head"
