#!/bin/bash

# Fantasy42-Fire22 Registry Production Startup Script
# This script provides a production-ready way to start the application

set -e  # Exit on any error

# Script directory and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-flight checks
preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check if bun is installed
    if ! command_exists bun; then
        log_error "Bun is not installed. Please install Bun first: https://bun.sh"
        exit 1
    fi

    # Check bun version
    BUN_VERSION=$(bun --version)
    log_info "Bun version: $BUN_VERSION"

    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi

    # Check if .env file exists
    if [[ ! -f ".env" ]] && [[ ! -f ".env.local" ]] && [[ ! -f ".env.production" ]]; then
        log_warn "No environment file found. Using default configuration."
    fi

    log_success "Pre-flight checks completed"
}

# Set production environment variables
set_production_env() {
    log_info "Setting production environment variables..."

    export NODE_ENV=production
    export FIRE22_ENV=enterprise
    export FIRE22_SECURITY_LEVEL=enterprise

    # Set database path if not already set
    if [[ -z "$DATABASE_URL" ]]; then
        export DATABASE_URL="file:./prod.db"
    fi

    # Set port if not already set
    if [[ -z "$PORT" ]]; then
        export PORT=3000
    fi

    log_success "Production environment configured"
}

# Function to cleanup on exit
cleanup() {
    log_info "Performing cleanup..."
    # Add any cleanup tasks here
    log_success "Cleanup completed"
}

# Function to handle signals
signal_handler() {
    log_warn "Received signal: $1"
    cleanup
    exit 1
}

# Set up signal handlers
trap 'signal_handler SIGINT' SIGINT
trap 'signal_handler SIGTERM' SIGTERM

# Function to start the application
start_application() {
    log_info "Starting Fantasy42-Fire22 Registry..."

    # Change to application directory
    cd "$APP_DIR"

    # Install dependencies if node_modules doesn't exist
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        bun install
        log_success "Dependencies installed"
    fi

    # Run database migrations/seeding if needed
    if [[ -f "scripts/seed.ts" ]]; then
        log_info "Running database seeding..."
        bun run db:seed
        log_success "Database seeding completed"
    fi

    # Start the application
    log_info "Launching application on port ${PORT:-3000}..."
    exec bun run src/index.ts
}

# Main execution
main() {
    log_info "🚀 Fantasy42-Fire22 Registry Production Startup"
    log_info "=============================================="

    # Run pre-flight checks
    preflight_checks

    # Set production environment
    set_production_env

    # Set up cleanup on exit
    trap cleanup EXIT

    # Start the application
    start_application
}

# Run main function
main "$@"
