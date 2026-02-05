#!/bin/bash
# FactoryWager Quick Deployment

echo "🚀 Quick FactoryWager Deployment"

# 1. Deploy worker
echo "🔧 Deploying worker..."
bunx wrangler deploy

# 2. Upload sample data
echo "📦 Uploading sample data..."
echo '{"version": "1.3.8", "status": "active"}' | bunx wrangler r2 object put factory-wager-registry/status.json --file=-

# 3. Test deployment
echo "🔍 Testing deployment..."
curl -s https://factory-wager-registry.your-subdomain.workers.dev/health | bunx jq

echo "✅ Quick deployment complete!"
