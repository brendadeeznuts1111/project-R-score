#!/bin/bash
#
# build-simd.sh - Performance-optimized build script for Bun 1.3.5+
# Builds with SIMD optimizations and runs performance benchmarks
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║       QUANTUM SIMD-OPTIMIZED BUILD SYSTEM                 ║"
    echo "║              Bun 1.3.5+ Performance                       ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${CYAN}==>${NC} ${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check Bun version
check_bun_version() {
    print_step "Checking Bun version"

    if ! command -v bun &> /dev/null; then
        echo -e "${RED}Error: Bun is not installed${NC}"
        exit 1
    fi

    BUN_VERSION=$(bun --version)
    print_info "Bun version: $BUN_VERSION"

    # Check minimum version for SIMD optimizations
    MAJOR=$(echo $BUN_VERSION | cut -d. -f1)
    MINOR=$(echo $BUN_VERSION | cut -d. -f2)

    if [[ "$MAJOR" -lt 1 ]] || [[ "$MAJOR" -eq 1 && "$MINOR" -lt 3 ]]; then
        echo -e "${YELLOW}Warning: Bun 1.3.5+ recommended for SIMD optimizations${NC}"
    else
        print_success "Bun version supports SIMD optimizations"
    fi
}

# Create output directories
setup_directories() {
    print_step "Setting up directories"

    mkdir -p "$PROJECT_DIR/dist/simd-optimized"
    mkdir -p "$PROJECT_DIR/benchmarks"
    mkdir -p "$PROJECT_DIR/reports"

    print_success "Directories created"
}

# Build with SIMD optimizations
build_simd() {
    print_step "Building with SIMD optimizations"

    cd "$PROJECT_DIR"

    # Build main app with performance defines
    bun build ./src/quantum-app.ts \
        --outdir ./dist/simd-optimized \
        --minify \
        --target browser \
        --define "process.env.SIMD_ENABLED='true'" \
        --define "process.env.FAST_SPAWN='true'" \
        --define "process.env.BUILD_TYPE='simd-optimized'" \
        --define "globalThis.QUANTUM_PERFORMANCE='[\"BUFFER_SIMD\",\"FAST_SPAWN\",\"FAST_IPC\",\"PROMISE_RACE_30\"]'"

    # Build SIMD engine for Node/Bun target
    bun build ./src/quantum-simd-engine.js \
        --outdir ./dist/simd-optimized \
        --minify \
        --target node \
        --define "process.env.SIMD_ENABLED='true'"

    print_success "SIMD build complete"

    # Show build size
    if [ -d "./dist/simd-optimized" ]; then
        SIZE=$(du -sh ./dist/simd-optimized | cut -f1)
        print_info "Build size: $SIZE"
    fi
}

# Run performance benchmarks
run_benchmarks() {
    print_step "Running performance benchmarks"

    cd "$PROJECT_DIR"

    # Run SIMD engine benchmarks
    echo -e "\n${YELLOW}Buffer SIMD Benchmarks:${NC}"
    bun run src/quantum-simd-engine.js --benchmark

    # Save report
    REPORT_FILE="reports/benchmark-$(date +%Y%m%d-%H%M%S).txt"
    bun run src/quantum-simd-engine.js --benchmark > "$REPORT_FILE" 2>&1

    print_success "Benchmarks saved to $REPORT_FILE"
}

# Test buffer performance
test_buffer() {
    print_step "Testing SIMD buffer operations"

    cd "$PROJECT_DIR"
    bun run src/quantum-simd-engine.js --test-buffer

    print_success "Buffer test complete"
}

# Test spawn performance
test_spawn() {
    print_step "Testing optimized spawn"

    cd "$PROJECT_DIR"
    bun run src/quantum-simd-engine.js --test-spawn

    print_success "Spawn test complete"
}

# Start performance monitor
start_monitor() {
    print_step "Starting performance monitor"

    cd "$PROJECT_DIR"

    if [[ "$1" == "--terminal" ]]; then
        bun run src/performance-monitor.js --terminal
    else
        bun run src/performance-monitor.js
    fi
}

# Show help
show_help() {
    print_banner
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  build           Build with SIMD optimizations"
    echo "  benchmark       Run all performance benchmarks"
    echo "  test-buffer     Test SIMD buffer performance"
    echo "  test-spawn      Test optimized spawn performance"
    echo "  monitor         Start performance monitoring dashboard"
    echo "  monitor-term    Start terminal-only performance monitor"
    echo "  all             Build and run all benchmarks"
    echo "  help            Show this help"
    echo ""
    echo "Performance Features (Bun 1.3.5+):"
    echo "  - Buffer.indexOf/includes: 2x faster with SIMD"
    echo "  - Bun.spawnSync: 30x faster with close_range() fix"
    echo "  - Promise.race: 30% faster"
    echo "  - IPC: Faster worker communication"
}

# Main
print_banner
check_bun_version

case "${1:-help}" in
    build)
        setup_directories
        build_simd
        ;;
    benchmark)
        run_benchmarks
        ;;
    test-buffer)
        test_buffer
        ;;
    test-spawn)
        test_spawn
        ;;
    monitor)
        start_monitor
        ;;
    monitor-term)
        start_monitor --terminal
        ;;
    all)
        setup_directories
        build_simd
        run_benchmarks
        test_buffer
        test_spawn
        echo ""
        print_success "All operations complete!"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
