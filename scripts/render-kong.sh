#!/bin/bash
# =============================================================================
# НейроЭксперт — Render kong.yml from template via envsubst
# -----------------------------------------------------------------------------
# Запускается НА ПРОДЕ (в /opt/neuroexpert) после rsync/git pull.
# Идемпотентный: повторный запуск с теми же ключами даёт тот же kong.yml.
#
# Почему нужен: Kong НЕ подставляет ${ANON_KEY}/${SERVICE_ROLE_KEY} из env vars
# в declarative config — он читает файл как есть. Без envsubst все запросы к
# Supabase API → 401 "Invalid authentication credentials".
#
# Маппинг имён: в kong.yml.template переменные называются ANON_KEY и
# SERVICE_ROLE_KEY, а в /opt/neuroexpert/.env — NEXT_PUBLIC_SUPABASE_ANON_KEY
# и SUPABASE_SERVICE_ROLE_KEY. Нужен явный export перед envsubst.
#
# kong.yml — в .gitignore, генерируется только на сервере.
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/neuroexpert}"
cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "  ✗ $APP_DIR/.env не найден" >&2
  exit 1
fi

if [ ! -f docker/supabase/kong.yml.template ]; then
  echo "  ✗ docker/supabase/kong.yml.template не найден" >&2
  exit 1
fi

ANON_KEY=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env | cut -d= -f2- | tr -d '"' | tr -d "'")
SERVICE_ROLE_KEY=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" .env | cut -d= -f2- | tr -d '"' | tr -d "'")

if [ -z "${ANON_KEY:-}" ] || [ -z "${SERVICE_ROLE_KEY:-}" ]; then
  echo "  ✗ NEXT_PUBLIC_SUPABASE_ANON_KEY или SUPABASE_SERVICE_ROLE_KEY пустые в .env" >&2
  exit 1
fi

export ANON_KEY SERVICE_ROLE_KEY

# Рендерим только наши две переменные — остальные ${...} (если появятся) не трогаем
envsubst '$ANON_KEY $SERVICE_ROLE_KEY' \
  < docker/supabase/kong.yml.template \
  > docker/supabase/kong.yml

# Sanity check: убедимся, что подстановка сработала (в результате не должно быть ${ANON_KEY})
if grep -q '\${ANON_KEY}\|\${SERVICE_ROLE_KEY}' docker/supabase/kong.yml; then
  echo "  ✗ envsubst не подставил переменные — проверь kong.yml.template" >&2
  exit 1
fi

echo "  → docker/supabase/kong.yml сгенерирован ($(wc -l < docker/supabase/kong.yml) строк)"
