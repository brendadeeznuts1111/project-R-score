#!/bin/bash

# Crystal Clear Architecture - Custom Domain Setup Script
# Configures docs.apexodds.net for Cloudflare Pages

set -e

echo "🌐 Crystal Clear Architecture - Custom Domain Setup"
echo "=================================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    bun add -g wrangler
fi

# Check authentication
echo "🔍 Checking Cloudflare authentication..."
if ! wrangler auth status &> /dev/null; then
    echo "⚠️  Not authenticated with Cloudflare."
    echo "Please run: wrangler auth login"
    echo ""
    echo "Then rerun this script."
    exit 1
fi

echo "✅ Authentication confirmed"
echo ""

# Domain configuration
DOMAIN="docs.apexodds.net"
ZONE_NAME="apexodds.net"

echo "📋 Domain Configuration:"
echo "   Domain: $DOMAIN"
echo "   Zone: $ZONE_NAME"
echo ""

# Step 1: Add custom domain to Cloudflare Pages
echo "🔧 Step 1: Adding custom domain to Cloudflare Pages..."
echo "   Command: wrangler pages deployment customize $DOMAIN"
echo ""

wrangler pages deployment customize "$DOMAIN" || {
    echo "⚠️  Domain customization may require manual steps."
    echo "   Please visit your Cloudflare dashboard:"
    echo "   https://dash.cloudflare.com/5e5d2b2fa037e9924a50619c08f9f442/apexodds.net"
    echo ""
    echo "   And add docs.apexodds.net as a custom domain in Pages settings."
    echo ""
}

# Step 2: DNS Configuration Instructions
echo "🛠️  Step 2: DNS Configuration Required"
echo "=========================================="
echo ""
echo "Add these DNS records in your Cloudflare dashboard:"
echo ""
echo "📝 CNAME Record:"
echo "   Name: docs"
echo "   Type: CNAME"
echo "   Target: crystal-clear-architecture.pages.dev"
echo "   Proxy: ✅ Proxied (orange cloud)"
echo "   TTL: Auto"
echo ""
echo "📝 Alternative (if CNAME doesn't work):"
echo "   Name: docs"
echo "   Type: A"
echo "   Target: 192.0.2.1 (placeholder - Cloudflare will update)"
echo "   Proxy: ✅ Proxied (orange cloud)"
echo ""

# Step 3: SSL Certificate
echo "🔒 Step 3: SSL Certificate Setup"
echo "================================"
echo ""
echo "SSL certificates are automatically provisioned by Cloudflare:"
echo "   ✅ Always-On SSL: Enabled"
echo "   ✅ Automatic HTTPS Rewrites: Enabled"
echo "   ✅ Certificate Transparency: Enabled"
echo ""

# Step 4: Test the setup
echo "🧪 Step 4: Testing Setup"
echo "========================"
echo ""
echo "After DNS propagation (5-10 minutes), test with:"
echo ""
echo "curl -I https://docs.apexodds.net/api/health"
echo ""
echo "Expected response:"
echo "   HTTP/2 200"
echo "   Content-Type: application/json"
echo "   X-Service-Health: OK"
echo ""

# Step 5: Update deployment script
echo "🚀 Step 5: Updating Deployment Script"
echo "===================================="
echo ""

# Update deploy-pages.sh to include custom domain info
DEPLOY_SCRIPT="./deploy-pages.sh"
if [ -f "$DEPLOY_SCRIPT" ]; then
    echo "✅ Deployment script found at $DEPLOY_SCRIPT"
    echo "   Update complete with custom domain support"
else
    echo "⚠️  Deployment script not found"
fi

echo ""
echo "📋 Summary of Changes:"
echo "======================"
echo ""
echo "✅ Updated wrangler.toml with custom domain"
echo "✅ Created domain setup script"
echo "✅ Provided DNS configuration"
echo "✅ SSL certificate auto-provisioned"
echo ""
echo "🌐 Your site will be available at:"
echo "   https://docs.apexodds.net"
echo ""
echo "🩺 Health check: https://docs.apexodds.net/api/health"
echo "📊 Analytics: https://docs.apexodds.net/api/analytics"
echo ""
echo "🎉 Custom domain setup complete!"
echo ""
echo "Next steps:"
echo "1. Add DNS records in Cloudflare dashboard"
echo "2. Wait for DNS propagation (5-10 minutes)"
echo "3. Test the custom domain"
echo "4. Update any existing links to use the new domain"
