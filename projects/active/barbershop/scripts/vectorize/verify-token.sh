#!/bin/bash
# Verify Cloudflare API token permissions

ACCOUNT_ID="7a470541a704caaf91e71efccc78fd36"

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN is not set"
  exit 1
fi

echo "🔐 Verifying API token permissions..."
echo ""

# Test token with a simple API call
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Token is valid"
  echo "$BODY" | grep -o '"status":"[^"]*"' || echo "$BODY"
  echo ""
  
  # Check if token has Vectorize permissions by trying to list indexes
  echo "🔍 Checking Vectorize access..."
  VECTORIZE_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/vectorize/v2/indexes" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json")
  
  VECTORIZE_HTTP_CODE=$(echo "$VECTORIZE_RESPONSE" | tail -n1)
  
  if [ "$VECTORIZE_HTTP_CODE" = "200" ]; then
    echo "✅ Token has Vectorize access"
  else
    echo "❌ Token does not have Vectorize access (HTTP $VECTORIZE_HTTP_CODE)"
    echo ""
    echo "Your token needs these permissions:"
    echo "  - Account.Cloudflare Workers:Edit"
    echo "  - Account.Cloudflare Vectorize:Edit"
    echo ""
    echo "Create a new token at: https://dash.cloudflare.com/profile/api-tokens"
    echo "Use 'Edit Cloudflare Workers' template or create custom token with above permissions"
  fi
else
  echo "❌ Token verification failed (HTTP $HTTP_CODE)"
  echo "$BODY"
  echo ""
  echo "The token may be invalid or expired."
  echo "Create a new token at: https://dash.cloudflare.com/profile/api-tokens"
fi
