#!/bin/bash
set -e

export DATABASE_URL="file:/home/ubuntu/personal-trainer/trainer.db"

echo "Pulling latest code..."
git pull

echo "Installing dependencies..."
# Must NOT set NODE_ENV=production here — Next.js build needs devDependencies (Tailwind, PostCSS, etc.)
npm ci --include=dev

echo "Running database migrations..."
npx prisma migrate deploy

echo "Stopping PM2 to free memory for build..."
pm2 stop trainer 2>/dev/null || true
sleep 3  # Allow SQLite WAL connections to fully close

echo "Building application..."
NODE_ENV=production npm run build

echo "Restarting PM2 process..."
pm2 restart trainer || pm2 start npm --name trainer -- start

echo "Done!"
