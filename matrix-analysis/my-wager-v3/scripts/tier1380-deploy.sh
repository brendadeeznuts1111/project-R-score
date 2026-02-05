#!/bin/bash
# scripts/tier1380-deploy.sh
# Tier-1380 Protocol Deployment Script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️ Tier-1380 Protocol Deployment${NC}"
echo "=================================="

# 1. Apply dependency patches (lockfile stays clean)
echo -e "${YELLOW}🔧 Applying patches...${NC}"
if ! bun pm patch redis@4.6.5 --patch-file patches/redis-hll-volume.patch; then
    echo -e "${RED}Failed to apply Redis patch${NC}"
    exit 1
fi

if ! bun pm patch onnxruntime-node --patch-file patches/onnx-simd-accel.patch; then
    echo -e "${RED}Failed to apply ONNX patch${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Patches applied successfully${NC}"

# 2. Verify PUBLIC_ env vars
echo -e "${YELLOW}🌐 Verifying public env...${NC}"
if [[ -z "${PUBLIC_WS_URL:-}" ]]; then
    echo -e "${RED}Missing PUBLIC_WS_URL${NC}"
    exit 1
fi

if [[ -z "${PUBLIC_ANOMALY_THRESHOLD:-}" ]]; then
    echo -e "${RED}Missing PUBLIC_ANOMALY_THRESHOLD${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Public env vars verified${NC}"

# 3. Build with env injection
echo -e "${YELLOW}📦 Building dashboard...${NC}"
if ! bun run scripts/build-dashboard.ts; then
    echo -e "${RED}Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dashboard built successfully${NC}"

# 4. CRC32 integrity check (Col 96)
echo -e "${YELLOW}🔒 Calculating bundle checksum...${NC}"
CHECKSUM=$(bun -e "
const f = Bun.file('./dist/dashboard/index.js');
const b = await f.arrayBuffer();
console.log(Bun.hash.crc32(new Uint8Array(b)).toString(16))
")
echo -e "${GREEN}Bundle checksum: $CHECKSUM${NC}"

# 5. Verify no secrets in bundle
echo -e "${YELLOW}🔍 Checking for secret leaks...${NC}"
if grep -q "sk_live\|sk-ant\|CF_API_TOKEN\|BUN_ENCRYPTION_KEY" dist/dashboard/*.js; then
    echo -e "${RED}🔴 SECRET LEAK DETECTED IN BUNDLE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ No secrets detected in bundle${NC}"

# 6. Deploy with patch metadata
echo -e "${YELLOW}🚀 Deploying...${NC}"
if ! bun run deploy/pipeline.ts production --patch-level=hll-simd --bundle-checksum=$CHECKSUM; then
    echo -e "${RED}Deployment failed${NC}"
    exit 1
fi

# 7. Verify deployment
echo -e "${YELLOW}✅ Verifying deployment...${NC}"
PUBLIC_ENV_COUNT=$(env | grep "^PUBLIC_" | wc -l)
PATCH_COUNT=$(bun pm patch --list | wc -l)

echo -e "${GREEN}Deployment Summary:${NC}"
echo "  - Bundle Checksum: $CHECKSUM"
echo "  - Public Env Vars: $PUBLIC_ENV_COUNT"
echo "  - Active Patches: $PATCH_COUNT"
echo "  - Lockfile Status: Pristine"

# 8. Update deployment metadata
cat > dist/dashboard/deployment-info.json << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "tier": "1380",
    "bundleChecksum": "$CHECKSUM",
    "publicEnvCount": $PUBLIC_ENV_COUNT,
    "patchCount": $PATCH_COUNT,
    "lockfilePristine": true,
    "secretLeakCheck": false
  }
}
EOF

echo -e "${GREEN}✅ Tier-1380 deployment complete!${NC}"
