#!/bin/bash
# Ultra-Fast Package Registry - Production Deployment Script

set -e

echo "🚀 Starting production deployment..."

# Build production bundle
echo "🏗️ Building production bundle..."
bun run build-production.ts

# Create production database if it doesn't exist
if [ ! -f "./registry-production.db" ]; then
    echo "🗄️ Initializing production database..."
    bun run src/ultra-fast-registry.ts &
    SERVER_PID=$!
    sleep 3
    kill $SERVER_PID 2>/dev/null || true
fi

# Start production server
echo "🚀 Starting production server..."
exec bun run src/production-server.ts
