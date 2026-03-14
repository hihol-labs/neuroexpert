#!/bin/bash
# =============================================================================
# Генерация .env для production
# Запуск: bash scripts/generate-env.sh > .env
# =============================================================================

set -euo pipefail

# --- Generate secrets ---
JWT_SECRET=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-40)
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/')
REVALIDATION_SECRET=$(openssl rand -hex 16)
WEBHOOK_SECRET=$(openssl rand -hex 16)

# --- Generate Supabase JWT keys ---
# ANON KEY (role: anon)
ANON_KEY=$(node -e "
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  role:'anon',
  iss:'supabase',
  iat:Math.floor(Date.now()/1000),
  exp:Math.floor(Date.now()/1000)+10*365*24*3600
})).toString('base64url');
const sig = crypto.createHmac('sha256','${JWT_SECRET}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

# SERVICE ROLE KEY (role: service_role)
SERVICE_KEY=$(node -e "
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  role:'service_role',
  iss:'supabase',
  iat:Math.floor(Date.now()/1000),
  exp:Math.floor(Date.now()/1000)+10*365*24*3600
})).toString('base64url');
const sig = crypto.createHmac('sha256','${JWT_SECRET}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

cat <<EOF
# ===== GENERATED $(date -I) =====
# НейроЭксперт Production Environment

# ===== ОБЩИЕ =====
NODE_ENV=production
APP_URL=https://neuroexpertise.ru

# ===== SUPABASE =====
NEXT_PUBLIC_SUPABASE_URL=https://supabase.neuroexpertise.ru
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
SUPABASE_DB_URL=postgresql://postgres:${DB_PASSWORD}@supabase-db:5432/postgres
SUPABASE_DB_PASSWORD=${DB_PASSWORD}
SUPABASE_JWT_SECRET=${JWT_SECRET}
API_EXTERNAL_URL=https://supabase.neuroexpertise.ru

# ===== TELEGRAM =====
TELEGRAM_BOT_TOKEN=                      # <-- Вставь токен от @BotFather
TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}
TELEGRAM_WEBHOOK_URL=https://neuroexpertise.ru/api/webhooks/telegram

# ===== OPENAI =====
OPENAI_API_KEY=                          # <-- Вставь OpenAI API Key
OPENAI_MODEL_BULK=gpt-4o-mini
OPENAI_PROXY_URL=                        # <-- Вставь прокси (https://user:pass@host:port)

# ===== LLM =====
LLM_PRIMARY_PROVIDER=openai
LLM_FALLBACK_PROVIDER=
STT_PRIMARY_PROVIDER=whisper
STT_FALLBACK_PROVIDER=

# ===== CLAUDE (если нужен как fallback) =====
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# ===== YANDEX (опционально) =====
YANDEX_CLOUD_API_KEY=
YANDEX_CLOUD_FOLDER_ID=
YANDEX_API_KEY=
YANDEX_FOLDER_ID=

# ===== GIGACHAT (опционально) =====
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=

# ===== SCANNER =====
PERPLEXITY_API_KEY=

# ===== ДАННЫЕ О СПРОСЕ (опционально) =====
XMLRIVER_API_KEY=
XMLRIVER_USER_ID=
SERPAPI_API_KEY=

# ===== ОПЛАТА (опционально) =====
YUKASSA_SHOP_ID=
YUKASSA_SECRET_KEY=
YUKASSA_WEBHOOK_SECRET=

# ===== EMAIL (опционально) =====
RESEND_API_KEY=
EMAIL_FROM=noreply@neuroexpertise.ru

# ===== SMTP для Supabase Auth (опционально, без SMTP — autoconfirm) =====
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_ADMIN_EMAIL=noreply@neuroexpertise.ru

# ===== АНАЛИТИКА (опционально) =====
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
PLAUSIBLE_API_KEY=

# ===== CDN (опционально) =====
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_API_TOKEN=

# ===== ИНДЕКСАЦИЯ (опционально) =====
GSC_SERVICE_ACCOUNT_JSON=
BING_WEBMASTER_API_KEY=
YANDEX_WEBMASTER_TOKEN=
YANDEX_WEBMASTER_HOST_ID=

# ===== REVALIDATION =====
REVALIDATION_SECRET=${REVALIDATION_SECRET}

# ===== КРОССПОСТ (опционально) =====
DZEN_API_TOKEN=
HABR_API_TOKEN=

# ===== PUBLIC =====
NEXT_PUBLIC_APP_URL=https://neuroexpertise.ru

# ===== WORKER =====
WORKER_POLL_INTERVAL_MS=5000
WORKER_CONCURRENCY=3
EOF
