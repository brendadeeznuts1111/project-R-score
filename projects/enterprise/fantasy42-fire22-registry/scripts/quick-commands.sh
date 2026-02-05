#!/bin/bash

# SportsBet Quick Commands
# Easy access to global package management

# Load aliases
source ~/.bun/aliases.sh 2>/dev/null

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}          SportsBet Global Package Quick Commands${NC}"
echo -e "${BLUE}============================================================${NC}"
echo

# Function to run command with nice output
run_command() {
    local desc=$1
    local cmd=$2
    
    echo -e "${YELLOW}→ $desc${NC}"
    eval $cmd
    echo
}

case "$1" in
    cache)
        run_command "Cache Status" "du -sh ~/.bun/install/cache && du -sh ~/.bun/bunx/cache"
        ;;
    list)
        run_command "Global Packages" "bun pm ls --global"
        ;;
    audit)
        run_command "Security Audit" "bun audit --global --audit-level=high"
        ;;
    perf)
        echo -e "${GREEN}Performance Test:${NC}"
        echo -n "BunX execution: "
        START=$(date +%s%N)
        bunx --version > /dev/null 2>&1
        END=$(date +%s%N)
        echo "$((($END - $START) / 1000000))ms"
        
        echo -n "Package listing: "
        START=$(date +%s%N)
        bun pm ls --global > /dev/null 2>&1
        END=$(date +%s%N)
        echo "$((($END - $START) / 1000000))ms"
        
        echo -n "Cache hit rate: "
        CACHE_SIZE=$(du -sb ~/.bun/install/cache 2>/dev/null | cut -f1)
        if [ "$CACHE_SIZE" -gt 0 ]; then
            echo "Active ($(du -sh ~/.bun/install/cache 2>/dev/null | cut -f1))"
        else
            echo "Empty"
        fi
        ;;
    install)
        if [ -z "$2" ]; then
            echo -e "${RED}Usage: $0 install <package-name>${NC}"
            exit 1
        fi
        run_command "Installing @sportsbet-registry/$2" "bun add --global @sportsbet-registry/$2"
        ;;
    run)
        if [ -z "$2" ]; then
            echo -e "${RED}Usage: $0 run <package-name>${NC}"
            exit 1
        fi
        run_command "Running @sportsbet-registry/$2" "bunx @sportsbet-registry/$2 ${@:3}"
        ;;
    clean)
        run_command "Cleaning caches" "rm -rf ~/.bun/install/cache/* && rm -rf ~/.bun/bunx/cache/* && echo 'Caches cleared!'"
        ;;
    help|*)
        echo -e "${GREEN}Available commands:${NC}"
        echo "  cache    - Show cache sizes"
        echo "  list     - List global packages"
        echo "  audit    - Run security audit"
        echo "  perf     - Test performance"
        echo "  install  - Install SportsBet package"
        echo "  run      - Run SportsBet package"
        echo "  clean    - Clear all caches"
        echo
        echo -e "${GREEN}Examples:${NC}"
        echo "  $0 cache"
        echo "  $0 install cli"
        echo "  $0 run betting-engine --help"
        ;;
esac

echo -e "${BLUE}============================================================${NC}"