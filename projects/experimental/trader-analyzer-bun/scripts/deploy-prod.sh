#!/bin/bash
# [DEPLOY.PRODUCTION.SCRIPT.RG] Production Deployment Script
# One-command full stack deployment with pre-flight checks and monitoring

set -e

echo "🚀 Starting production deployment..."

# 1. Pre-flight checks
echo "📋 Running pre-flight checks..."
bun --version || { echo "❌ Bun not found"; exit 1; }
bun run typecheck || { echo "❌ TypeScript errors"; exit 1; }
bun test --retry=3 || { echo "❌ Tests failed"; exit 1; }

# 2. Build with production optimizations
echo "🔨 Building production bundle..."
bun run build || { echo "❌ Build failed"; exit 1; }

# 3. Pre-warm caches and pools
echo "🔥 Pre-warming caches..."
export BUN_DNS_CACHE_SIZE=10000
export BUN_WORKER_POOL_SIZE=16

# 4. Health check function
check_health() {
  local url=${1:-"http://localhost:3000/health"}
  local max_attempts=${2:-30}
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if curl -sf "$url" > /dev/null 2>&1; then
      echo "✅ Service healthy at $url"
      return 0
    fi
    attempt=$((attempt + 1))
    echo "⏳ Health check attempt $attempt/$max_attempts..."
    sleep 1
  done

  echo "❌ Health check failed after $max_attempts attempts"
  return 1
}

# 5. Start server in background
echo "🎯 Starting production server..."
bun run start &
SERVER_PID=$!

# Wait for server to start
sleep 2

# 6. Health check loop
if check_health; then
  echo "✅ Deployment successful!"
  echo "📊 Server PID: $SERVER_PID"
  echo "🌐 Health endpoint: http://localhost:3000/health"
  echo "📈 Metrics endpoint: http://localhost:3000/metrics"
else
  echo "❌ Deployment failed - service not healthy"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

# 7. Log completion
echo "🚀 Deployed at $(date)"
echo "📝 Logs: Check console output or log files"
