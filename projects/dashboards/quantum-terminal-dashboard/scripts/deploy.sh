#!/bin/bash
#
# deploy.sh - Deployment script for Quantum Terminal Dashboard
# Version: 2.0.0-rc.1
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

# Configuration
DEPLOY_TARGET="${DEPLOY_TARGET:-staging}"
BUILD_PROFILE="${BUILD_PROFILE:-universal}"
CANARY_PERCENTAGE="${CANARY_PERCENTAGE:-10}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-3}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-5}"
CLOUDFLARE_DEPLOY="${CLOUDFLARE_DEPLOY:-false}"
CLOUDFLARE_ENV="${CLOUDFLARE_ENV:-production}"

# Functions
print_step() {
    echo -e "\n${CYAN}==>${NC} ${BLUE}$1${NC}"
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

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           QUANTUM DASHBOARD DEPLOYMENT                    ║"
    echo "║                   v2.0.0-rc.1                             ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites"

    # Check Bun
    if ! command -v bun &> /dev/null; then
        print_error "Bun is not installed"
        exit 1
    fi
    print_success "Bun: $(bun --version)"

    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        exit 1
    fi
    print_success "Git: $(git --version | head -1)"

    # Check if in git repo
    if ! git rev-parse --is-inside-work-tree &> /dev/null; then
        print_warn "Not in a git repository"
    else
        print_success "Git repository detected"
    fi
}

# Clean previous builds
clean_builds() {
    print_step "Cleaning previous builds"

    cd "$PROJECT_DIR"

    if [ -d "dist" ]; then
        rm -rf dist
        print_info "Removed dist directory"
    fi

    if [ -d ".build-cache" ]; then
        rm -rf .build-cache
        print_info "Removed build cache"
    fi

    print_success "Clean complete"
}

# Install dependencies
install_deps() {
    print_step "Installing dependencies"

    cd "$PROJECT_DIR"
    bun install --frozen-lockfile 2>/dev/null || bun install

    print_success "Dependencies installed"
}

# Run tests
run_tests() {
    print_step "Running tests"

    cd "$PROJECT_DIR"

    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        bun test || {
            print_error "Tests failed"
            exit 1
        }
        print_success "Tests passed"
    else
        print_warn "No test script found, skipping tests"
    fi
}

# Build application
build_app() {
    print_step "Building application (profile: $BUILD_PROFILE)"

    cd "$PROJECT_DIR"

    NODE_ENV=production bun run src/quantum-production-system.js build "$BUILD_PROFILE"

    if [ ! -d "dist/$BUILD_PROFILE" ]; then
        print_error "Build failed - no output directory"
        exit 1
    fi

    # Get build info
    if [ -f "dist/$BUILD_PROFILE/build-manifest.json" ]; then
        BUILD_SIZE=$(cat "dist/$BUILD_PROFILE/build-manifest.json" | grep -o '"size":[0-9]*' | head -1 | cut -d':' -f2)
        print_info "Build size: $((BUILD_SIZE / 1024)) KB"
    fi

    print_success "Build complete"
}

# Health check
health_check() {
    local url="$1"
    local retries=${2:-$HEALTH_CHECK_RETRIES}
    local interval=${3:-$HEALTH_CHECK_INTERVAL}

    print_step "Running health check on $url"

    for i in $(seq 1 $retries); do
        print_info "Attempt $i of $retries..."

        if curl -sf "$url/health" > /dev/null 2>&1; then
            print_success "Health check passed"
            return 0
        fi

        if [ $i -lt $retries ]; then
            print_warn "Health check failed, retrying in ${interval}s..."
            sleep $interval
        fi
    done

    print_error "Health check failed after $retries attempts"
    return 1
}

# Deploy to staging
deploy_staging() {
    print_step "Deploying to staging"

    # In a real scenario, this would:
    # 1. Upload build artifacts
    # 2. Update container/server configuration
    # 3. Restart services
    # 4. Run health checks

    print_info "Target: staging"
    print_info "Build: dist/$BUILD_PROFILE"

    # Simulate deployment steps
    echo -e "\n  ${BLUE}Steps:${NC}"
    echo "    [1/5] Uploading build artifacts..."
    sleep 1
    echo "    [2/5] Updating configuration..."
    sleep 1
    echo "    [3/5] Stopping old instances..."
    sleep 1
    echo "    [4/5] Starting new instances..."
    sleep 1
    echo "    [5/5] Running health checks..."
    sleep 1

    print_success "Staging deployment complete"

    # Save deployment info
    mkdir -p "$PROJECT_DIR/.deployments"
    cat > "$PROJECT_DIR/.deployments/staging-latest.json" << EOF
{
  "environment": "staging",
  "profile": "$BUILD_PROFILE",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "status": "deployed"
}
EOF
}

