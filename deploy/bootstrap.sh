#!/bin/bash
# Server bootstrap script for personal-trainer on Ubuntu 24.04
# Run once after creating the Lightsail instance.
# Usage: bash bootstrap.sh <github_token>
set -e

GITHUB_TOKEN="${1:-}"
REPO="gaaschk/personal-trainer"
APP_DIR="/home/ubuntu/personal-trainer"

echo "==> Updating system packages..."
sudo apt-get update -q
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -yq

echo "==> Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "==> Installing system tools..."
sudo apt-get install -y nginx certbot python3-certbot-nginx git

echo "==> Installing PM2..."
sudo npm install -g pm2

echo "==> Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "    Directory exists, pulling latest..."
  cd "$APP_DIR"
  git pull
else
  if [ -n "$GITHUB_TOKEN" ]; then
    git clone "https://${GITHUB_TOKEN}@github.com/${REPO}.git" "$APP_DIR"
  else
    git clone "https://github.com/${REPO}.git" "$APP_DIR"
  fi
fi

echo "==> Copying nginx config..."
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/personal-trainer
sudo ln -sf /etc/nginx/sites-available/personal-trainer /etc/nginx/sites-enabled/personal-trainer
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "==> Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Create $APP_DIR/.env.local (see deploy/.env.production template)"
echo "  2. Run: cd $APP_DIR && ./restart.sh"
echo "  3. Issue SSL cert: sudo certbot --nginx -d trainer.kevingaasch.com"
echo "  4. Set up PM2 autostart: pm2 startup && pm2 save"
