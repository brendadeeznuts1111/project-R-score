#!/bin/bash
# Minimal example: Register business with basic branding

PROXY_URL="${PROXY_URL:-http://localhost:3002}"
ADMIN_SECRET="${ADMIN_SECRET:-admin-secret-change-in-production}"

echo "🏢 Registering business with minimal branding..."
echo ""

curl -X POST "${PROXY_URL}/admin/business" \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Business",
    "alias": "MyBusiness",
    "startDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "paymentHandles": {
      "cashapp": "$MyBusiness",
      "venmo": "@MyBusiness",
      "paypal": "paypal.me/MyBusiness"
    },
    "contact": "hello@mybusiness.com",
    "branding": {
      "primaryColor": "#4A90E2",
      "backgroundColor": "linear-gradient(135deg, #4A90E2 0%, #7BB3F0 100%)"
    }
  }' | jq '.'

echo ""
echo "✅ Business registered!"
echo ""
echo "View payment page:"
echo "${PROXY_URL}/pay?alias=MyBusiness&amount=25"
