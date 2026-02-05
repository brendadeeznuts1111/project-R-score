#!/bin/bash
# Deploy basketball spy stats to Cloudflare Workers

echo "🚀 Deploying Basketball Spy Stats to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

# Deploy to production
wrangler deploy --env production

echo "✅ Deployed to: https://ultra-arb.youraccount.workers.dev/basketball/spy-stats"
echo ""
echo "🧪 Test endpoints:"
echo "  curl https://ultra-arb.youraccount.workers.dev/basketball/spy-stats"
echo "  curl https://ultra-arb.youraccount.workers.dev/health"
echo "  curl https://ultra-arb.youraccount.workers.dev/basketball/top-markets"



