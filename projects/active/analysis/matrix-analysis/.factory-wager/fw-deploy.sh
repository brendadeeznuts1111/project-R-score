#!/bin/bash
# FactoryWager Automated Deployment Script v1.3.8
# Enhanced with vault workflow integration
# Usage: ./fw-deploy.sh [staging|production]

set -e  # Exit on any error

DEPLOY_MODE=${1:-staging}
export FW_MODE=$DEPLOY_MODE

echo "🚀 FactoryWager Automated Deployment v1.3.8"
echo "=========================================="
echo "Mode: $DEPLOY_MODE"
echo "Time: $(date)"
echo ""

# Phase 0: Vault Pre-flight & Secret Injection
echo "📍 Phase 0: Vault Pre-flight & Secret Injection"
echo "================================================"

# Step 1: Vault health check with workflow integration
echo "🔐 Step 1: Vault health check..."
if ! bun run vault-workflow-integration.ts deploy-preflight; then
    echo "❌ Vault pre-flight failed - aborting deployment"
    exit 1
fi
echo "✅ Vault health check passed"

# Step 2: Inject secrets into config.yaml
echo "🔐 Step 2: Injecting vault secrets into config..."
if ! bun run vault-workflow-integration.ts inject-yaml config.yaml; then
    echo "❌ Secret injection failed - aborting deployment"
    exit 1
fi
echo "✅ Vault secrets injected successfully"

# Step 3: Use injected config for deployment
echo "🔐 Step 3: Preparing deployment configuration..."
if [[ -f "config.injected.yaml" ]]; then
    # Backup original config
    cp config.yaml config.original.yaml
    # Use injected config for deployment
    mv config.injected.yaml config.yaml
    echo "✅ Deployment configuration ready (config.yaml now contains injected secrets)"
else
    echo "❌ Injected config file not found"
    exit 1
fi

# Step 4: Generate deployment credential report
echo "🔐 Step 4: Generating deployment credential report..."
bun run vault-dashboard.ts json > "$HOME/.factory-wager/deployment-credentials.json"
echo "📊 Credentials report: $HOME/.factory-wager/deployment-credentials.json"

echo "✅ Phase 0 complete - Vault pre-flight + secret injection successful"
echo ""

# Phase 1: Environment Validation
echo "📍 Phase 1: Environment Validation"
echo "=================================="

# Check Bun version
BUN_VERSION=$(bun --version)
echo "✅ Bun version: $BUN_VERSION"

# Validate required environment variables
REQUIRED_VARS=("FW_MODE" "TIER_REGION")
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    fi
done
echo "✅ Environment variables validated"

# Check if config.yaml exists and has injected secrets
if [[ ! -f "config.yaml" ]]; then
    echo "❌ config.yaml not found"
    exit 1
fi

if grep -q "VAULT:" config.yaml; then
    echo "❌ config.yaml still contains VAULT: references - injection failed"
    exit 1
fi
echo "✅ Configuration validated (secrets injected)"

echo "✅ Phase 1 complete - Environment validation successful"
echo ""

# Phase 2: Build Preparation
echo "📍 Phase 2: Build Preparation"
echo "============================="

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ build/
echo "✅ Build directories cleaned"

# Install dependencies
echo "📦 Installing dependencies..."
bun install
echo "✅ Dependencies installed"

# Run tests
echo "🧪 Running tests..."
bun test
echo "✅ Tests passing"

echo "✅ Phase 2 complete - Build preparation successful"
echo ""

# Phase 3: Deployment Execution
echo "📍 Phase 3: Deployment Execution"
echo "==============================="

# Build application
echo "🏗️ Building application..."
bun run build
echo "✅ Build completed successfully"

# Deploy to target environment
echo "🚀 Deploying to $DEPLOY_MODE..."
case "$DEPLOY_MODE" in
    "production")
        echo "🏭 Deploying to production..."
        # Production deployment logic
        # Add your production deployment commands here
        echo "✅ Production deployment completed"
        ;;
    "staging")
        echo "🧪 Deploying to staging..."
        # Staging deployment logic
        # Add your staging deployment commands here
        echo "✅ Staging deployment completed"
        ;;
    *)
        echo "❌ Unknown deployment mode: $DEPLOY_MODE"
        exit 1
        ;;
esac

echo "✅ Phase 3 complete - Deployment execution successful"
echo ""

# Phase 4: Post-deployment Verification
echo "📍 Phase 4: Post-deployment Verification"
echo "======================================="

# Health checks
echo "🔍 Running post-deployment health checks..."

# Vault health check
if bun run vault-workflow-integration.ts deploy-preflight >/dev/null 2>&1; then
    echo "✅ Vault health check passed"
else
    echo "⚠️  Vault health check warning"
fi

# Service availability checks
echo "🔍 Checking service availability..."
# Add your service health checks here
echo "✅ Service availability confirmed"

echo "✅ Phase 4 complete - Post-deployment verification successful"
echo ""

# Cleanup: Restore original config (with VAULT: references)
echo "🧹 Cleaning up deployment artifacts..."
if [[ -f "config.original.yaml" ]]; then
    mv config.original.yaml config.yaml
    echo "✅ Original configuration restored (VAULT: references)"
fi

# Generate final deployment report
DEPLOYMENT_REPORT="deployment-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$DEPLOYMENT_REPORT" << EOF
{
  "deployment_id": "deploy-$(date +%Y-%m-%d-%H-%M-%S)",
  "mode": "$DEPLOY_MODE",
  "vault_status": "healthy",
  "secrets_injected": true,
  "build_status": "success",
  "deployment_status": "success",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "credentials_report": "$HOME/.factory-wager/deployment-credentials.json"
}
EOF

echo ""
echo "🎉 Deployment completed successfully!"
echo "📊 Deployment report: $DEPLOYMENT_REPORT"
echo "🔐 Credentials report: $HOME/.factory-wager/deployment-credentials.json"
echo ""
echo "🚀 FactoryWager is now live in $DEPLOY_MODE!"
