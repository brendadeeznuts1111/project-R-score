#!/bin/bash
# Helper script to check Cloudflare API tokens and authentication

ACCOUNT_ID="7a470541a704caaf91e71efccc78fd36"

echo "🔍 Checking Cloudflare API Authentication..."
echo ""

# Check if API token is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN is not set"
  echo ""
  echo "To set it:"
  echo "  export CLOUDFLARE_API_TOKEN=\"your_token_here\""
  echo ""
  echo "Or add to .env file:"
  echo "  CLOUDFLARE_API_TOKEN=your_token_here"
  echo ""
else
  echo "✅ CLOUDFLARE_API_TOKEN is set"
  TOKEN_LENGTH=${#CLOUDFLARE_API_TOKEN}
  echo "   Token length: $TOKEN_LENGTH characters"
  echo ""
fi

echo "📋 Token Types Explained:"
echo ""
echo "1. Standard Cloudflare API Token (for Vectorize/Workers CLI):"
echo "   - Used by: wrangler CLI, Vectorize operations"
echo "   - Permissions needed: Account.Cloudflare Workers:Edit, Account.Cloudflare Vectorize:Edit"
echo "   - Create at: https://dash.cloudflare.com/profile/api-tokens"
echo ""
echo "2. AI Search Service API Token (for AI Search instances):"
echo "   - Used by: AI Search internally to access R2/Vectorize/Workers AI"
echo "   - Created automatically when creating AI Search instances via dashboard"
echo "   - View registered tokens:"
echo "     curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai-search/tokens \\"
echo "       -H \"Authorization: Bearer \$CLOUDFLARE_API_TOKEN\""
echo ""

# Try to verify authentication
if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
  echo "🔐 Testing authentication..."
  bunx wrangler whoami 2>&1 | head -5
  echo ""
fi

echo "📝 For Vectorize setup, you need a Standard Cloudflare API Token"
echo "   (not an AI Search Service API Token)"
