FROM node:20-alpine AS base
RUN corepack enable && apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install НУЦ Минцифры CA (root + sub) for Russian gov-signed endpoints
# (GigaChat, YandexGPT, Yandex SpeechKit и т.п.). Без этого Node.js fetch
# падает с "self-signed certificate in certificate chain" на *.sberbank.ru.
RUN apk add --no-cache ca-certificates wget \
    && wget -qO /usr/local/share/ca-certificates/russian_trusted_root_ca.crt \
         "https://gu-st.ru/content/Other/doc/russian_trusted_root_ca.cer" \
    && wget -qO /usr/local/share/ca-certificates/russian_trusted_sub_ca.crt \
         "https://gu-st.ru/content/Other/doc/russian_trusted_sub_ca.cer" \
    && update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter shared build
RUN pnpm --filter worker build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/package.json ./
CMD ["node", "apps/worker/dist/index.js"]
