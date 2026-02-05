#!/bin/bash
# verify-bun-constants.sh
# 
# Verification script to ensure no hardcoded Bun URLs remain in executable code
# 
# Usage:
#   ./scripts/verify-bun-constants.sh [--strict]
#
# Options:
#   --strict    Exit with error code if any hardcoded URLs found (for CI/CD)

set -euo pipefail

STRICT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --strict)
            STRICT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Verifying Bun URL constants usage..."

# Find all hardcoded Bun URLs in executable code (exclude JSDoc comments and constants file)
# Exclude:
# - Lines starting with * (JSDoc comments)
# - Lines containing BUN_DOCS_URLS (already using constants)
# - Lines with @see tags (JSDoc links)
# - The constants file itself (where URLs are defined)

VIOLATIONS=$(rg "https://bun\.com/(docs|reference)" src/ --type ts --type tsx 2>/dev/null | \
    rg -v "^\s*\*" | \
    rg -v "BUN_DOCS_URLS" | \
    rg -v "@see" | \
    rg -v "rss-constants\.ts" | \
    rg -v "^\s*[A-Z_]+:\s*\"https://" || true)

if [[ -z "$VIOLATIONS" ]]; then
    echo -e "${GREEN}✅ No hardcoded Bun URLs found in executable code${NC}"
    exit 0
fi

# Count violations
VIOLATION_COUNT=$(echo "$VIOLATIONS" | wc -l | tr -d ' ')
echo -e "${RED}❌ Found $VIOLATION_COUNT hardcoded Bun URL(s) in executable code:${NC}"
echo ""
echo "$VIOLATIONS" | while IFS= read -r line; do
    echo -e "  ${YELLOW}$line${NC}"
done

echo ""
echo -e "${YELLOW}💡 Tip: Use BUN_DOCS_URLS constants from src/utils/rss-constants.ts${NC}"
echo -e "${YELLOW}💡 Run: ./scripts/migrate-bun-urls-to-constants.sh --file <file>${NC}"

if [[ "$STRICT" == "true" ]]; then
    echo ""
    echo -e "${RED}❌ Strict mode: Exiting with error code${NC}"
    exit 1
fi

exit 0
