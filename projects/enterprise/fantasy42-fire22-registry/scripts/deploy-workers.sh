#!/bin/bash
# Deploy Cloudflare Workers

echo "⚙️ Deploying Cloudflare Workers..."

# Deploy worker
wrangler deploy

# Update routes
wrangler route create api.fire22.dev/* --script fire22-dashboard

echo "✅ Worker deployment complete!"
