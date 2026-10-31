# Deployment Guide

## Quick Start - New Deployment

For a fresh deployment with an empty database:

```bash
# 1. Clone the repository
git clone <repository-url>
cd pool-tables-manager

# 2a. Start from the prebuilt image (recommended)
docker compose pull && docker compose up -d

# 2b. …or build locally from source
docker compose up -d --build

# 3. Check logs to verify initialization
docker compose logs -f app
```

### Using the prebuilt image (GHCR)

Images are published on every release tag to
`ghcr.io/sbourdeaud/pool-tables-manager` (`linux/amd64` and `linux/arm64`), tagged with the release
(e.g. `v1.1.0`) and `latest`. `docker-compose.yml` references that image and still supports local
builds:

```bash
# Run a specific published version
IMAGE_TAG=v1.1.0 docker compose pull app
IMAGE_TAG=v1.1.0 docker compose up -d

# Or the latest published image
docker compose pull && docker compose up -d
```

Building from source remains available with `docker compose up -d --build`.

The application will automatically:
- Wait for the database to be ready
- Detect if it's a fresh database
- Run all migrations
- Generate the Prisma client (Prisma 7 with the PostgreSQL driver adapter)
- Start the server

> **Database requirements**: none beyond a reachable PostgreSQL 18. Upgrading from any previous
> version needs **no manual SQL**: the container applies additive Prisma migrations at startup (the
> most recent adds the nullable `Drink.category` column and backfills obvious items). Take a
> `pg_dump` backup as usual — see [UPGRADE-GUIDE.md](UPGRADE-GUIDE.md).

## Deployment to New Machine

1. **Copy the repository**:
   ```bash
   git clone <repository-url>
   cd pool-tables-manager
   ```

2. **Configure environment variables** (optional):
   Edit `docker-compose.yml` if you need to change:
   - Database credentials
   - Port mappings
   - Volume locations

3. **Start the application**:
   ```bash
   docker-compose up -d
   ```

4. **Verify it's running**:
   ```bash
   docker-compose ps
   docker-compose logs app
   ```

5. **Access the application**:
   Open `http://localhost:3000` (or your configured port)

## Updating Existing Deployment

When pulling updates from the repository:

```bash
# 1. Pull latest changes
git pull

# 2. Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# 3. Check logs
docker-compose logs -f app
```

The entrypoint script will automatically:
- Check for pending migrations
- Apply them safely
- Resolve common migration conflicts
- Regenerate the Prisma client (Prisma 7 + `@prisma/adapter-pg`)
- Start the server

Running the backend **outside Docker** requires Node.js **22.12+** (Prisma 7 / openid-client 6). The
container image already uses `node:22-bookworm-slim`.

## Troubleshooting

### Database Connection Issues
If the app can't connect to the database:
```bash
# Check if database container is running
docker-compose ps

# Check database logs
docker-compose logs db

# Restart both containers
docker-compose restart
```

### Migration Issues
If migrations fail:
```bash
# Check migration status (Prisma 7 reads the URL from prisma.config.ts)
docker exec -e DATABASE_URL="postgres://postgres:example@db:5432/pool_tables" pool-tables-manager-app-1 npx prisma migrate status

# Force reset (WARNING: deletes all data)
docker exec pool-tables-manager-app-1 npx prisma migrate reset --force
docker-compose restart app
```

### Application Not Starting
```bash
# View detailed logs
docker-compose logs -f app

# Check if port 3000 is already in use
netstat -an | grep 3000  # Linux/Mac
netstat -an | findstr 3000  # Windows

# Restart the app container
docker-compose restart app
```

