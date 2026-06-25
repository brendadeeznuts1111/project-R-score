#!/bin/bash

# Enhanced Markdown Linting Script for Bun-native Documentation
# Usage: ./lint-docs.sh [file-or-directory]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Enhanced Markdown Linting for Bun-native Documentation${NC}"
echo "=================================================="

# Default to docs directory if no argument provided
TARGET="${1:-docs/**/*.md README.md}"

echo -e "${YELLOW}Target: ${TARGET}${NC}"
echo

# Run markdownlint with enhanced configuration
echo -e "${BLUE}Running markdownlint...${NC}"
if npx markdownlint --config .markdownlint.json "${TARGET}" 2>&1; then
    echo -e "${GREEN}✅ markdownlint passed!${NC}"
else
    echo -e "${RED}❌ markdownlint found issues${NC}"
fi

echo

# Run Vale if available
if command -v vale &> /dev/null; then
    echo -e "${BLUE}Running Vale (prose linting)...${NC}"
    if vale --config=.vale.ini "${TARGET}" 2>&1; then
        echo -e "${GREEN}✅ Vale passed!${NC}"
    else
        echo -e "${YELLOW}⚠️  Vale has suggestions${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Vale not installed - run 'npm install -g vale' to enable prose linting${NC}"
fi

echo
echo -e "${GREEN}📋 Linting complete!${NC}"
echo -e "${BLUE}💡 Tips:${NC}"
echo "  - Use 'npx markdownlint --fix' to auto-fix some issues"
echo "  - Check .markdownlint.json for rule configuration"
echo "  - Vale helps with technical writing tone and precision"
