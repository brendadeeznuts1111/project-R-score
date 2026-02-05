#!/bin/bash
# FactoryWager DNS Setup Script
# Replace with your actual values

CLOUDFLARE_API_TOKEN="your_api_token_here"
DOMAIN="factory-wager.com"
REGISTRY_IP="1.2.3.4"  # Replace with actual load balancer IP

echo "🌐 Setting up DNS for $DOMAIN..."

# Get Zone ID
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$DOMAIN" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

if [ "$ZONE_ID" = "null" ]; then
  echo "❌ Zone not found. Add $DOMAIN to Cloudflare first."
  exit 1
fi

echo "✅ Zone ID: $ZONE_ID"

# Create registry A record
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "registry",
    "content": "'$REGISTRY_IP'",
    "ttl": 3600,
    "proxied": true
  }' | jq -r '.success'

echo "🔧 DNS setup complete!"
echo "⏳ Wait for propagation, then test with:"
echo "   dig registry.$DOMAIN"
echo "   curl -I https://registry.$DOMAIN/health"
