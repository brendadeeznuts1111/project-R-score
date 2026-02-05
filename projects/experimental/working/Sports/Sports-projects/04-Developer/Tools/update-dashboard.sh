#!/bin/bash
# Update Developer Dashboard
# Usage: ./update-dashboard.sh

echo "🔄 Updating Developer Dashboard..."

# Run from project root (assuming we're in vault)
cd "$(dirname "$0")/../../.." || exit 1

if [ -f "scripts/create-developer-dashboard.ts" ]; then
  bun scripts/create-developer-dashboard.ts
  echo "✅ Dashboard updated"
else
  echo "⚠️  Dashboard script not found at scripts/create-developer-dashboard.ts"
fi

