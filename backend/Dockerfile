FROM node:18-bullseye-slim
WORKDIR /app
# Install system deps required by Prisma (OpenSSL 1.1)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates openssl libssl1.1 \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
# generate prisma client if applicable
RUN npx prisma generate || true
EXPOSE 3000
CMD ["node","server.js"]
