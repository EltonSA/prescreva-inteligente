#!/bin/sh

cd /app/api && npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "Prisma db push failed, continuing..."

cd /app/api && node dist/server.js &
cd /app/web && node server.js &

wait -n
exit $?
