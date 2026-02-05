#!/bin/bash
#
# start-quantum.sh - Start Quantum Terminal Dashboard
# Version: 2.0.0-rc.1
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default configuration
HTTP_PORT="${HTTP_PORT:-3000}"
WS_PORT="${WS_PORT:-3001}"
NODE_ENV="${NODE_ENV:-development}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# Functions
print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║       QUANTUM TERMINAL DASHBOARD v2.0.0-rc.1              ║"
    echo "║                 Production System                         ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_bun() {
    if ! command -v bun &> /dev/null; then
        print_error "Bun is not installed. Please install Bun first:"
        echo "  curl -fsSL https://bun.sh/install | bash"
        exit 1
    fi

    BUN_VERSION=$(bun --version)
    print_info "Bun version: $BUN_VERSION"

    # Check for minimum version (1.3.0 for Terminal support)
    if [[ "$BUN_VERSION" < "1.3.0" ]]; then
        print_warn "Bun 1.3.0+ recommended for Terminal support"
    fi
}

check_platform() {
    PLATFORM=$(uname -s)
    print_info "Platform: $PLATFORM"

    if [[ "$PLATFORM" == "MINGW"* ]] || [[ "$PLATFORM" == "CYGWIN"* ]] || [[ "$PLATFORM" == "MSYS"* ]]; then
        print_warn "Windows detected - PTY support may be limited"
        export TERMINAL_ENABLED=false
    fi
}

install_deps() {
    print_info "Installing dependencies..."
    cd "$PROJECT_DIR"
    bun install
    print_success "Dependencies installed"
}

start_dev() {
    print_info "Starting development server..."
    print_info "HTTP server: https://api.example.com:$HTTP_PORT"
    print_info "WebSocket: ws://localhost:$WS_PORT/terminal"
    echo ""

    cd "$PROJECT_DIR"

    NODE_ENV=development \
    HTTP_PORT="$HTTP_PORT" \
    WS_PORT="$WS_PORT" \
    LOG_LEVEL="$LOG_LEVEL" \
    bun run src/quantum-production-system.js start
}

start_prod() {
    print_info "Starting production server..."
    print_info "HTTP server: https://api.example.com:$HTTP_PORT"
    print_info "WebSocket: ws://localhost:$WS_PORT/terminal"
    echo ""

    cd "$PROJECT_DIR"

    NODE_ENV=production \
    HTTP_PORT="$HTTP_PORT" \
    WS_PORT="$WS_PORT" \
    LOG_LEVEL="$LOG_LEVEL" \
    bun run src/quantum-production-system.js start
}

start_monitor() {
    print_info "Starting monitoring dashboard..."
    echo ""

    cd "$PROJECT_DIR"
    bun run src/monitoring-dashboard.js "$@"
}

start_terminal() {
    TERM_TYPE="${1:-ticker}"
    print_info "Starting terminal: $TERM_TYPE"
    echo ""

    cd "$PROJECT_DIR"
    bun run src/quantum-production-system.js terminal "$TERM_TYPE"
}

run_build() {
    PROFILE="${1:-universal}"
    print_info "Building profile: $PROFILE"

    cd "$PROJECT_DIR"
    bun run src/quantum-production-system.js build "$PROFILE"

    print_success "Build complete: dist/$PROFILE"
}

run_build_all() {
    print_info "Building all profiles..."

    cd "$PROJECT_DIR"
    bun run src/quantum-production-system.js build-all

    print_success "All builds complete"
}

show_help() {
    print_banner
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  dev              Start development server"
    echo "  prod             Start production server"
    echo "  monitor          Start monitoring dashboard"
    echo "  terminal [type]  Start terminal (ticker/monitor/network)"
    echo "  build [profile]  Build specific profile (universal/terminal-only/lightweight/development)"
    echo "  build-all        Build all profiles"
    echo "  health           Check system health"
    echo "  metrics          Show system metrics"
    echo "  install          Install dependencies"
    echo "  help             Show this help"
    echo ""
    echo "Environment variables:"
    echo "  HTTP_PORT        HTTP server port (default: 3000)"
    echo "  WS_PORT          WebSocket server port (default: 3001)"
    echo "  NODE_ENV         Environment (development/production)"
    echo "  LOG_LEVEL        Log level (debug/info/warn/error)"
    echo ""
    echo "Examples:"
    echo "  $0 dev                    # Start development server"
    echo "  $0 prod                   # Start production server"
    echo "  $0 terminal ticker        # Start financial ticker terminal"
    echo "  $0 build universal        # Build universal profile"
    echo "  HTTP_PORT=8080 $0 dev     # Start dev server on port 8080"
}

show_health() {
    cd "$PROJECT_DIR"
    bun run src/quantum-production-system.js health
}

show_metrics() {
    cd "$PROJECT_DIR"
    bun run src/quantum-production-system.js metrics
}

# Main
print_banner

case "${1:-help}" in
    dev)
        check_bun
        check_platform
        start_dev
        ;;
    prod)
        check_bun
        check_platform
        start_prod
        ;;
    monitor)
        check_bun
        shift
        start_monitor "$@"
        ;;
    terminal)
        check_bun
        check_platform
        start_terminal "${2:-ticker}"
        ;;
    build)
        check_bun
        run_build "${2:-universal}"
        ;;
    build-all)
        check_bun
        run_build_all
        ;;
    health)
        check_bun
        show_health
        ;;
    metrics)
        check_bun
        show_metrics
        ;;
    install)
        check_bun
        install_deps
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
