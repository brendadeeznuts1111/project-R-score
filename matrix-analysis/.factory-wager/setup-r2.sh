#!/bin/bash
# FactoryWager R2 Setup Script
# Automated configuration guide for Cloudflare R2 integration

set -e

echo "🌐 FactoryWager R2 Setup Script"
echo "==============================="
echo ""

# Check current reality status
echo "🔍 Step 1: Checking current reality status..."
bun run fw --mode=audit-reality
echo ""

# Guide for manual credential setup
echo "📋 Step 2: R2 Credential Setup Guide"
echo "===================================="
echo ""
echo "1. 🌐 Get Cloudflare R2 Credentials:"
echo "   - Login to: https://dash.cloudflare.com"
echo "   - Go to: R2 Object Storage → Manage R2 API tokens"
echo "   - Create token with 'Object Storage:Edit' and 'Object Storage:Read'"
echo ""
echo "2. 📝 Required Environment Variables:"
echo "   - R2_ACCESS_KEY_ID (32 characters)"
echo "   - R2_SECRET_ACCESS_KEY (64 characters)"
echo "   - R2_BUCKET_NAME (your bucket name)"
echo "   - R2_ENDPOINT (https://ACCOUNT_ID.r2.cloudflarestorage.com)"
echo ""

# Interactive setup
echo "🔧 Step 3: Interactive Setup (Optional)"
echo "======================================"
echo ""
read -p "Do you want to configure R2 credentials now? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Enter your R2 credentials (or press Enter to skip):"
    echo ""
    
    read -p "R2_ACCESS_KEY_ID: " R2_ACCESS_KEY_ID
    read -p "R2_SECRET_ACCESS_KEY: " R2_SECRET_ACCESS_KEY
    read -p "R2_BUCKET_NAME: " R2_BUCKET_NAME
    read -p "R2_ENDPOINT: " R2_ENDPOINT
    
    if [[ -n "$R2_ACCESS_KEY_ID" && -n "$R2_SECRET_ACCESS_KEY" && -n "$R2_BUCKET_NAME" && -n "$R2_ENDPOINT" ]]; then
        echo ""
        echo "💾 Saving credentials to .env.local..."
        cat >> .env.local << EOF
# FactoryWager R2 Configuration - $(date)
R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME=$R2_BUCKET_NAME
R2_ENDPOINT=$R2_ENDPOINT
EOF
        echo "✅ Credentials saved to .env.local"
        echo ""
        echo "🔄 Reloading environment..."
        export R2_ACCESS_KEY_ID
        export R2_SECRET_ACCESS_KEY
        export R2_BUCKET_NAME
        export R2_ENDPOINT
    else
        echo "⚠️  Incomplete credentials - skipping setup"
    fi
else
    echo "⏭️  Skipping interactive setup"
fi

echo ""

# Test R2 connectivity
echo "🧪 Step 4: Testing R2 Connectivity"
echo "=================================="

if [[ -n "$R2_ACCESS_KEY_ID" && -n "$R2_SECRET_ACCESS_KEY" ]]; then
    echo "🔍 Testing R2 API connection..."
    
    bun -e '
import { s3 } from "bun";
const creds = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET_NAME,
  endpoint: process.env.R2_ENDPOINT
};

console.log("🔍 Testing connection to:", creds.endpoint);
console.log("📦 Bucket:", creds.bucket);

try {
  const list = await s3(creds).listObjects({ maxKeys: 1 });
  console.log("✅ R2 API responsive, buckets accessible");
  console.log("🎉 R2 integration successful!");
} catch (e) {
  console.log("❌ R2 connection failed:", e.message);
  console.log("");
  console.log("💡 Troubleshooting:");
  console.log("   1. Verify credentials are correct");
  console.log("   2. Check bucket exists");
  console.log("   3. Ensure API token has proper permissions");
  console.log("   4. Verify endpoint URL format");
}
'
else
    echo "⚠️  R2 credentials not configured"
    echo "   Please set environment variables and try again"
fi

echo ""

# Final reality check
echo "📊 Step 5: Final Reality Status"
echo "==============================="
bun run fw --mode=audit-reality

echo ""
echo "🎯 Setup Complete!"
echo "================"
echo ""
echo "📚 Next Steps:"
echo "   1. If R2 is still simulated, check credentials above"
echo "   2. Configure secrets with: bun run secrets:enterprise:set"
echo "   3. Test archives: bun run archive:create --id=test-r2"
echo "   4. Monitor status: bun run nexus:status"
echo ""
echo "📋 Full Guide: .factory-wager/R2-SETUP-GUIDE.md"
echo "🔍 Reality Check: bun run fw --mode=audit-reality"
