#!/bin/bash
# Setup Cloudflare R2 Storage

echo "📦 Setting up Cloudflare R2..."

# Create bucket
wrangler r2 bucket create fire22-dashboard-assets

# Configure CORS
wrangler r2 bucket cors put fire22-dashboard-assets --cors '[
  {
    "AllowedOrigins": ["https://dashboard.fire22.dev"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]'

echo "✅ R2 setup complete!"
