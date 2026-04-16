#!/bin/bash
# One-time deploy script for Block 1 (steps 1.1-1.4)
# Usage: bash scripts/deploy-block1.sh
set -e

HOST="hostland"  # SSH alias from ~/.ssh/config (root@185.221.213.104)
APP_DIR="/opt/neuroexpert"

echo "=== Step 1: rsync ==="
rsync -avz --progress --delete \
  -e "ssh -F $HOME/.ssh/config" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='dist' \
  --exclude='docker/supabase/kong.yml' \
  ./ "$HOST:$APP_DIR/"

echo "=== Step 2: render-kong.sh ==="
ssh "$HOST" "cd $APP_DIR && bash scripts/render-kong.sh"

echo "=== Step 3: docker build web ==="
ssh "$HOST" "cd $APP_DIR && docker compose -f docker/docker-compose.prod.yml --env-file .env build web"

echo "=== Step 4: docker up web ==="
ssh "$HOST" "cd $APP_DIR && docker compose -f docker/docker-compose.prod.yml --env-file .env up -d web"

echo "=== Step 5: apply migration 016 ==="
ssh "$HOST" "docker exec -i docker-supabase-db-1 psql -U postgres -d postgres" < packages/supabase/migrations/016_referrals_settings.sql

echo "=== Step 6: apply migration 017 ==="
ssh "$HOST" "docker exec -i docker-supabase-db-1 psql -U postgres -d postgres" < packages/supabase/migrations/017_api_keys_tier.sql

echo "=== Step 7: healthcheck ==="
ssh "$HOST" "curl -sk https://neuroexpertise.ru/api/health | head -1"

echo "=== DONE ==="
