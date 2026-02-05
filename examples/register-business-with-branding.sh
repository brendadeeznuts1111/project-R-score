#!/bin/bash
# Complete example: Register business with full branding

PROXY_URL="${PROXY_URL:-http://localhost:3002}"
ADMIN_SECRET="${ADMIN_SECRET:-admin-secret-change-in-production}"

echo "🏢 Registering business with full branding..."
echo ""

curl -X POST "${PROXY_URL}/admin/business" \
  -H "Authorization: Bearer ${ADMIN_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Golden Scissors Barbershop",
    "alias": "GoldenScissors",
    "startDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "paymentHandles": {
      "cashapp": "$GoldenScissors",
      "venmo": "@GoldenScissors",
      "paypal": "paypal.me/GoldenScissors"
    },
    "contact": "contact@goldenscissors.com",
    "location": "123 Main St, Downtown",
    "branding": {
      "logoUrl": "https://via.placeholder.com/200/FF6B35/FFFFFF?text=GS",
      "logoText": "GS",
      "primaryColor": "#FF6B35",
      "secondaryColor": "#FF8C5A",
      "accentColor": "#FFB380",
      "backgroundColor": "linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)",
      "fontFamily": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      "faviconUrl": "https://via.placeholder.com/32/FF6B35/FFFFFF?text=G",
      "theme": "light"
    }
  }' | jq '.'

echo ""
echo "✅ Business registered!"
echo ""
echo "View payment page:"
echo "${PROXY_URL}/pay?alias=GoldenScissors&amount=25"
