# syntax=docker/dockerfile:1

# ---- Dependencies + Prisma client (build stage) ------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# npm ci + cache cleanup in the same layer: installing with `npm install`
# otherwise leaves a ~300 MB npm cache inside the final image.
# Remove dependency source maps here so the pruned tree is what gets copied.
RUN npm ci --omit=dev \
    && npm cache clean --force \
    && find node_modules -name '*.map' -type f -delete 2>/dev/null || true

# Prisma 7 reads the datasource URL from prisma.config.ts (env resolves eagerly),
# so generation needs DATABASE_URL set — it does not connect at build time.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgres://build:build@localhost:5432/build" npx prisma generate

# ---- Runtime ------------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# bash for the entrypoint; openssl libraries for Prisma's schema engine
# (Prisma 7 has no Rust query engine, but `migrate deploy` uses the schema engine).
RUN apk add --no-cache bash openssl postgresql-client

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma.config.ts ./
COPY . .

RUN chmod +x docker-entrypoint.sh \
    && cp docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
