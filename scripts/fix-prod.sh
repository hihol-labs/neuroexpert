#!/usr/bin/env bash
# fix-prod.sh — исправление P0-багов на production (2026-04-07)
#
# Что делает:
#   1. Проверяет состояние БД (niches, questions, experts, articles)
#   2. Применяет seed-миграции 004/005, если niches или questions пустые
#   3. Деплоит локальные правки (sitemap.ts, layout.tsx, middleware.ts, niche-channels.ts)
#   4. Перезапускает web-контейнер
#   5. Проверяет healthcheck и sitemap
#
# Запуск (с локальной машины, из корня репо):
#   bash scripts/fix-prod.sh
#
# Требования: SSH-доступ к root@155.212.185.216

set -euo pipefail

SERVER="root@155.212.185.216"
REMOTE_DIR="/opt/neuroexpert"
DOMAIN="https://neuroexpertise.ru"

log() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; }

log "Шаг 1/6: Проверка состояния БД на проде"
COUNTS=$(ssh -o StrictHostKeyChecking=no "$SERVER" "docker exec -i docker-supabase-db-1 psql -U postgres -d postgres -tA -c \"
  SELECT (SELECT count(*) FROM niches)::text || ',' ||
         (SELECT count(*) FROM questions)::text || ',' ||
         (SELECT count(*) FROM profiles WHERE is_published=true)::text || ',' ||
         (SELECT count(*) FROM content_packages WHERE status='published')::text;
\"")
echo "  Результат (niches,questions,experts,articles): $COUNTS"

NICHES_COUNT=$(echo "$COUNTS" | cut -d',' -f1)
QUESTIONS_COUNT=$(echo "$COUNTS" | cut -d',' -f2)

log "Шаг 2/6: Применение seed-миграций (если нужно)"
if [ "${NICHES_COUNT:-0}" -lt 20 ]; then
  echo "  niches = $NICHES_COUNT < 20 → применяю 004_seed_niches.sql"
  ssh "$SERVER" "docker exec -i docker-supabase-db-1 psql -U postgres -d postgres" \
    < packages/supabase/migrations/004_seed_niches.sql
  ok "004_seed_niches.sql применён"
else
  ok "niches уже засеяны ($NICHES_COUNT шт)"
fi

if [ "${QUESTIONS_COUNT:-0}" -lt 100 ]; then
  echo "  questions = $QUESTIONS_COUNT < 100 → применяю 005_seed_questions.sql"
  ssh "$SERVER" "docker exec -i docker-supabase-db-1 psql -U postgres -d postgres" \
    < packages/supabase/migrations/005_seed_questions.sql
  ok "005_seed_questions.sql применён"
else
  ok "questions уже засеяны ($QUESTIONS_COUNT шт)"
fi

log "Шаг 3/6: Синхронизация кода на сервер (rsync)"
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='dist' \
  ./ "$SERVER:$REMOTE_DIR/"
ok "Код синхронизирован"

log "Шаг 4/6: Пересборка и перезапуск web-контейнера"
ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f docker/docker-compose.prod.yml --env-file .env build web && docker compose -f docker/docker-compose.prod.yml --env-file .env up -d web"
ok "web перезапущен"

log "Шаг 5/6: Ожидание готовности (20 сек)"
sleep 20

log "Шаг 6/6: Проверка"
HEALTH=$(curl -sk "$DOMAIN/api/health" | head -c 200)
echo "  /api/health: $HEALTH"

SITEMAP_COUNT=$(curl -sk "$DOMAIN/sitemap.xml" | grep -c "<loc>" || true)
echo "  sitemap.xml: $SITEMAP_COUNT URL"

STATS=$(curl -sk "$DOMAIN/api/platform-stats")
echo "  /api/platform-stats: $STATS"

if [ "${SITEMAP_COUNT:-0}" -gt 10 ]; then
  ok "Sitemap содержит более 10 URL — баг исправлен"
else
  err "Sitemap всё ещё содержит $SITEMAP_COUNT URL — проверь вручную"
fi

log "Готово! Открой в браузере:"
echo "  - $DOMAIN/sitemap.xml"
echo "  - $DOMAIN/questions (должно быть 300+ вопросов)"
echo "  - $DOMAIN/niches/psychology (должна открываться)"
