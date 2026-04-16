#!/bin/sh
set -e

echo "Running migrations..."
./apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "Checking if seed is needed..."
WORD_COUNT=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.word.count().then(c => { console.log(c); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$WORD_COUNT" -lt "100" ]; then
  echo "Seeding database with words..."
  node apps/api/dist/seed/run-seed.js
  echo "Seed complete."
else
  echo "Database already seeded ($WORD_COUNT words)."
fi

echo "Starting application..."
exec node apps/api/dist/main
