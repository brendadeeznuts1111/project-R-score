#!/bin/bash

# 🌊 R2 Bucket Setup Script
# Sets up environment and tests R2 connection

echo "🌊 R2 Bucket Setup"
echo "=================="

# Check if .env file exists, create if not
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME="bun-executables"

# Build Configuration
BUN_CHECKSUM_SHA256=""
EOF
    echo "✅ .env file created"
    echo "⚠️  Please edit .env file with your R2 credentials"
    echo ""
    echo "📖 How to get R2 credentials:"
    echo "   1. Go to Cloudflare Dashboard → R2 → Manage R2 API tokens"
    echo "   2. Create API token with R2 read/write permissions"
    echo "   3. Copy Account ID from Cloudflare dashboard"
    echo "   4. Update .env file with your credentials"
    echo ""
    exit 1
fi

# Load environment variables
echo "📋 Loading environment variables..."
source .env

# Check if credentials are set
if [ -z "$R2_ACCOUNT_ID" ] || [ -z "$R2_ACCESS_KEY_ID" ] || [ -z "$R2_SECRET_ACCESS_KEY" ] || [ -z "$R2_BUCKET_NAME" ]; then
    echo "❌ Missing required credentials in .env file:"
    echo "   R2_ACCOUNT_ID: ${R2_ACCOUNT_ID:-❌ Not set}"
    echo "   R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID:-❌ Not set}"
    echo "   R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY:-❌ Not set}"
    echo "   R2_BUCKET_NAME: ${R2_BUCKET_NAME:-❌ Not set}"
    echo ""
    echo "⚠️  Please edit .env file and set all required credentials"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "📦 Bucket: $R2_BUCKET_NAME"
echo "🆔 Account: $R2_ACCOUNT_ID"

# Test R2 connection
echo ""
echo "🔄 Testing R2 connection..."

# Run the connection test
bun run r2-connection-test.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 R2 bucket is ready!"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Upload your Bun tarball/executable to R2"
    echo "   2. Configure executablePath to use r2:// URLs"
    echo "   3. Test with the validation demo"
    echo ""
    echo "💡 Example executablePath:"
    echo "   r2://$R2_BUCKET_NAME/bun-linux-x64-v1.3.9"
else
    echo ""
    echo "❌ R2 connection failed"
    echo "💡 Check your credentials and permissions"
fi
