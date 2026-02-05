#!/bin/bash
# Build scripts for different deployment tiers with feature flags

set -e

echo "🚀 Foxy Proxy Build System"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DASHBOARD_DIR="$PROJECT_ROOT/packages/dashboard"

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    print_error "package.json not found. Please run from project root."
    exit 1
fi

# Clean previous builds
clean_build() {
    print_status "Cleaning previous builds..."
    rm -rf "$PROJECT_ROOT/dist"
    rm -rf "$DASHBOARD_DIR/dist"
    rm -rf "$DASHBOARD_DIR/.next"
    rm -rf "$DASHBOARD_DIR/out"
    print_status "Clean completed."
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    cd "$PROJECT_ROOT"
    bun install
    cd "$DASHBOARD_DIR"
    bun install
    print_status "Dependencies installed."
}

# Type checking
type_check() {
    print_status "Running TypeScript type check..."
    cd "$DASHBOARD_DIR"
    bun run typecheck
    print_status "Type check passed."
}

# Linting
lint_code() {
    print_status "Running ESLint..."
    cd "$DASHBOARD_DIR"
    bun run lint
    print_status "Linting passed."
}

# Run tests
run_tests() {
    print_status "Running tests..."
    cd "$DASHBOARD_DIR"
    bun test
    print_status "Tests passed."
}

# Build Free Tier (minimal features)
build_free_tier() {
    print_header "Building Free Tier"
    
    clean_build
    install_deps
    type_check
    lint_code
    run_tests
    
    print_status "Building Free Tier (minimal features)..."
    cd "$DASHBOARD_DIR"
    
    # Build with no premium features
    bun build \
        --target browser \
        --outdir ./dist/free \
        --entrypoints ./src/main.tsx \
        --minify \
        --sourcemap \
        --define:process.env.NODE_ENV=\"production\" \
        --define:process.env.TIER=\"free\"
    
    # Generate build info
    echo '{"tier": "free", "features": [], "buildTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > ./dist/free/build-info.json
    
    # Calculate bundle size
    BUNDLE_SIZE=$(du -sh ./dist/free | cut -f1)
    print_status "Free Tier build completed! Size: $BUNDLE_SIZE"
}

# Build Premium Tier
build_premium_tier() {
    print_header "Building Premium Tier"
    
    clean_build
    install_deps
    type_check
    lint_code
    run_tests
    
    print_status "Building Premium Tier with premium features..."
    cd "$DASHBOARD_DIR"
    
    # Build with premium features
    bun build \
        --target browser \
        --outdir ./dist/premium \
        --entrypoints ./src/main.tsx \
        --minify \
        --sourcemap \
        --define:process.env.NODE_ENV=\"production\" \
        --define:process.env.TIER=\"premium\" \
        --feature=PREMIUM_TIER \
        --feature=ADVANCED_ANALYTICS \
        --feature=CUSTOM_DOMAINS \
        --feature=API_ACCESS
    
    # Generate build info
    echo '{"tier": "premium", "features": ["PREMIUM_TIER", "ADVANCED_ANALYTICS", "CUSTOM_DOMAINS", "API_ACCESS"], "buildTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > ./dist/premium/build-info.json
    
    # Calculate bundle size
    BUNDLE_SIZE=$(du -sh ./dist/premium | cut -f1)
    print_status "Premium Tier build completed! Size: $BUNDLE_SIZE"
}

# Build Enterprise Tier
build_enterprise_tier() {
    print_header "Building Enterprise Tier"
    
    clean_build
    install_deps
    type_check
    lint_code
    run_tests
    
    print_status "Building Enterprise Tier with all features..."
    cd "$DASHBOARD_DIR"
    
    # Build with all features
    bun build \
        --target browser \
        --outdir ./dist/enterprise \
        --entrypoints ./src/main.tsx \
        --minify \
        --sourcemap \
        --define:process.env.NODE_ENV=\"production\" \
        --define:process.env.TIER=\"enterprise\" \
        --feature=PREMIUM_TIER \
        --feature=ENTERPRISE \
        --feature=QUANTUM_SAFE \
        --feature=SSO_INTEGRATION \
        --feature=AUDIT_LOGS \
        --feature=COMPLIANCE_MODE \
        --feature=ADVANCED_ANALYTICS \
        --feature=CUSTOM_DOMAINS \
        --feature=API_ACCESS \
        --feature=WEBHOOK_SUPPORT \
        --feature=BACKUP_AUTOMATION \
        --feature=REAL_TIME_COLLABORATION \
        --feature=ADVANCED_REPORTING
    
    # Generate build info
    echo '{"tier": "enterprise", "features": ["PREMIUM_TIER", "ENTERPRISE", "QUANTUM_SAFE", "SSO_INTEGRATION", "AUDIT_LOGS", "COMPLIANCE_MODE", "ADVANCED_ANALYTICS", "CUSTOM_DOMAINS", "API_ACCESS", "WEBHOOK_SUPPORT", "BACKUP_AUTOMATION", "REAL_TIME_COLLABORATION", "ADVANCED_REPORTING"], "buildTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > ./dist/enterprise/build-info.json
    
    # Calculate bundle size
    BUNDLE_SIZE=$(du -sh ./dist/enterprise | cut -f1)
    print_status "Enterprise Tier build completed! Size: $BUNDLE_SIZE"
}

