#!/bin/bash
# Helper script to run wrangler commands with token from .env
# Usage: ./scripts/vectorize/wrangler-with-env.sh <wrangler-command>
# Example: ./scripts/vectorize/wrangler-with-env.sh "vectorize list"

if [ ! -f .env ]; then
  echo "❌ .env file not found"
  exit 1
fi

# Load CLOUDFLARE_API_TOKEN from .env
export $(grep CLOUDFLARE_API_TOKEN .env | xargs)

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN not found in .env"
  exit 1
fi

# Run wrangler command with bunx
echo "✅ Using API token from .env"
bunx wrangler "$@"