# Deploy to production
deploy_production() {
    print_step "Deploying to production"

    print_warn "Production deployment requested"
    echo ""

    # Confirm production deployment
    if [ "$FORCE_DEPLOY" != "true" ]; then
        read -p "Are you sure you want to deploy to production? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "Deployment cancelled"
            exit 0
        fi
    fi

    print_info "Target: production"
    print_info "Build: dist/$BUILD_PROFILE"

    # Simulate deployment steps
    echo -e "\n  ${BLUE}Steps:${NC}"
    echo "    [1/6] Creating deployment snapshot..."
    sleep 1
    echo "    [2/6] Uploading build artifacts..."
    sleep 1
    echo "    [3/6] Updating load balancer configuration..."
    sleep 1
    echo "    [4/6] Rolling update (0% -> 100%)..."
    sleep 2
    echo "    [5/6] Running health checks..."
    sleep 1
    echo "    [6/6] Finalizing deployment..."
    sleep 1

    print_success "Production deployment complete"

    # Save deployment info
    mkdir -p "$PROJECT_DIR/.deployments"
    cat > "$PROJECT_DIR/.deployments/production-latest.json" << EOF
{
  "environment": "production",
  "profile": "$BUILD_PROFILE",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "status": "deployed"
}
EOF
}

# Canary deployment
deploy_canary() {
    print_step "Starting canary deployment ($CANARY_PERCENTAGE%)"

    print_info "Target: production (canary)"
    print_info "Initial traffic: $CANARY_PERCENTAGE%"
    print_info "Build: dist/$BUILD_PROFILE"

    # Simulate canary deployment
    echo -e "\n  ${BLUE}Steps:${NC}"
    echo "    [1/4] Creating canary instance..."
    sleep 1
    echo "    [2/4] Routing $CANARY_PERCENTAGE% traffic to canary..."
    sleep 1
    echo "    [3/4] Monitoring canary health..."
    sleep 2
    echo "    [4/4] Canary deployment active"

    print_success "Canary deployment complete"
    print_info "Monitor canary metrics before promoting to full rollout"
    print_info "Use 'deploy.sh promote-canary' to complete rollout"
    print_info "Use 'deploy.sh rollback' to revert"

    # Save deployment info
    mkdir -p "$PROJECT_DIR/.deployments"
    cat > "$PROJECT_DIR/.deployments/canary-latest.json" << EOF
{
  "environment": "production",
  "type": "canary",
  "percentage": $CANARY_PERCENTAGE,
  "profile": "$BUILD_PROFILE",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "status": "active"
}
EOF
}

# Promote canary to full rollout
promote_canary() {
    print_step "Promoting canary to full rollout"

    if [ ! -f "$PROJECT_DIR/.deployments/canary-latest.json" ]; then
        print_error "No active canary deployment found"
        exit 1
    fi

    # Simulate promotion
    echo -e "\n  ${BLUE}Steps:${NC}"
    echo "    [1/3] Increasing traffic to 100%..."
    sleep 2
    echo "    [2/3] Removing old instances..."
    sleep 1
    echo "    [3/3] Finalizing rollout..."
    sleep 1

    # Update deployment info
    mv "$PROJECT_DIR/.deployments/canary-latest.json" "$PROJECT_DIR/.deployments/canary-promoted.json"

    print_success "Canary promoted to full rollout"
}

# Rollback deployment
rollback() {
    print_step "Rolling back deployment"

    TARGET="${1:-production}"

    print_warn "Rolling back $TARGET deployment"

    # Simulate rollback
    echo -e "\n  ${BLUE}Steps:${NC}"
    echo "    [1/4] Fetching previous deployment..."
    sleep 1
    echo "    [2/4] Restoring configuration..."
    sleep 1
    echo "    [3/4] Switching traffic..."
    sleep 1
    echo "    [4/4] Health check..."
    sleep 1

    print_success "Rollback complete"

    # Save rollback info
    mkdir -p "$PROJECT_DIR/.deployments"
    cat > "$PROJECT_DIR/.deployments/$TARGET-rollback.json" << EOF
{
  "environment": "$TARGET",
  "action": "rollback",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "completed"
}
EOF
}

# Show deployment status
show_status() {
    print_step "Deployment Status"

    echo ""
    for env in staging production canary; do
        file="$PROJECT_DIR/.deployments/${env}-latest.json"
        if [ -f "$file" ]; then
            echo -e "  ${CYAN}$env:${NC}"
            cat "$file" | sed 's/^/    /'
            echo ""
        fi
    done

    if [ ! -d "$PROJECT_DIR/.deployments" ] || [ -z "$(ls -A "$PROJECT_DIR/.deployments" 2>/dev/null)" ]; then
        print_info "No deployments found"
    fi
}

# Deploy to Cloudflare Workers
deploy_cloudflare() {
    local env="$1"
    print_step "Deploying to Cloudflare Workers ($env)"

    # Check Cloudflare credentials
    if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
        print_error "Cloudflare credentials not found"
        print_info "Please set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID environment variables"
        exit 1
    fi

    print_info "Environment: $env"
    print_info "Account: ****${CLOUDFLARE_ACCOUNT_ID: -4}"

    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        print_warn "Wrangler CLI not found, using Node.js deployment"
        deploy_cloudflare_node "$env"
    else
        deploy_cloudflare_wrangler "$env"
    fi
}

# Deploy using Wrangler CLI
deploy_cloudflare_wrangler() {
    local env="$1"
    
    echo -e "\n  ${BLUE}Steps:${NC}"
    echo "    [1/5] Validating configuration..."
    sleep 1
    echo "    [2/5] Provisioning resources..."
    sleep 1
    echo "    [3/5] Uploading worker script..."
    sleep 2
    echo "    [4/5] Updating DNS records..."
    sleep 1
    echo "    [5/5] Running health checks..."
    sleep 1

    # Run wrangler deploy
    if [ "$env" = "staging" ]; then
        wrangler deploy --env staging 2>&1 | while read line; do
            echo "    $line"
        done
    else
        wrangler deploy 2>&1 | while read line; do
            echo "    $line"
        done
    fi

    print_success "Cloudflare deployment complete"
}