# Build Development (with debug features)
build_development() {
    print_header "Building Development"
    
    clean_build
    install_deps
    
    print_status "Building Development with debug features..."
    cd "$DASHBOARD_DIR"
    
    # Build with debug features
    bun build \
        --target browser \
        --outdir ./dist/dev \
        --entrypoints ./src/main.tsx \
        --sourcemap \
        --define:process.env.NODE_ENV=\"development\" \
        --define:process.env.TIER=\"development\" \
        --feature=DEBUG \
        --feature=MOCK_API \
        --feature=BETA_FEATURES \
        --feature=PERFORMANCE_PROFILING
    
    # Generate build info
    echo '{"tier": "development", "features": ["DEBUG", "MOCK_API", "BETA_FEATURES", "PERFORMANCE_PROFILING"], "buildTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > ./dist/dev/build-info.json
    
    # Calculate bundle size
    BUNDLE_SIZE=$(du -sh ./dist/dev | cut -f1)
    print_status "Development build completed! Size: $BUNDLE_SIZE"
}

# Build Staging (with beta features)
build_staging() {
    print_header "Building Staging"
    
    clean_build
    install_deps
    type_check
    lint_code
    run_tests
    
    print_status "Building Staging with beta features..."
    cd "$DASHBOARD_DIR"
    
    # Build with staging features
    bun build \
        --target browser \
        --outdir ./dist/staging \
        --entrypoints ./src/main.tsx \
        --minify \
        --sourcemap \
        --define:process.env.NODE_ENV=\"staging\" \
        --define:process.env.TIER=\"staging\" \
        --feature=BETA_FEATURES \
        --feature=MOCK_API \
        --feature=PREMIUM_TIER
    
    # Generate build info
    echo '{"tier": "staging", "features": ["BETA_FEATURES", "MOCK_API", "PREMIUM_TIER"], "buildTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > ./dist/staging/build-info.json
    
    # Calculate bundle size
    BUNDLE_SIZE=$(du -sh ./dist/staging | cut -f1)
    print_status "Staging build completed! Size: $BUNDLE_SIZE"
}

# Build all tiers
build_all() {
    print_header "Building All Tiers"
    
    build_free_tier
    echo ""
    build_premium_tier
    echo ""
    build_enterprise_tier
    echo ""
    build_development
    echo ""
    build_staging
    
    print_header "Build Summary"
    echo "Free Tier:    $(du -sh ./dist/free | cut -f1)"
    echo "Premium Tier: $(du -sh ./dist/premium | cut -f1)"
    echo "Enterprise:   $(du -sh ./dist/enterprise | cut -f1)"
    echo "Development:  $(du -sh ./dist/dev | cut -f1)"
    echo "Staging:      $(du -sh ./dist/staging | cut -f1)"
}

# Compare bundle sizes
compare_sizes() {
    print_header "Bundle Size Comparison"
    
    if [ ! -d "$DASHBOARD_DIR/dist" ]; then
        print_error "No builds found. Run 'build_all' first."
        exit 1
    fi
    
    printf "%-12s %-10s %-15s %-10s\n" "Tier" "Size" "Features" "Reduction"
    printf "%-12s %-10s %-15s %-10s\n" "----" "----" "---------" "----------"
    
    if [ -d "$DASHBOARD_DIR/dist/free" ]; then
        FREE_SIZE=$(du -k "$DASHBOARD_DIR/dist/free" | cut -f1)
        printf "%-12s %-10s %-15s %-10s\n" "Free" "${FREE_SIZE}KB" "Core" "Baseline"
    fi
    
    if [ -d "$DASHBOARD_DIR/dist/premium" ]; then
        PREMIUM_SIZE=$(du -k "$DASHBOARD_DIR/dist/premium" | cut -f1)
        REDUCTION=$((($FREE_SIZE - $PREMIUM_SIZE) * 100 / $FREE_SIZE))
        printf "%-12s %-10s %-15s %-10s\n" "Premium" "${PREMIUM_SIZE}KB" "Advanced" "${REDUCTION}%"
    fi
    
    if [ -d "$DASHBOARD_DIR/dist/enterprise" ]; then
        ENTERPRISE_SIZE=$(du -k "$DASHBOARD_DIR/dist/enterprise" | cut -f1)
        REDUCTION=$((($FREE_SIZE - $ENTERPRISE_SIZE) * 100 / $FREE_SIZE))
        printf "%-12s %-10s %-15s %-10s\n" "Enterprise" "${ENTERPRISE_SIZE}KB" "Full" "${REDUCTION}%"
    fi
}

