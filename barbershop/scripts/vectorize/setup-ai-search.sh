#!/bin/bash
# Setup script for Cloudflare AI Search instance
# Requires: AI Search API token, R2 bucket with knowledge base documents

set -e

ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-""}
AI_SEARCH_API_TOKEN=${AI_SEARCH_API_TOKEN:-""}
R2_BUCKET_NAME=${R2_KNOWLEDGE_BASE_BUCKET:-"barbershop-knowledge-base"}
INSTANCE_ID="barbershop-knowledge-base"

if [ -z "$ACCOUNT_ID" ]; then
  echo "❌ Error: CLOUDFLARE_ACCOUNT_ID not set"
  echo "   Get it from: https://dash.cloudflare.com/?to=/:account/settings/api"
  exit 1
fi

if [ -z "$AI_SEARCH_API_TOKEN" ]; then
  echo "❌ Error: AI_SEARCH_API_TOKEN not set"
  echo "   Create one at: https://dash.cloudflare.com/?to=/:account/ai/ai-search"
  echo "   Permissions: Account > AI Search > Edit"
  exit 1
fi

echo "🔧 Creating AI Search instance..."
echo "   Account ID: $ACCOUNT_ID"
echo "   Instance ID: $INSTANCE_ID"
echo "   R2 Bucket: $R2_BUCKET_NAME"
echo ""

# Create AI Search instance with path filtering
# Only index files in /knowledge-base/** directory
RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai-search/instances" \
  -H "Authorization: Bearer $AI_SEARCH_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{
    \"id\": \"$INSTANCE_ID\",
    \"type\": \"r2\",
    \"source\": \"$R2_BUCKET_NAME\",
    \"source_params\": {
      \"include_items\": [\"/knowledge-base/**\"]
    }
  }")

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ AI Search instance created successfully!"
  echo ""
  echo "Instance details:"
  echo "$RESPONSE" | jq '.result' 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "Next steps:"
  echo "1. ✅ Path filtering configured automatically (include: /knowledge-base/**)"
  echo "2. Wait for indexing to complete (check dashboard for progress)"
  echo "3. Deploy worker: npx wrangler deploy"
  echo ""
  echo "💡 The instance will only index files matching /knowledge-base/** pattern"
else
  echo "❌ Failed to create instance:"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi
