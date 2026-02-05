#!/bin/bash
# Fix Registry Environment Variables
# This script ensures proper registry configuration for Bun

echo "🔧 Fixing Registry Environment Variables..."

# Unset problematic environment variables
unset npm_config_registry
unset BUN_REGISTRY

# Export clean environment variables
export npm_config_registry=""
export BUN_REGISTRY=""

echo "✅ Registry environment variables fixed"
echo "🔍 Current registry configuration:"
echo "   npm_config_registry: ${npm_config_registry:-'<not set>'}"
echo "   BUN_REGISTRY: ${BUN_REGISTRY:-'<not set>'}"
echo ""
echo "📦 Testing registry connection..."
bun install --dry-run > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Registry connection successful"
else
    echo "❌ Registry connection failed"
fi
