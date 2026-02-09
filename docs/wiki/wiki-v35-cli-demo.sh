#!/bin/bash
# Wiki-Generator-CLI Integration Demo - v3.5 JuniorRunner Fusion
# Complete CLI workflow demonstration

echo "🚀 Wiki-Generator-CLI Integration Demo v3.5"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}Step 1: Generate Wiki Output${NC}"
echo "Running wiki-generator-cli to create comprehensive wiki documentation..."
bun run lib/wiki/wiki-generator-cli.ts --format markdown --workspace factory-wager --output wiki-demo-output.md
echo ""

echo -e "${CYAN}Step 2: Run Wiki Profiler${NC}"
echo "Analyzing generated wiki with v3.5 Wiki Profiler..."
bun run utils/wiki-profiler.ts wiki-demo-output.md
echo ""

echo -e "${CYAN}Step 3: Run JuniorRunner with Wiki Fusion${NC}"
echo "Running enhanced JuniorRunner analysis with wiki mode..."
bun run utils/junior-runner.ts wiki-demo-output.md --wiki-mode --lsp-safe
echo ""

echo -e "${CYAN}Step 4: Performance Benchmark${NC}"
echo "Running comprehensive v3.5 integration test..."
bun run test-wiki-v35.ts
echo ""

echo -e "${CYAN}Step 5: Start Dashboard Server${NC}"
echo "Starting interactive dashboard for live wiki profiling..."
echo -e "${YELLOW}Dashboard will be available at: http://localhost:3001/dashboard${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""
bun run utils/wiki-dashboard-server.ts
