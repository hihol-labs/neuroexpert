#!/bin/bash
# =============================================================================
# НейроЭксперт — Deploy to production
# Запуск с локальной машины: bash scripts/deploy.sh
# =============================================================================

set -euo pipefail

SERVER="root@155.212.185.216"
REPO="https://github.com/HiH-DimaN/neuroexpert.git"
APP_DIR="/opt/neuroexpert"
DOMAIN="neuroexpertise.ru"

echo "=== НейроЭксперт: Deploy ==="

# --- 1. Clone/pull repo on server ---
echo "[1/6] Синхронизация кода..."
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
APP_DIR="/opt/neuroexpert"
REPO="https://github.com/HiH-DimaN/neuroexpert.git"

if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  echo "  → git pull OK"
else
  git clone "$REPO" "$APP_DIR"
  echo "  → git clone OK"
fi
REMOTE

# --- 2. Check .env exists ---
echo "[2/6] Проверка .env..."
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
if [ ! -f /opt/neuroexpert/.env ]; then
  echo "  ✗ /opt/neuroexpert/.env не найден!"
  echo "  → Сгенерируй: bash scripts/generate-env.sh > .env"
  echo "  → Заполни TELEGRAM_BOT_TOKEN и OPENAI_API_KEY"
  exit 1
fi
echo "  → .env OK"
REMOTE

# --- 3. Apply migrations ---
echo "[3/6] Миграции БД..."
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/neuroexpert

# Wait for DB to be healthy
echo "  → Ожидание PostgreSQL..."
timeout 30 bash -c '
  until docker compose -f docker/docker-compose.prod.yml exec -T supabase-db pg_isready -U postgres 2>/dev/null; do
    sleep 2
  done
' 2>/dev/null || echo "  → DB не запущена, миграции применятся после docker compose up"

# Apply migrations in order
if docker compose -f docker/docker-compose.prod.yml exec -T supabase-db pg_isready -U postgres 2>/dev/null; then
  source .env
  for f in packages/supabase/migrations/*.sql; do
    echo "  → Applying $(basename $f)..."
    docker compose -f docker/docker-compose.prod.yml exec -T supabase-db \
      psql -U postgres -d postgres -f "/dev/stdin" < "$f" 2>&1 || true
  done
  echo "  → Миграции OK"
else
  echo "  → Миграции будут применены после первого запуска"
fi
REMOTE

# --- 4. Build & start ---
echo "[4/6] Сборка и запуск..."
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/neuroexpert
docker compose -f docker/docker-compose.prod.yml --env-file .env build --parallel
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d
echo "  → Контейнеры запущены"
REMOTE

# --- 5. Wait for health ---
echo "[5/6] Ожидание готовности..."
sleep 10
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
for i in $(seq 1 12); do
  if docker compose -f /opt/neuroexpert/docker/docker-compose.prod.yml exec -T web wget -q --spider http://localhost:3000/api/health 2>/dev/null; then
    echo "  → Web healthy ✓"
    break
  fi
  echo "  → Ожидание... ($i/12)"
  sleep 5
done
docker compose -f /opt/neuroexpert/docker/docker-compose.prod.yml ps
REMOTE

# --- 6. Apply migrations (if DB just started) ---
echo "[6/6] Финализация миграций..."
ssh "$SERVER" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/neuroexpert
source .env

# Check if tables exist
TABLE_COUNT=$(docker compose -f docker/docker-compose.prod.yml exec -T supabase-db \
  psql -U postgres -d postgres -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -lt "5" ]; then
  echo "  → Применяю миграции..."
  for f in packages/supabase/migrations/*.sql; do
    echo "  → $(basename $f)"
    docker compose -f docker/docker-compose.prod.yml exec -T supabase-db \
      psql -U postgres -d postgres < "$f" 2>&1 || true
  done
  echo "  → Миграции применены"
else
  echo "  → Таблицы уже существуют ($TABLE_COUNT шт)"
fi
REMOTE

echo ""
echo "=== Деплой завершён ==="
echo "→ Сайт:     https://neuroexpertise.ru"
echo "→ Supabase: https://supabase.neuroexpertise.ru"
echo "→ Логи:     ssh $SERVER 'cd /opt/neuroexpert && docker compose -f docker/docker-compose.prod.yml logs -f'"
