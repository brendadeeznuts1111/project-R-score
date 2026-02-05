#!/bin/bash
# DNS CONFIGURATION SCRIPT

DOMAIN="apple.factory-wager.com"
BASE_DOMAIN="factory-wager.com"

echo "🌐 DNS Configuration for $DOMAIN"
echo "=================================="
echo ""

echo "📋 Required DNS Records:"
echo ""

echo "🔸 Main Domain (A Record):"
echo "   Type: A"
echo "   Name: $DOMAIN"
echo "   Content: YOUR_SERVER_IP"
echo "   TTL: 3600"
echo "   Proxy: Enabled (Cloudflare Orange Cloud)"
echo ""

echo "🔸 Subdomain Records (CNAME):"
echo "   Type: CNAME"
echo "   Name: analytics.$DOMAIN"
echo "   Content: $DOMAIN"
echo "   TTL: 3600"
echo "   Proxy: Enabled"
echo ""

echo "   Type: CNAME"
echo "   Name: metrics.$DOMAIN"
echo "   Content: $DOMAIN"
echo "   TTL: 3600"
echo "   Proxy: Enabled"
echo ""

echo "   Type: CNAME"
echo "   Name: dashboard.$DOMAIN"
echo "   Content: $DOMAIN"
echo "   TTL: 3600"
echo "   Proxy: Enabled"
echo ""

echo "   Type: CNAME"
echo "   Name: status.$DOMAIN"
echo "   Content: $DOMAIN"
echo "   TTL: 3600"
echo "   Proxy: Enabled"
echo ""

echo "   Type: CNAME"
echo "   Name: admin.$DOMAIN"
echo "   Content: $DOMAIN"
echo "   TTL: 3600"
echo "   Proxy: Enabled"
echo ""

echo "   Type: CNAME"
echo "   Name: api.$DOMAIN"
echo "   Content: $DOMAIN"
echo "   TTL: 3600"
echo "   Proxy: Enabled"
echo ""

echo "🔧 Cloudflare Settings:"
echo "   SSL/TLS: Full (Strict)"
echo "   Security Level: Medium"
echo "   Cache Level: Standard"
echo "   Browser Cache TTL: 4 hours"
echo "   Always Online: On"
echo "   Auto Minify: HTML, CSS, JavaScript"
echo ""

echo "📝 Setup Instructions:"
echo "1. Log in to Cloudflare dashboard"
echo "2. Select domain: $BASE_DOMAIN"
echo "3. Add DNS records as listed above"
echo "4. Enable proxy (orange cloud) for all records"
echo "5. Configure SSL/TLS settings"
echo "6. Deploy Worker with: bunx wrangler deploy"
echo ""

echo "🧪 Verification Commands:"
echo "   # Test DNS resolution"
echo "   dig +short $DOMAIN"
echo "   dig +short analytics.$DOMAIN"
echo ""
echo "   # Test SSL certificate"
echo "   curl -I https://$DOMAIN"
echo ""
echo "   # Test Worker deployment"
echo "   curl https://$DOMAIN/api/health"
echo ""

echo "⚠️  Important Notes:"
echo "   • Replace YOUR_SERVER_IP with your actual server IP"
echo "   • Enable Cloudflare proxy (orange cloud) for all records"
echo "   • Wait 3-5 minutes for DNS propagation"
echo "   • Test each subdomain after setup"
echo ""

read -p "Have you configured the DNS records? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Testing DNS configuration..."
    
    echo "   Testing main domain..."
    if dig +short $DOMAIN > /dev/null 2>&1; then
        echo "   ✅ $DOMAIN resolves"
    else
        echo "   ❌ $DOMAIN does not resolve"
    fi
    
    echo "   Testing analytics subdomain..."
    if dig +short analytics.$DOMAIN > /dev/null 2>&1; then
        echo "   ✅ analytics.$DOMAIN resolves"
    else
        echo "   ❌ analytics.$DOMAIN does not resolve"
    fi
    
    echo ""
    echo "🚀 Ready for Worker deployment!"
    echo "   Run: ./deploy-workers.sh"
else
    echo "📝 Please configure DNS records first, then run this script again"
fi
