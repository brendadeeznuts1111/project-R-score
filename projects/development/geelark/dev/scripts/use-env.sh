#!/usr/bin/env bash
# =============================================================================
# Geelark Environment Switcher
# =============================================================================
# Usage: ./scripts/use-env.sh [environment]
#
# Examples:
#   ./scripts/use-env.sh development
#   ./scripts/use-env.sh production
#   ./scripts/use-env.sh staging
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Available environments
ENVIRONMENTS=("development" "staging" "production" "test")

# Default environment
DEFAULT_ENV="development"

# Function to show usage
show_usage() {
    echo "Usage: $0 [environment]"
    echo ""
    echo "Available environments:"
    echo "  - development (default)"
    echo "  - staging"
    echo "  - production"
    echo "  - test"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo "  $0 development"
    echo ""
    exit 1
}

# Function to validate environment
validate_environment() {
    local env=$1
    for valid_env in "${ENVIRONMENTS[@]}"; do
        if [ "$env" == "$valid_env" ]; then
            return 0
        fi
    done
    return 1
}

# Function to check if .env file exists
check_env_file() {
    local env=$1
    local env_file="$ROOT_DIR/.env.$env"

    if [ ! -f "$env_file" ]; then
        echo -e "${YELLOW}Warning: $env_file not found${NC}"
        echo -e "${YELLOW}Creating from template...${NC}"

        if [ -f "$ROOT_DIR/.env.upload.template" ]; then
            cp "$ROOT_DIR/.env.upload.template" "$env_file"
            echo -e "${GREEN}✓ Created $env_file${NC}"
            echo -e "${YELLOW}Please edit $env_file with your values${NC}"
        else
            echo -e "${RED}Error: .env.upload.template not found${NC}"
            exit 1
        fi
    fi
}

# Function to display environment info
show_env_info() {
    local env=$1
    local env_file="$ROOT_DIR/.env.$env"

    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Environment: $env${NC}"
    echo -e "${BLUE}  Config File: .env.$env${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    # Show key settings
    if [ -f "$env_file" ]; then
        echo -e "${GREEN}Key Settings:${NC}"

        # Extract and display key variables
        grep -E "^(ENVIRONMENT|PORT|LOG_LEVEL|UPLOAD_PROVIDER|S3_BUCKET|R2_BUCKET)" "$env_file" | sed 's/^/  /' || true

        echo ""
    fi
}

# Function to set environment alias
create_env_alias() {
    local env=$1
    local alias_file="$ROOT_DIR/.env.upload"

    # Create symlink to active environment
    if [ -L "$alias_file" ]; then
        rm "$alias_file"
    fi

    ln -sf ".env.$env" "$alias_file"
    echo -e "${GREEN}✓ .env.upload -> .env.$env${NC}"
}

# Main script
main() {
    local env="${1:-$DEFAULT_ENV}"

    # Validate environment
    if ! validate_environment "$env"; then
        echo -e "${RED}Error: Invalid environment '$env'${NC}"
    echo ""
    show_usage
    fi

    # Check/create env file
    check_env_file "$env"

    # Show environment info
    show_env_info "$env"

    # Create symlink
    create_env_alias "$env"

    # Show next steps
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Review settings: ${GREEN}nano .env.$env${NC}"
    echo "  2. Start server: ${GREEN}bun run dev-hq/servers/dashboard-server.ts${NC}"
    echo "  3. Or with CLI: ${GREEN}bun run dev-hq/servers/dashboard-server.ts --env-file .env.$env${NC}"
    echo ""
}

# Run main
main "$@"
