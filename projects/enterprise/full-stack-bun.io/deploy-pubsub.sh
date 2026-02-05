#!/bin/bash
# Pub/Sub Arbitrage Engine Deployment
# [PUBSUB-ARB][SERVERWEBSOCKET][SPAWNSYNC][ENTERPRISE]

set -e

echo "🚀 Pub/Sub Arbitrage Engine - Enterprise Deployment"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Build pub/sub binary
echo "📦 Building pub/sub binary..."
bun build --compile pubsub-arb-engine.ts \
  --target=bun-linux-x64 \
  --outfile=hyperbun-pubsub \
  --minify

if [ ! -f hyperbun-pubsub ]; then
  echo -e "${YELLOW}⚠️  Build failed, using source mode${NC}"
  USE_SOURCE=true
else
  echo -e "${GREEN}✅ Binary built successfully${NC}"
  sudo cp hyperbun-pubsub /usr/local/bin/
  sudo chmod +x /usr/local/bin/hyperbun-pubsub
fi

# 2. Create systemd service template
echo "📝 Creating systemd service..."
sudo tee /etc/systemd/system/hyperbun-pubsub@.service <<EOF
[Unit]
Description=HyperBun Pub/Sub Arbitrage Engine #%i
After=network.target

[Service]
Type=simple
User=hyperbun
ExecStart=${USE_SOURCE:-/usr/local/bin/hyperbun-pubsub}
Restart=always
Environment=PORT=%i
Environment=DB_PATH=/var/lib/hyperbun/pubsub-%i.db
Environment=MLGS_PATH=/var/lib/hyperbun/mlgs-pubsub-%i.db
LimitNOFILE=50000

[Install]
WantedBy=multi-user.target
EOF

# 3. Create data directory
echo "📁 Creating data directory..."
sudo mkdir -p /var/lib/hyperbun
sudo chown hyperbun:hyperbun /var/lib/hyperbun

# 4. Scale to multiple nodes (optional)
if [ "$1" = "--scale" ]; then
  echo "🔢 Scaling to 10 nodes..."
  for i in {3004..3013}; do
    echo "  Starting node on port $i..."
    sudo systemctl enable hyperbun-pubsub@$i
    sudo systemctl start hyperbun-pubsub@$i
  done
else
  echo "🚀 Starting single node on port 3004..."
  sudo systemctl daemon-reload
  sudo systemctl enable hyperbun-pubsub@3004
  sudo systemctl start hyperbun-pubsub@3004
fi

# 5. Verify deployment
echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check status:"
echo "  sudo systemctl status hyperbun-pubsub@3004"
echo ""
echo "View logs:"
echo "  sudo journalctl -u hyperbun-pubsub@3004 -f"
echo ""
echo "Health check:"
echo "  curl http://localhost:3004/health | jq"
echo ""