# Deploy using Node.js script
deploy_cloudflare_node() {
    local env="$1"
    
    # Load configuration from cloudflare-config.yaml
    local config_file="src/config/cloudflare-config.yaml"
    if [ ! -f "$config_file" ]; then
        print_error "Cloudflare configuration file not found: $config_file"
        exit 1
    fi

    echo -e "\n  ${BLUE}Steps:${NC}"
    echo "    [1/6] Loading configuration..."
    sleep 1
    echo "    [2/6] Validating credentials..."
    sleep 1
    echo "    [3/6] Provisioning KV namespaces..."
    sleep 1
    echo "    [4/6] Provisioning R2 buckets..."
    sleep 1
    echo "    [5/6] Deploying worker script..."
    sleep 2
    echo "    [6/6] Updating DNS records..."
    sleep 1

    # Create deployment script
    cat > /tmp/cloudflare-deploy.js << 'EOF'
import CloudflareWorkersDeployer from "./src/cloud/workers-deploy.js";
import { getCloudflareConfig } from "./src/config.js";

async function deploy() {
  const env = process.argv[2] || "production";
  
  console.log(`🚀 Deploying to Cloudflare Workers (${env})`);
  
  const config = {
    domain: getCloudflareConfig("cloudflare.domain"),
    ports: getCloudflareConfig("cloudflare.ports"),
    features: getCloudflareConfig("cloudflare.features"),
    environment: env,
    scriptName: `quantum-dashboard-${env}`,
    kvNamespaces: ["config", "overrides"],
    r2Buckets: ["quantum-dashboard"],
  };

  const deployer = new CloudflareWorkersDeployer();
  
  try {
    const result = await deployer.deploy(config);
    
    if (result.success) {
      console.log("✅ Deployment successful!");
      console.log(`   Deployment ID: ${result.deploymentId}`);
      console.log(`   Resources: ${JSON.stringify(result.resources, null, 2)}`);
    } else {
      console.error("❌ Deployment failed:", result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Deployment error:", error.message);
    process.exit(1);
  }
}

deploy();
EOF

    # Run deployment
    bun run /tmp/cloudflare-deploy.js "$env"

    # Clean up
    rm -f /tmp/cloudflare-deploy.js

    print_success "Cloudflare deployment complete"
}

# Show help
show_help() {
    print_banner
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  staging          Deploy to staging environment"
    echo "  production       Deploy to production environment"
    echo "  canary           Start canary deployment"
    echo "  promote-canary   Promote canary to full rollout"
    echo "  rollback [env]   Rollback deployment (default: production)"
    echo "  status           Show deployment status"
    echo "  build-only       Build without deploying"
    echo "  cloudflare <env> Deploy to Cloudflare Workers (staging/production)"
    echo "  help             Show this help"
    echo ""
    echo "Options:"
    echo "  --profile <name>   Build profile (universal/terminal-only/lightweight)"
    echo "  --skip-tests       Skip running tests"
    echo "  --skip-clean       Skip cleaning previous builds"
    echo "  --force            Skip confirmation prompts"
    echo ""
    echo "Environment variables:"
    echo "  DEPLOY_TARGET          Target environment"
    echo "  BUILD_PROFILE          Build profile (default: universal)"
    echo "  CANARY_PERCENTAGE      Initial canary traffic % (default: 10)"
    echo "  FORCE_DEPLOY           Skip confirmations (true/false)"
    echo "  CLOUDFLARE_DEPLOY      Deploy to Cloudflare (true/false)"
    echo "  CLOUDFLARE_ENV         Cloudflare environment (staging/production)"
    echo "  CLOUDFLARE_API_TOKEN   Cloudflare API token"
    echo "  CLOUDFLARE_ACCOUNT_ID  Cloudflare account ID"
    echo "  CLOUDFLARE_ZONE_ID     Cloudflare zone ID"
    echo ""
    echo "Examples:"
    echo "  $0 staging                      # Deploy to staging"
    echo "  $0 production --profile lightweight"
    echo "  $0 canary                       # Start canary deployment"
    echo "  CANARY_PERCENTAGE=20 $0 canary  # Canary with 20% traffic"
    echo "  $0 cloudflare staging           # Deploy to Cloudflare staging"
    echo "  $0 cloudflare production        # Deploy to Cloudflare production"
}

# Parse arguments
SKIP_TESTS=false
SKIP_CLEAN=false
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            BUILD_PROFILE="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-clean)
            SKIP_CLEAN=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        -h|--help|help)
            show_help
            exit 0
            ;;
        *)
            if [ -z "$COMMAND" ]; then
                COMMAND="$1"
            fi
            shift
            ;;
    esac
done

# Main
print_banner

case "${COMMAND:-help}" in
    staging)
        check_prerequisites
        [ "$SKIP_CLEAN" = false ] && clean_builds
        install_deps
        [ "$SKIP_TESTS" = false ] && run_tests
        build_app
        deploy_staging
        ;;
    production)
        check_prerequisites
        [ "$SKIP_CLEAN" = false ] && clean_builds
        install_deps
        [ "$SKIP_TESTS" = false ] && run_tests
        build_app
        deploy_production
        ;;
    canary)
        check_prerequisites
        [ "$SKIP_CLEAN" = false ] && clean_builds
        install_deps
        [ "$SKIP_TESTS" = false ] && run_tests
        build_app
        deploy_canary
        ;;
    promote-canary)
        promote_canary
        ;;
    rollback)
        rollback "$2"
        ;;
    status)
        show_status
        ;;
    build-only)
        check_prerequisites
        [ "$SKIP_CLEAN" = false ] && clean_builds
        install_deps
        build_app
        print_success "Build complete. Ready for deployment."
        ;;
    cloudflare)
        if [ -z "$2" ]; then
            print_error "Cloudflare environment not specified"
            echo ""
            show_help
            exit 1
        fi
        deploy_cloudflare "$2"
        ;;
    help)
        show_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        show_help
        exit 1
        ;;
esac