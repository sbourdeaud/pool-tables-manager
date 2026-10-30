FROM node:22-bookworm-slim
WORKDIR /app
# Install system deps required by Prisma (OpenSSL 3 is provided by the base image)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
# Generate the Prisma client at build time. Prisma 7 reads the datasource URL
# from prisma.config.ts (env is resolved eagerly), so pass a dummy URL — the
# client is generated, not connected. The entrypoint regenerates at runtime.
RUN DATABASE_URL="postgres://build:build@localhost:5432/build" npx prisma generate

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
