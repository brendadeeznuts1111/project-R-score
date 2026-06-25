#!/bin/bash

# Cloudflare Pages Deployment Script
# Crystal Clear Architecture Documentation Deployment

set -e

echo "🚀 Starting Cloudflare Pages deployment for Crystal Clear Architecture..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it:"
    echo "bun add -g wrangler"
    exit 1
fi

# Check if authenticated
if ! wrangler auth status &> /dev/null; then
    echo "❌ Not authenticated with Cloudflare. Please run:"
    echo "wrangler auth login"
    exit 1
fi

# Build the documentation
echo "📦 Building documentation..."
bun run build:docs

# Deploy to Cloudflare Pages
echo "☁️ Deploying to Cloudflare Pages..."
if [ "$1" = "preview" ]; then
    echo "📋 Deploying to preview environment..."
    wrangler pages deploy dist --branch=preview --commit-message="Preview deployment $(date)"
else
    echo "🚀 Deploying to production..."
    wrangler pages deploy dist --branch=main --commit-message="Production deployment $(date)"
fi

echo "✅ Deployment completed successfully!"
echo ""

# Check if custom domain is configured
if curl -s -f "https://docs.apexodds.net/api/health" > /dev/null; then
    CUSTOM_DOMAIN_STATUS="✅ Active"
    CUSTOM_DOMAIN_URL="https://docs.apexodds.net"
else
    CUSTOM_DOMAIN_STATUS="⚠️  Pending DNS/SSL setup"
    CUSTOM_DOMAIN_URL="https://docs.apexodds.net (setup required)"
fi

echo "🌐 Your site is available at:"
echo "   Production: https://crystal-clear-architecture.pages.dev"
echo "   Preview:    https://preview.crystal-clear-architecture.pages.dev"
echo "   Custom:     $CUSTOM_DOMAIN_URL [$CUSTOM_DOMAIN_STATUS]"
echo ""

echo "🩺 Health checks:"
echo "   Pages:      https://crystal-clear-architecture.pages.dev/api/health"
if [ "$CUSTOM_DOMAIN_STATUS" = "✅ Active" ]; then
    echo "   Custom:     https://docs.apexodds.net/api/health"
fi
echo ""

echo "📊 API endpoints:"
echo "   Analytics:  https://crystal-clear-architecture.pages.dev/api/analytics"
echo "   Link Health: https://crystal-clear-architecture.pages.dev/api/link-health"
if [ "$CUSTOM_DOMAIN_STATUS" = "✅ Active" ]; then
    echo "   Custom Analytics:  https://docs.apexodds.net/api/analytics"
    echo "   Custom Link Health: https://docs.apexodds.net/api/link-health"
fi
echo ""

echo "🔧 Management commands:"
echo "   Monitor logs: bun run monitor"
echo "   Test custom domain: bun run domain:test"
echo "   Validate setup: bun run domain:validate"
if [ "$CUSTOM_DOMAIN_STATUS" != "✅ Active" ]; then
    echo ""
    echo "🚀 Custom domain setup:"
    echo "   Setup: bun run domain:setup"
    echo "   Guide: CUSTOM-DOMAIN-SETUP-GUIDE.md"
fi
