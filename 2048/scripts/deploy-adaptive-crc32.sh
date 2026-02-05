#!/bin/bash
# deploy-adaptive-crc32.sh
# Deploy Adaptive CRC32 Throttle - Ref 65.1.0.0-c

TAG="65.1.0.0-c"
LOCATION="CST"
TIME="19:59"

echo "🚀 Deploying Adaptive CRC32 Throttle..."
echo "🏷️  Tag: $TAG"
echo "📍 Location: $LOCATION"
echo "⏰ Time: $TIME"
echo "═".repeat(60)

# Run the adaptive CRC32 deployment
bun run -e "import('./benchdo-crc32-throttle.ts').then(m => m.deployAdaptiveCRC32())"
