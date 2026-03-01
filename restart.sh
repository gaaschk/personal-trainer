#!/bin/bash
set -e

export NODE_ENV=production
export DATABASE_URL="file:/home/ubuntu/personal-trainer/trainer.db"

echo "Pulling latest code..."
git pull

echo "Installing dependencies..."
npm ci

echo "Running database migrations..."
npx prisma migrate deploy

echo "Building application..."
npm run build

echo "Restarting PM2 process..."
pm2 restart trainer || pm2 start npm --name trainer -- start

echo "Done!"
