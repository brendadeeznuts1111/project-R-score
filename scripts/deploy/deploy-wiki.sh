#!/bin/bash
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?Required env var CLOUDFLARE_API_TOKEN not set}"
: "${R2_ACCOUNT_ID:?Required env var R2_ACCOUNT_ID not set}"
: "${WIKI_DEPLOY_PATH:?Required env var WIKI_DEPLOY_PATH not set}"
: "${R2_BUCKET_NAME:?Required env var R2_BUCKET_NAME not set}"

echo "🚀 Deploying wiki from ${WIKI_DEPLOY_PATH} to R2 bucket ${R2_BUCKET_NAME}..."

UPLOAD_URL=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET_NAME}/objects/index.html/upload-url" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"customKey": "index.html"}' | jq -r '.result.uploadURL')

if [ "$UPLOAD_URL" = "null" ] || [ -z "$UPLOAD_URL" ]; then
  echo "❌ Failed to get upload URL"
  exit 1
fi

echo "📤 Uploading wiki file..."
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: text/html" \
  --data-binary @"${WIKI_DEPLOY_PATH}"

if [ $? -eq 0 ]; then
  echo "✅ Wiki deployed successfully to R2!"
else
  echo "❌ Upload failed"
  exit 1
fi
