#!/bin/bash
# Setup script for customers Vectorize index
# Make sure your Cloudflare account_id is configured in wrangler.jsonc or set CLOUDFLARE_ACCOUNT_ID env var

set -e

echo "🚀 Setting up customers Vectorize index..."

# Create customers index
echo "📦 Creating barbershop-customers-index..."
bunx wrangler vectorize create barbershop-customers-index \
  --dimensions=768 \
  --metric=cosine

# Create metadata indexes
echo "📋 Creating metadata indexes..."

echo "  - customer_id index..."
bunx wrangler vectorize create-metadata-index barbershop-customers-index \
  --property-name=customer_id \
  --type=string

echo "  - tier index..."
bunx wrangler vectorize create-metadata-index barbershop-customers-index \
  --property-name=tier \
  --type=string

echo "  - preferredBarber index..."
bunx wrangler vectorize create-metadata-index barbershop-customers-index \
  --property-name=preferredBarber \
  --type=string

echo "  - homeShop index..."
bunx wrangler vectorize create-metadata-index barbershop-customers-index \
  --property-name=homeShop \
  --type=string

echo "✅ Customers Vectorize index setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure VECTORIZE_ENABLED=true in your environment"
echo "2. Set VECTORIZE_WORKER_URL to your deployed worker URL"
echo "3. Run: bun run scripts/vectorize/index-barbers.ts (if not already done)"
echo "4. Customers will be automatically indexed when registered/updated"
