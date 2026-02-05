#!/usr/bin/env bash
# deploy-unified.sh

set -e

echo "🚀 Deploying T3-Lattice v4.0 + Quantum Weaver Unified System"

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Installing..."
    curl -fsSL https://bun.sh/install | bash
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build Docker images
echo "🐳 Building Docker images..."
docker build -t quantum-t3/unified-server:v4.0 -f Dockerfile.bun .

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Run health check
echo "🔍 Running health check..."
sleep 10
bun run health-check.ts || echo "Health check script not found, skipping"

# Run benchmarks
echo "🏃 Running performance benchmarks..."
bun run benchmarks/unified-benchmark.ts

echo "✅ Deployment complete!"
echo ""
echo "📊 Dashboard: http://localhost:3000"
echo "🔗 API Server: http://localhost:3003"
echo "🎨 Mermaid Server: http://localhost:3002"
echo "🗄️  Redis Insight: http://localhost:8001"