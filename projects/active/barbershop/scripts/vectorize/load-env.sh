#!/bin/bash
# Helper script to load .env and run wrangler commands
# Usage: source scripts/vectorize/load-env.sh && bunx wrangler <command>

if [ -f .env ]; then
  export $(grep -v '^#' .env | grep CLOUDFLARE_API_TOKEN | xargs)
  echo "✅ Loaded CLOUDFLARE_API_TOKEN from .env"
else
  echo "❌ .env file not found"
fi
