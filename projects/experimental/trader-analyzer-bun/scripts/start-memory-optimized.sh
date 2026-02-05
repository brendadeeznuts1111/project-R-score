#!/usr/bin/env bash

# Memory-optimized Bun server startup script
# Increases Node.js heap limits to prevent out-of-memory errors

# Set Node.js memory limits (4GB heap, 8GB RSS)
export NODE_OPTIONS="--max-old-space-size=4096 --max-new-space-size=1024"

# Enable garbage collection hints
export NODE_OPTIONS="$NODE_OPTIONS --optimize-for-size --gc-interval=100"

echo "🚀 Starting NEXUS Trading Analyzer with memory optimization..."
echo "📊 Memory limits: 4GB heap, 1GB new space"
echo "🗑️  GC interval: 100ms"
echo ""

# Start the server with HMR
exec bun --hot run src/index.ts "$@"