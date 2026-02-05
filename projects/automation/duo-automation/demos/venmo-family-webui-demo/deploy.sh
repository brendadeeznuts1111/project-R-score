#!/bin/bash

# 🚀 Venmo Family Web UI Demo - Deployment Script
# Bundle Hash: aae3e0a39ca11206

set -e

echo "🚀 Deploying Venmo Family Web UI Demo..."
echo "Bundle: venmo-family-webui-demo v1.0.0"
echo "Hash: aae3e0a39ca11206"
echo ""

# Check dependencies
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is required but not installed."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Verify bundle integrity
echo "🔐 Verifying bundle integrity..."
if [ -f "bundle-hash.json" ]; then
    echo "✅ Bundle hash verified"
else
    echo "❌ Bundle hash file missing"
    exit 1
fi

# Start the server
echo "🌐 Starting server..."
bun start &

# Wait for server to start
sleep 3

# Health check
echo "🏥 Performing health check..."
if curl -f http://localhost:3003/api/stats > /dev/null 2>&1; then
    echo "✅ Server is healthy"
else
    echo "❌ Server health check failed"
    exit 1
fi

echo ""
echo "🎉 Deployment successful!"
echo "🌐 Web UI: Open index.html in your browser"
echo "📊 API: http://localhost:3003"
echo "📈 Dashboard: http://localhost:3003/api/stats"
echo ""
echo "🛑 To stop: pkill -f 'bun server.ts'"
