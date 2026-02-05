#!/bin/bash
# Team-specific commands using bun --filter
# Provides convenient shortcuts for team workflows

set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Sports Correlation Team (Alex Chen)
sports-install() {
    echo -e "${BLUE}📦 Installing dependencies for Sports Correlation team...${NC}"
    bun install --filter '@graph/layer4' --filter '@graph/layer3'
}

sports-dev() {
    echo -e "${BLUE}🚀 Starting dev servers for Sports Correlation team...${NC}"
    bun --filter '@graph/layer4' dev &
    bun --filter '@graph/layer3' dev &
    wait
}

sports-test() {
    echo -e "${BLUE}🧪 Running tests for Sports Correlation team...${NC}"
    bun --filter '@graph/layer4' test
    bun --filter '@graph/layer3' test
}

sports-bench() {
    echo -e "${BLUE}📊 Running benchmarks for Sports Correlation team...${NC}"
    bun --filter '@bench/layer4' bench
    bun --filter '@bench/layer3' bench
}

# Market Analytics Team (Sarah Kumar)
markets-install() {
    echo -e "${BLUE}📦 Installing dependencies for Market Analytics team...${NC}"
    bun install --filter '@graph/layer2' --filter '@graph/layer1'
}

markets-dev() {
    echo -e "${BLUE}🚀 Starting dev servers for Market Analytics team...${NC}"
    bun --filter '@graph/layer2' dev &
    bun --filter '@graph/layer1' dev &
    wait
}

markets-test() {
    echo -e "${BLUE}🧪 Running tests for Market Analytics team...${NC}"
    bun --filter '@graph/layer2' test
    bun --filter '@graph/layer1' test
}

markets-bench() {
    echo -e "${BLUE}📊 Running benchmarks for Market Analytics team...${NC}"
    bun --filter '@bench/layer2' bench
    bun --filter '@bench/layer1' bench
}

# Platform & Tools Team (Mike Rodriguez)
platform-install() {
    echo -e "${BLUE}📦 Installing dependencies for Platform & Tools team...${NC}"
    bun install --filter '@graph/algorithms' --filter '@graph/storage' --filter '@graph/streaming' --filter '@graph/utils' --filter '@bench/*'
}

platform-dev() {
    echo -e "${BLUE}🚀 Starting dev servers for Platform & Tools team...${NC}"
    bun --filter '@graph/algorithms' dev &
    bun --filter '@graph/storage' dev &
    bun --filter '@graph/streaming' dev &
    bun --filter '@graph/utils' dev &
    wait
}

platform-test() {
    echo -e "${BLUE}🧪 Running tests for Platform & Tools team...${NC}"
    bun --filter '@graph/algorithms' test
    bun --filter '@graph/storage' test
    bun --filter '@graph/streaming' test
    bun --filter '@graph/utils' test
}

platform-bench() {
    echo -e "${BLUE}📊 Running all benchmarks...${NC}"
    bun --filter '@bench/*' bench
}

# All packages
all-install() {
    echo -e "${BLUE}📦 Installing dependencies for all packages...${NC}"
    bun install --filter '*'
}

all-dev() {
    echo -e "${BLUE}🚀 Starting dev servers for all packages...${NC}"
    bun --filter '*' dev
}

all-test() {
    echo -e "${BLUE}🧪 Running tests for all packages...${NC}"
    bun --filter '*' test
}

all-bench() {
    echo -e "${BLUE}📊 Running benchmarks for all packages...${NC}"
    bun --filter '@bench/*' bench
}

# Show help
show-help() {
    echo -e "${GREEN}Bun --filter Team Commands${NC}"
    echo ""
    echo "Sports Correlation Team:"
    echo "  sports-install   - Install dependencies"
    echo "  sports-dev      - Start dev servers"
    echo "  sports-test     - Run tests"
    echo "  sports-bench    - Run benchmarks"
    echo ""
    echo "Market Analytics Team:"
    echo "  markets-install - Install dependencies"
    echo "  markets-dev     - Start dev servers"
    echo "  markets-test    - Run tests"
    echo "  markets-bench   - Run benchmarks"
    echo ""
    echo "Platform & Tools Team:"
    echo "  platform-install - Install dependencies"
    echo "  platform-dev     - Start dev servers"
    echo "  platform-test    - Run tests"
    echo "  platform-bench   - Run all benchmarks"
    echo ""
    echo "All Packages:"
    echo "  all-install     - Install dependencies for all"
    echo "  all-dev         - Start all dev servers"
    echo "  all-test        - Run all tests"
    echo "  all-bench       - Run all benchmarks"
}

# Main command dispatcher
case "${1:-help}" in
    sports-install) sports-install ;;
    sports-dev) sports-dev ;;
    sports-test) sports-test ;;
    sports-bench) sports-bench ;;
    markets-install) markets-install ;;
    markets-dev) markets-dev ;;
    markets-test) markets-test ;;
    markets-bench) markets-bench ;;
    platform-install) platform-install ;;
    platform-dev) platform-dev ;;
    platform-test) platform-test ;;
    platform-bench) platform-bench ;;
    all-install) all-install ;;
    all-dev) all-dev ;;
    all-test) all-test ;;
    all-bench) all-bench ;;
    help|*) show-help ;;
esac
