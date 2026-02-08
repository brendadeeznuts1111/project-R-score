#!/bin/bash

# Cloudflare R2 Deployment Script
# Upload wiki to Cloudflare R2 storage

API_TOKEN="QqjM0VxMBlFte0Gg4bBD-ZhMaD9COITsFfIi7y4y"
ACCOUNT_ID="7a470541a704caaf91e71efccc78fd36"
BUCKET_NAME="factory-wager-wiki"
WIKI_FILE="/Users/nolarose/Projects/wiki-deploy/index.html"

echo "🚀 Deploying wiki to Cloudflare R2..."

# Get upload URL for R2
UPLOAD_URL=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/r2/buckets/$BUCKET_NAME/objects/index.html/upload-url" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customKey": "index.html"}' | jq -r '.result.uploadURL')

if [ "$UPLOAD_URL" = "null" ] || [ -z "$UPLOAD_URL" ]; then
  echo "❌ Failed to get upload URL"
  exit 1
fi

echo "📤 Uploading wiki file..."

# Upload the file
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: text/html" \
  --data-binary @"$WIKI_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Wiki deployed successfully to R2!"
  echo "🌐 Available at: https://wiki.factorywager.com"
else
  echo "❌ Upload failed"
  exit 1
fi
