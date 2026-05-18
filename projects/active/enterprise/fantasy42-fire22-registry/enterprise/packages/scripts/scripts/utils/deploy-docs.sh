#!/bin/bash

# Crystal Clear Docs Worker Deployment Script
# This script automates the deployment of the documentation CDN worker

set -e

echo "🚀 Crystal Clear Documentation CDN Deployment"
echo "=============================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    bun add -g wrangler
fi

# Check if user is logged in to Cloudflare
echo "🔍 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  Not authenticated with Cloudflare. Please login:"
    wrangler auth login
fi

# Navigate to docs-worker directory
echo "📁 Changing to docs-worker directory..."
cd docs-worker

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Run type check
echo "🔍 Running type check..."
bun run typecheck

# Deploy
echo "🚀 Deploying to Cloudflare Workers..."
bun run deploy

# Verify deployment
echo "🩺 Verifying deployment..."
sleep 5

WORKER_URL="https://crystal-clear-docs.nolarose1968.workers.dev"

if curl -s -f "$WORKER_URL/api/health" > /dev/null; then
    echo "✅ Deployment successful!"
    echo ""
    echo "📖 Live Documentation URLs:"
    echo "   🌐 Main Site: $WORKER_URL"
    echo "   🩺 Health Check: $WORKER_URL/api/health"
    echo "   📋 API Info: $WORKER_URL/api/docs"
    echo "   📞 Communication: $WORKER_URL/communication.html"
    echo "   🌐 Domains: $WORKER_URL/domains.html"
    echo "   ⚡ Performance: $WORKER_URL/performance.html"
    echo ""
    echo "🎉 Crystal Clear Documentation CDN is now live!"
else
    echo "⚠️  Deployment completed but health check failed"
    echo "   This may be normal for the first few minutes after deployment"
    echo "   Check the URLs above to verify the deployment"
fi