# Deploy to specific environment
deploy() {
    local tier=$1
    local environment=$2
    
    print_header "Deploying $tier to $environment"
    
    if [ ! -d "$DASHBOARD_DIR/dist/$tier" ]; then
        print_error "$tier build not found. Build it first."
        exit 1
    fi
    
    # Example deployment commands (customize as needed)
    case $environment in
        "dev")
            print_status "Deploying to development server..."
            # aws s3 sync "$DASHBOARD_DIR/dist/$tier" s3://foxy-proxy-dev/
            ;;
        "staging")
            print_status "Deploying to staging server..."
            # aws s3 sync "$DASHBOARD_DIR/dist/$tier" s3://foxy-proxy-staging/
            ;;
        "prod")
            print_status "Deploying to production..."
            # aws s3 sync "$DASHBOARD_DIR/dist/$tier" s3://foxy-proxy-prod/
            ;;
        *)
            print_error "Unknown environment: $environment"
            exit 1
            ;;
    esac
    
    print_status "Deployment completed!"
}

# Show usage
usage() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  free           Build Free Tier (minimal features)"
    echo "  premium        Build Premium Tier (advanced features)"
    echo "  enterprise     Build Enterprise Tier (all features)"
    echo "  development    Build Development (debug features)"
    echo "  staging        Build Staging (beta features)"
    echo "  all            Build all tiers"
    echo "  compare        Compare bundle sizes"
    echo "  deploy         Deploy to environment"
    echo "  clean          Clean build artifacts"
    echo ""
    echo "Flags:"
    echo "  --free         Same as: free"
    echo "  --premium      Same as: premium"
    echo "  --enterprise   Same as: enterprise"
    echo "  --development  Same as: development"
    echo "  --staging      Same as: staging"
    echo "  --all          Same as: all"
    echo "  --compare      Same as: compare"
    echo "  --clean        Same as: clean"
    echo "  --help, -h     Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 free                    # Build free tier"
    echo "  $0 premium                 # Build premium tier"
    echo "  $0 all                     # Build all tiers"
    echo "  $0 compare                 # Compare sizes"
    echo "  $0 deploy premium prod     # Deploy premium to production"
    echo "  $0 --premium               # Build premium tier (flag form)"
    echo ""
    echo "Environment Variables:"
    echo "  NODE_ENV                   # Set environment (development|staging|production)"
    echo "  AWS_PROFILE                # AWS profile for deployment"
    echo "  BUILD_NUMBER               # Build number for CI/CD"
}

# Main script logic
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    usage
    exit 0
fi

if [[ "$1" == --* ]]; then
    case "$1" in
        "--free") set -- "free" "${@:2}" ;;
        "--premium") set -- "premium" "${@:2}" ;;
        "--enterprise") set -- "enterprise" "${@:2}" ;;
        "--development") set -- "development" "${@:2}" ;;
        "--staging") set -- "staging" "${@:2}" ;;
        "--all") set -- "all" "${@:2}" ;;
        "--compare") set -- "compare" "${@:2}" ;;
        "--clean") set -- "clean" "${@:2}" ;;
    esac
fi

case "$1" in
    "free")
        build_free_tier
        ;;
    "premium")
        build_premium_tier
        ;;
    "enterprise")
        build_enterprise_tier
        ;;
    "development")
        build_development
        ;;
    "staging")
        build_staging
        ;;
    "all")
        build_all
        ;;
    "compare")
        compare_sizes
        ;;
    "deploy")
        if [ -z "$2" ] || [ -z "$3" ]; then
            print_error "Usage: $0 deploy <tier> <environment>"
            exit 1
        fi
        deploy "$2" "$3"
        ;;
    "clean")
        clean_build
        ;;
    *)
        usage
        exit 1
        ;;
esac

print_status "Script completed successfully! 🎉"
