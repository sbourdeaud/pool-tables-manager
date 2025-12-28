# Deployment Guide

## Quick Start - New Deployment

For a fresh deployment with an empty database:

```bash
# 1. Clone the repository
git clone <repository-url>
cd pool-tables-manager

# 2. Start the containers
docker-compose up -d

# 3. Check logs to verify initialization
docker-compose logs -f app
```

The application will automatically:
- Wait for the database to be ready
- Detect if it's a fresh database
- Run all migrations
- Generate the Prisma client
- Start the server

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
- Regenerate Prisma client if needed

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
# Check migration status
docker exec pool-tables-manager-app-1 npx prisma migrate status

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
├── backend/
│   ├── Dockerfile              # App container definition
│   ├── docker-entrypoint.sh    # Startup script (handles migrations)
│   ├── server.js               # Main application
│   ├── package.json            # Dependencies
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Migration files
│   ├── public/                 # Frontend assets
│   └── tests/                  # Integration tests
├── docker-compose.yml          # Container orchestration
└── DEPLOYMENT.md              # This file
```

## Environment Variables

Configure in `docker-compose.yml`:

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `NODE_ENV`: Set to `production` for production deployments

## Ports

- **3000**: Application HTTP port
- **5432**: PostgreSQL (internal only, not exposed by default)

## Volumes

- `db-data`: PostgreSQL data persistence
- `./backend`: Application source (bind mount for development)
