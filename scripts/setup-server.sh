#!/bin/bash
# One-time server setup for AI Personal Trainer on Ubuntu 22.04 (Lightsail)
# Run as the default ubuntu user: bash setup-server.sh
set -e

APP_DIR="$HOME/personal-trainer"
REPO_URL="https://github.com/gaaschk/personal-trainer.git"
NODE_VERSION="20"

echo "=== 1. System packages ==="
sudo apt-get update -y
sudo apt-get install -y git curl nginx postgresql postgresql-contrib

echo "=== 2. Node.js $NODE_VERSION LTS ==="
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version

echo "=== 3. PM2 ==="
sudo npm install -g pm2
pm2 --version

echo "=== 4. PostgreSQL setup ==="
# Create DB user and database
sudo -u postgres psql -c "CREATE USER trainer WITH PASSWORD 'changeme';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE personal_trainer OWNER trainer;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE personal_trainer TO trainer;" 2>/dev/null || true

echo "=== 5. Clone repository ==="
if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "Directory $APP_DIR already exists — skipping clone"
fi

echo ""
echo "=== 6. Create .env file ==="
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" << 'EOF'
# Database (update password to match what you set in step 4)
DATABASE_URL="postgresql://trainer:changeme@localhost:5432/personal_trainer"

# NextAuth — generate with: openssl rand -base64 32
AUTH_SECRET=""
AUTH_URL="http://YOUR_LIGHTSAIL_IP"

# Google OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Apple OAuth (optional)
APPLE_ID=""
APPLE_SECRET=""

# Anthropic
ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-sonnet-4-6"
EOF
  echo ""
  echo ">>> .env created at $APP_DIR/.env"
  echo ">>> EDIT IT NOW before continuing: nano $APP_DIR/.env"
  echo ">>> Press Enter when done..."
  read -r
else
  echo ".env already exists — skipping"
fi

echo "=== 7. Initial deploy ==="
cd "$APP_DIR"
npm ci
npx prisma migrate deploy
npm run build
pm2 start npm --name trainer -- start
pm2 save
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u ubuntu --hp "$HOME"

echo "=== 8. Nginx reverse proxy ==="
sudo tee /etc/nginx/sites-available/trainer > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    # Increase timeouts for AI streaming responses
    proxy_read_timeout 120s;
    proxy_connect_timeout 10s;
    proxy_send_timeout 120s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Required for NDJSON streaming — disable response buffering
        proxy_buffering off;
        proxy_cache off;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/trainer /etc/nginx/sites-enabled/trainer
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo ""
echo "================================================"
echo " Setup complete!"
echo " App running at: http://$(curl -s ifconfig.me)"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Add GitHub secrets (see repo → Settings → Secrets → Actions):"
echo "     LIGHTSAIL_HOST = $(curl -s ifconfig.me)"
echo "     LIGHTSAIL_USER = ubuntu"
echo "     LIGHTSAIL_SSH_KEY = <paste your private key>"
echo ""
echo "  2. Open port 80 in Lightsail firewall (Networking tab → Add rule → HTTP)."
echo "  3. Push to main to trigger your first automated deploy."
