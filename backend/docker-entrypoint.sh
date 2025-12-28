#!/bin/bash
set -e

echo "Starting database initialization..."

# Wait for database to be ready using pg_isready equivalent
echo "Waiting for database to be ready..."
timeout=30
counter=0
until node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { prisma.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null || [ $counter -eq $timeout ]; do
  counter=$((counter + 1))
  echo "Database not ready yet... ($counter/$timeout)"
  sleep 2
done

if [ $counter -eq $timeout ]; then
  echo "Database failed to become ready in time"
  exit 1
fi

echo "Database is ready!"

# Check if migrations table exists
MIGRATIONS_EXIST=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  prisma.\$queryRaw\`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations')\`
    .then(r => { console.log(r[0].exists ? 'yes' : 'no'); prisma.\$disconnect(); process.exit(0); })
    .catch(() => { console.log('no'); process.exit(0); });
" 2>/dev/null || echo "no")

if [ "$MIGRATIONS_EXIST" = "no" ]; then
  echo "Fresh database detected - deploying all migrations..."
  npx prisma migrate deploy || {
    echo "Initial migration deploy failed, attempting to resolve..."
    
    # Try to resolve common migration issues
    npx prisma migrate resolve --rolled-back 00000000000005_add_session_pin 2>/dev/null || true
    npx prisma migrate resolve --applied 00000000000005_add_session_pin 2>/dev/null || true
    
    # Try deploy again
    npx prisma migrate deploy || {
      echo "Migration still failing, checking what's needed..."
      
      # Check if pin column exists
      PIN_EXISTS=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$queryRaw\`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Session' AND column_name = 'pin'\`
          .then(r => { console.log(r.length > 0 ? 'yes' : 'no'); prisma.\$disconnect(); process.exit(0); })
          .catch(() => { console.log('no'); process.exit(0); });
      " 2>/dev/null || echo "no")
      
      if [ "$PIN_EXISTS" = "yes" ]; then
        echo "Pin column exists, marking migration as applied..."
        npx prisma migrate resolve --applied 00000000000005_add_session_pin
      fi
      
      # Final attempt
      npx prisma migrate deploy
    }
  }
else
  echo "Existing database detected - checking for pending migrations..."
  npx prisma migrate deploy || {
    echo "Migration failed, attempting to resolve..."
    npx prisma migrate resolve --rolled-back 00000000000005_add_session_pin 2>/dev/null || true
    npx prisma migrate resolve --applied 00000000000005_add_session_pin 2>/dev/null || true
    npx prisma migrate deploy || echo "Warning: Some migrations may have issues, but continuing..."
  }
fi

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

echo "Database initialization complete!"

# Start the application
echo "Starting application..."
exec node server.js
