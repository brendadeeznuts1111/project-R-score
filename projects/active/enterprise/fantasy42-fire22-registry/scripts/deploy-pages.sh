#!/bin/bash
# Deploy to Cloudflare Pages

echo "🚀 Deploying to Cloudflare Pages..."

# Build the application
bun run build

# Deploy to production
wrangler pages deploy dist --branch main --commit-message "Deploy $(date)"

echo "✅ Deployment complete!"
echo "🌐 Dashboard available at: https://dashboard.fire22.dev"