### Clean Slate (Full Reset)
To completely reset everything:
```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Manual Database Operations

### Run Migrations Manually
```bash
docker exec pool-tables-manager-app-1 npx prisma migrate deploy
```

### Check Migration Status
```bash
docker exec pool-tables-manager-app-1 npx prisma migrate status
```

### Access Database Directly
```bash
docker exec -it pool-tables-manager-db-1 psql -U postgres -d pool_tables
```

### Backup Database
```bash
docker exec pool-tables-manager-db-1 pg_dump -U postgres pool_tables > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker exec -i pool-tables-manager-db-1 psql -U postgres -d pool_tables
```

## Production Considerations

1. **Use environment variables for secrets**:
   - Don't commit passwords to git
   - Use Docker secrets or environment files

2. **Configure proper backups**:
   - Schedule regular database backups
   - Test restore procedures

3. **Monitor logs**:
   - Set up log aggregation
   - Monitor for errors

4. **Use a reverse proxy**:
   - Nginx or Traefik for SSL termination
   - Load balancing if needed

5. **Resource limits**:
   - Set memory limits in docker-compose.yml
   - Monitor container resource usage

## Architecture

```
┌─────────────────────────────────────────┐
│         docker-compose.yml              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │     app      │───▶│      db      │  │
│  │   (Node.js)  │    │ (PostgreSQL) │  │
│  │   Port 3000  │    │   Port 5432  │  │
│  └──────────────┘    └──────────────┘  │
│         │                    │          │
│    ┌────┴────┐          ┌───┴───┐      │
│    │ backend │          │ data  │      │
│    │ source  │          │ volume│      │
│    └─────────┘          └───────┘      │
│                                         │
└─────────────────────────────────────────┘
```

## File Structure

```
pool-tables-manager/
├── frontend/                   # React 19 + Vite 8 + Tailwind 4 source
│   └── src/                    # staff SPA, player app, status board
├── backend/
│   ├── Dockerfile              # App container definition (node:22-bookworm-slim)
│   ├── docker-entrypoint.sh    # Startup script (migrations + Prisma client + server)
│   ├── server.js               # Express 5 API + static frontend host
│   ├── prisma.config.ts        # Prisma 7 datasource config
│   ├── package.json            # Dependencies
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Migration files
│   ├── public/                 # Built frontend (index/table/status.html + assets/) + classic/ archive
│   └── tests/                  # Integration tests
├── docker-compose.yml          # Container orchestration
└── DEPLOYMENT.md               # This file
```

The frontend is committed pre-built in `backend/public/`, so deployments do not build the frontend.
To change the UI, edit `frontend/` and run `npm run build` (see [frontend/README.md](frontend/README.md)).

## Environment Variables

Configure in `docker-compose.yml`:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `NODE_ENV`: Set to `production` for production deployments

**Optional card terminal (POS Phase 2)** — enable after enabling “Payments (POS)” in Settings:

- `PAYMENT_PROVIDER=fake`: deterministic provider for testing (no hardware).
- `STRIPE_SECRET_KEY`: Stripe secret key (test or live) — enables card payments.
- `STRIPE_TERMINAL_READER_ID`: reader (`tmr_…`) registered in the Stripe Dashboard.
- `STRIPE_WEBHOOK_SECRET`: signing secret for `https://<your-domain>/api/webhooks/stripe`
  (the endpoint needs to be reachable by Stripe — public HTTPS or a tunnel during testing).
- `COOKIE_SECURE=true`: set when serving the app over HTTPS.

See the **“Setting Up Card Payments”** section of [USER_GUIDE.md](USER_GUIDE.md) for the Stripe
dashboard steps, pilot checklist and troubleshooting (webhooks, stuck payments, settlement
differences, key rotation, disabling payments).

## Releases & container images

Release tags publish a slim multi-arch container image to GHCR
(`ghcr.io/sbourdeaud/pool-tables-manager:<tag>` and `:latest`) — see
[UPGRADE-GUIDE.md](UPGRADE-GUIDE.md).

## Ports

- **3000**: Application HTTP port
- **5432**: PostgreSQL (internal only, not exposed by default)

## Volumes

- `db-data`: PostgreSQL data persistence
- `./backend`: Application source (bind mount for development)
