#!/bin/bash
# Enterprise v5 - Runtime Hardened
# [ENTERPRISE-ARB-V5][RUNTIME-HARDENED][MYSQL-SAFE][ANSI-DX]

set -e

echo "🚀 Enterprise Arbitrage Engine v5 - Runtime Hardened Deployment"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Global ~/.bunfig.toml (single load)
echo "📝 Creating ~/.bunfig.toml..."
mkdir -p ~/.config
cat > ~/.bunfig.toml <<EOF
[install]
linker = "hoisted"
cache = true

[serve]
port = 3005
development = false
EOF

echo -e "${GREEN}✅ Bunfig config created${NC}"

# 2. Hardened binary
echo ""
echo "📦 Building enterprise binary..."
bun build --compile enterprise-arb-v5.ts \
  --target=bun-linux-x64 \
  --outfile=hyperbun-enterprise \
  --minify

if [ ! -f hyperbun-enterprise ]; then
  echo -e "${YELLOW}⚠️  Build failed, using source mode${NC}"
  USE_SOURCE=true
else
  echo -e "${GREEN}✅ Binary built successfully${NC}"
  sudo cp hyperbun-enterprise /usr/local/bin/
  sudo chmod +x /usr/local/bin/hyperbun-enterprise
fi

# 3. MySQL-ready production
echo ""
echo "📝 Creating systemd service..."
sudo mkdir -p /etc/hyperbun

# Create MySQL env file template
sudo tee /etc/hyperbun/mysql.env <<EOF
# MySQL Configuration
MYSQL_HOST=bookie-mysql.corp
MYSQL_USER=hyperbun
MYSQL_PASS=your-password-here
MYSQL_DB=arbitrage_db
EOF

sudo tee /etc/systemd/system/hyperbun-enterprise.service <<EOF
[Unit]
Description=HyperBun Enterprise Arbitrage v5
After=mysql.service network.target

[Service]
Type=simple
User=hyperbun
ExecStartPre=bun install --frozen-lockfile
ExecStart=${USE_SOURCE:-/usr/local/bin/hyperbun-enterprise}
EnvironmentFile=/etc/hyperbun/mysql.env
Environment=PORT=3005
Environment=DB_PATH=/var/lib/hyperbun/enterprise-v5.db
Environment=MLGS_PATH=/var/lib/hyperbun/mlgs-enterprise-v5.db
LimitNOFILE=200000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 4. Create data directory
echo ""
echo "📁 Creating data directory..."
sudo mkdir -p /var/lib/hyperbun
sudo chown hyperbun:hyperbun /var/lib/hyperbun

# 5. Deploy
echo ""
echo "🚀 Deploying service..."
sudo systemctl daemon-reload
sudo systemctl enable hyperbun-enterprise
sudo systemctl start hyperbun-enterprise

# 6. Verify deployment
echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check status:"
echo "  sudo systemctl status hyperbun-enterprise"
echo ""
echo "View logs:"
echo "  sudo journalctl -u hyperbun-enterprise -f"
echo ""
echo "Health check:"
echo "  curl http://localhost:3005/health | jq"
echo ""
echo "Diagnostics:"
echo "  curl http://localhost:3005/diagnostics | jq"
echo ""



