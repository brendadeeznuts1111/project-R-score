#!/bin/bash
# Setup script for Vectorize indexes
# Run this before indexing any vectors

set -e

echo "🔧 Setting up Vectorize indexes..."

# Create barbers index
echo "Creating barbershop-barbers-index..."
npx wrangler vectorize create barbershop-barbers-index \
  --dimensions=768 \
  --metric=cosine

# Create metadata indexes for barbers (BEFORE inserting vectors!)
echo "Creating metadata indexes for barbers..."
npx wrangler vectorize create-metadata-index barbershop-barbers-index \
  --property-name=barber_id \
  --type=string

npx wrangler vectorize create-metadata-index barbershop-barbers-index \
  --property-name=status \
  --type=string

npx wrangler vectorize create-metadata-index barbershop-barbers-index \
  --property-name=skill_type \
  --type=string

# Create docs index
echo "Creating barbershop-docs-index..."
npx wrangler vectorize create barbershop-docs-index \
  --dimensions=768 \
  --metric=cosine

# Create metadata indexes for docs
echo "Creating metadata indexes for docs..."
npx wrangler vectorize create-metadata-index barbershop-docs-index \
  --property-name=doc_id \
  --type=string

npx wrangler vectorize create-metadata-index barbershop-docs-index \
  --property-name=section \
  --type=string

npx wrangler vectorize create-metadata-index barbershop-docs-index \
  --property-name=topic \
  --type=string

# Create customers index
echo "Creating barbershop-customers-index..."
bunx wrangler vectorize create barbershop-customers-index \
  --dimensions=768 \
  --metric=cosine

# Create metadata indexes for customers (BEFORE inserting vectors!)
echo "Creating metadata indexes for customers..."
bunx wrangler vectorize create-metadata-index barbershop-customers-index \
  --property-name=customer_id \
  --type=string

bunx wrangler vectorize create-metadata-index barbershop-customers-index \
  --property-name=tier \
  --type=string

bunx wrangler vectorize create-metadata-index barbershop-customers-index \
  --property-name=preferredBarber \
  --type=string

bunx wrangler vectorize create-metadata-index barbershop-customers-index \
  --property-name=homeShop \
  --type=string

echo "✅ Vectorize indexes created successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy the worker: bunx wrangler deploy"
echo "2. Run index-barbers.ts to index existing barbers"
echo "3. Run index-customers.ts to index existing customers"
echo "4. Run index-documents.ts to index knowledge base"
