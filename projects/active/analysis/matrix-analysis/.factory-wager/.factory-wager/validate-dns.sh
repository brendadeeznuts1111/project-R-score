#!/bin/bash
# FactoryWager DNS Validation Script using bunx
# Usage: ./validate-dns.sh

REGISTRY_DOMAIN="registry.factory-wager.co"
MAIN_DOMAIN="factory-wager.com"

echo "🔍 FactoryWager DNS Validation"
echo "============================="

echo ""
echo "📋 DNS Resolution Tests:"
echo "System DNS:"
bunx dig +short $REGISTRY_DOMAIN || echo "❌ Not resolved"

echo "Google DNS:"
bunx dig +short $REGISTRY_DOMAIN @8.8.8.8 || echo "❌ Not resolved"

echo "Cloudflare DNS:"
bunx dig +short $REGISTRY_DOMAIN @1.1.1.1 || echo "❌ Not resolved"

echo ""
echo "🌐 HTTP Connectivity Tests:"
echo "HTTPS Test:"
bunx curl -I --connect-timeout 5 https://$REGISTRY_DOMAIN/health 2>&1 | head -1 || echo "❌ Connection failed"

echo "TLS Certificate Test:"
echo | bunx openssl s_client -connect $REGISTRY_DOMAIN:443 -servername $REGISTRY_DOMAIN 2>/dev/null | bunx openssl x509 -noout -dates -subject 2>/dev/null || echo "❌ TLS handshake failed"

echo ""
echo "📊 Cloudflare Edge Detection:"
bunx curl -I --connect-timeout 5 https://$REGISTRY_DOMAIN/health 2>&1 | grep -E "(cf-ray|x-cache|age)" || echo "❌ No edge headers found"

echo ""
echo "⏡ Regional Health Tests:"
REGIONS=("us-east-1" "eu-west-1" "ap-southeast-1")
for region in "${REGIONS[@]}"; do
  echo "Testing $region:"
  bunx curl -I --connect-timeout 3 "https://$REGISTRY_DOMAIN/health?region=$region" 2>&1 | head -1 || echo "❌ $region failed"
done

echo ""
echo "✅ Validation complete!"
