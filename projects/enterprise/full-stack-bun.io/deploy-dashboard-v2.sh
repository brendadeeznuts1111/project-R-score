#!/bin/bash
# Dashboard v2 + Monorepo Deploy
# [DASHBOARD-V2][VIEW-TRANSITIONS][CSS-LAYER][MONOREPO]

set -e

echo "🚀 Dashboard v2 + Monorepo Deploy"
echo ""

# 1. Monorepo install (peer deps perfect)
echo "📦 Installing dependencies (peer deps resolved)..."
bun install  # Optional peers resolved ✓

if [ $? -eq 0 ]; then
	echo "✅ Dependencies installed"
else
	echo "❌ Dependency installation failed"
	exit 1
fi

# 2. CSS bundle (view transitions)
echo ""
echo "🎨 Building CSS bundle (view transitions + @layer)..."
mkdir -p dist

# Copy CSS file
cp dashboard.css dist/dashboard.css

# Verify CSS structure
if grep -q "@layer base" dashboard.css && grep -q "::view-transition" dashboard.css; then
	echo "✅ CSS structure verified (view transitions + @layer)"
else
	echo "⚠️  CSS structure may be incomplete"
fi

# 3. Production server build
echo ""
echo "🔨 Building production server..."
bun build --compile dashboard-server-v2.ts \
	--target=bun-linux-x64 \
	--outfile=hyperbun-dashboard-v2 \
	--minify

if [ $? -eq 0 ]; then
	echo "✅ Server compiled successfully"
	chmod +x hyperbun-dashboard-v2
else
	echo "❌ Server compilation failed"
	exit 1
fi

# 4. Create systemd service
echo ""
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/hyperbun-dashboard-v2.service <<EOF > /dev/null
[Unit]
Description=HyperBun Dashboard v2 - View Transitions + Monorepo
After=network.target

[Service]
Type=simple
User=hyperbun
ExecStart=$(pwd)/hyperbun-dashboard-v2
Restart=always
Environment=PORT=3006
LimitNOFILE=50000

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Systemd service created"

# 5. Reload and restart
echo ""
echo "🔄 Reloading systemd and restarting service..."
sudo systemctl daemon-reload
sudo systemctl restart hyperbun-dashboard-v2

if [ $? -eq 0 ]; then
	echo "✅ Service restarted"
else
	echo "❌ Service restart failed"
	exit 1
fi

# 6. Verify deployment
echo ""
echo "🔍 Verifying deployment..."
sleep 2

if curl -s http://localhost:3006/health | grep -q "dashboard-v2-live"; then
	echo "✅ Dashboard v2 is live"
	echo ""
	echo "📊 Dashboard Metrics:"
	curl -s http://localhost:3006/health | jq '.arbitrage'
	echo ""
	echo "🎨 CSS Features:"
	curl -s http://localhost:3006/health | jq '.css_features'
	echo ""
	echo "📦 Monorepo Install:"
	curl -s http://localhost:3006/health | jq '.monorepo_install'
else
	echo "❌ Dashboard health check failed"
	exit 1
fi

echo ""
echo "✅ Dashboard v2 deployment complete!"
echo ""
echo "[DASHBOARD-V2][VIEW-TRANSITIONS][CSS-LAYER][MONOREPO][DEPLOYED]"
echo "[DASHBOARD:http://localhost:3006][STATUS:LIVE]"



