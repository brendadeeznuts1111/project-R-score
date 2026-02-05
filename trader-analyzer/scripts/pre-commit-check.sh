#!/bin/bash
# pre-commit-check.sh
# 
# Pre-commit hook to prevent new hardcoded Bun URLs
# 
# Usage:
#   ./scripts/pre-commit-check.sh
#   Or install as git hook: ln -s ../../scripts/pre-commit-check.sh .git/hooks/pre-commit

set -euo pipefail

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Checking for new hardcoded Bun URLs in staged files..."

# Get list of staged TypeScript files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

if [[ -z "$STAGED_FILES" ]]; then
    echo -e "${GREEN}✅ No TypeScript files staged${NC}"
    exit 0
fi

# Check each staged file for hardcoded Bun URLs
VIOLATIONS=""
for file in $STAGED_FILES; do
    # Skip the constants file itself
    if [[ "$file" == *"rss-constants.ts" ]]; then
        continue
    fi
    
    # Check if file contains hardcoded Bun URLs (excluding JSDoc)
    if git diff --cached "$file" 2>/dev/null | rg "https://bun\.com/(docs|reference)" | \
        rg -v "^\+\s*\*" | \
        rg -v "BUN_DOCS_URLS" | \
        rg -v "@see" > /dev/null; then
        VIOLATIONS="${VIOLATIONS}${file}\n"
    fi
done

if [[ -z "$VIOLATIONS" ]]; then
    echo -e "${GREEN}✅ No new hardcoded Bun URLs found${NC}"
    exit 0
fi

echo -e "${RED}❌ Found hardcoded Bun URLs in staged files:${NC}"
echo -e "$VIOLATIONS"
echo ""
echo -e "${YELLOW}💡 Please use BUN_DOCS_URLS constants from src/utils/rss-constants.ts${NC}"
echo -e "${YELLOW}💡 Run: ./scripts/migrate-bun-urls-to-constants.sh --file <file>${NC}"
echo ""
echo -e "${YELLOW}To bypass this check (not recommended), use: git commit --no-verify${NC}"

exit 1
