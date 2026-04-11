#!/usr/bin/env bash
# fix-prod.sh — исправление P0-багов на production (2026-04-07)
#
# Запуск с ЛОКАЛЬНОЙ машины из корня репо:
#   bash scripts/fix-prod.sh
#
# Потребует ввести пароль SSH 2 раза:
#   1) для rsync (синхронизация кода)
#   2) для финального блока (seed БД + docker build + restart)
#
# Совет: чтобы не вводить пароль — один раз сделай:
#   ssh-copy-id root@155.212.185.216

set -euo pipefail

SERVER="root@155.212.185.216"
REMOTE_DIR="/opt/neuroexpert"
DOMAIN="https://neuroexpertise.ru"

log() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; }

log "Шаг 1/3: Синхронизация кода на сервер (rsync)"
rsync -az --delete --info=stats2 \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='dist' \
  --exclude='docker/supabase/kong.yml' \
  ./ "$SERVER:$REMOTE_DIR/"
ok "Код синхронизирован"

log "Шаг 1b/3: Регенерация kong.yml из template (envsubst)"
ssh -T "$SERVER" "cd $REMOTE_DIR && bash scripts/render-kong.sh"
ok "kong.yml актуален"

log "Шаг 2/3: Seed БД (если нужно) + rebuild + restart web"
ssh -T "$SERVER" "REMOTE_DIR=$REMOTE_DIR bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
cd "$REMOTE_DIR"

DB_CONTAINER="docker-supabase-db-1"

log() { printf "\n  \033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "  \033[1;32m✓ %s\033[0m\n" "$*"; }

# 1. Проверка счётчиков
log "Проверка состояния БД"
COUNTS=$(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -tA -c "
  SELECT (SELECT count(*) FROM niches)::text || ',' ||
         (SELECT count(*) FROM questions)::text || ',' ||
         (SELECT count(*) FROM profiles WHERE is_published=true)::text || ',' ||
         (SELECT count(*) FROM content_packages WHERE status='published')::text;
")
echo "  niches,questions,experts,articles = $COUNTS"

NICHES_COUNT=$(echo "$COUNTS" | cut -d',' -f1 | tr -d ' ')
QUESTIONS_COUNT=$(echo "$COUNTS" | cut -d',' -f2 | tr -d ' ')

# 2. Seed niches
if [ "${NICHES_COUNT:-0}" -lt 20 ]; then
  log "niches = $NICHES_COUNT < 20 → применяю 004_seed_niches.sql"
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres \
    < packages/supabase/migrations/004_seed_niches.sql
  ok "004_seed_niches.sql применён"
else
  ok "niches уже засеяны ($NICHES_COUNT)"
fi

# 3. Seed questions
if [ "${QUESTIONS_COUNT:-0}" -lt 100 ]; then
  log "questions = $QUESTIONS_COUNT < 100 → применяю 005_seed_questions.sql"
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres \
    < packages/supabase/migrations/005_seed_questions.sql
  ok "005_seed_questions.sql применён"
else
  ok "questions уже засеяны ($QUESTIONS_COUNT)"
fi

# 4. Финальная сверка
log "Финальные счётчики"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -c "
  SELECT 'niches' AS table, count(*) FROM niches
  UNION ALL SELECT 'questions', count(*) FROM questions
  UNION ALL SELECT 'published_experts', count(*) FROM profiles WHERE is_published=true
  UNION ALL SELECT 'published_articles', count(*) FROM content_packages WHERE status='published';
"

# 5. Пересборка и перезапуск web
log "Пересборка web-контейнера"
docker compose -f docker/docker-compose.prod.yml --env-file .env build web
ok "Build завершён"

log "Перезапуск web"
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d web
ok "web перезапущен"

log "Ожидание готовности (15 сек)"
sleep 15

log "Статус контейнеров"
docker compose -f docker/docker-compose.prod.yml --env-file .env ps
REMOTE_SCRIPT

log "Шаг 3/3: Проверка с локальной машины"
echo -n "  /api/health: "
curl -sk "$DOMAIN/api/health" | head -c 200
echo ""
echo -n "  /api/platform-stats: "
curl -sk "$DOMAIN/api/platform-stats"
echo ""
SITEMAP_COUNT=$(curl -sk "$DOMAIN/sitemap.xml" | grep -c "<loc>" || true)
echo "  sitemap.xml: $SITEMAP_COUNT URL"

if [ "${SITEMAP_COUNT:-0}" -gt 10 ]; then
  ok "Sitemap содержит $SITEMAP_COUNT URL — код-баг исправлен"
else
  err "Sitemap всё ещё содержит $SITEMAP_COUNT URL — проверь логи"
fi

log "Готово! Проверь в браузере:"
echo "  - $DOMAIN/sitemap.xml"
echo "  - $DOMAIN/questions (должны появиться вопросы)"
echo "  - $DOMAIN/niches/psychology (должна открываться)"
