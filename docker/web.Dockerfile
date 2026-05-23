FROM node:20-alpine AS base
RUN corepack enable

# Install НУЦ Минцифры CA (root + sub) for Russian gov-signed endpoints
# (GigaChat, YandexGPT, Yandex SpeechKit и т.п.). Без этого Node.js fetch
# падает с "self-signed certificate in certificate chain" на *.sberbank.ru.
# NODE_EXTRA_CA_CERTS читается Node at startup как доп trust anchors.
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
COPY apps/web/package.json ./apps/web/
COPY apps/bot/package.json ./apps/bot/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/apps/bot/node_modules ./apps/bot/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
# Remove worker to avoid pulling its deps into type-check
RUN rm -rf apps/worker
# Remove symlink and create empty .env.local so Next.js build doesn't fail
RUN rm -f apps/web/.env.local && touch apps/web/.env.local
RUN pnpm --filter shared build
RUN pnpm --filter bot build
# Next.js needs NEXT_PUBLIC_* at build time for static pages
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
RUN pnpm --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
RUN mkdir -p /app/apps/web/.next/cache && chown -R nextjs:nodejs /app/apps/web/.next/cache
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
