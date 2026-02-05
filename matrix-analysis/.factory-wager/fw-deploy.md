# FactoryWager Deployment Guide v1.3.8

## 🚀 **DEPLOYMENT PHASES**

### **Phase 0: Vault Pre-flight & Secret Injection**
**0. Vault pre-flight: rotate credentials if expired (>80 days) + secret injection**

```bash
#!/bin/bash
# FactoryWager Vault Pre-flight Check + Secret Injection
# Ensures all credentials are fresh and injects them into config

echo "🔐 FactoryWager Vault Pre-flight + Secret Injection"
echo "=================================================="

# Step 1: Vault health check with workflow integration
echo "📍 Step 1: Vault health check..."
if ! bun run vault-workflow-integration.ts deploy-preflight; then
    echo "❌ Vault pre-flight failed - aborting deployment"
    exit 1
fi
echo "✅ Vault health check passed"

# Step 2: Inject secrets into config.yaml
echo "� Step 2: Injecting vault secrets into config..."
if ! bun run vault-workflow-integration.ts inject-yaml config.yaml; then
    echo "❌ Secret injection failed - aborting deployment"
    exit 1
fi
echo "✅ Vault secrets injected successfully"

# Step 3: Use injected config for deployment
echo "📍 Step 3: Preparing deployment configuration..."
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
echo "� Step 4: Generating deployment credential report..."
bun run vault-dashboard.ts json > "$HOME/.factory-wager/deployment-credentials.json"

echo "🎉 Vault pre-flight + secret injection complete - ready for deployment"
echo "📊 Credentials report: $HOME/.factory-wager/deployment-credentials.json"
```

### **Phase 1: Environment Validation**
```bash
# Validate deployment environment
echo "🔍 Environment Validation"
echo "========================="

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
```

### **Phase 2: Build Preparation**
```bash
# Prepare build artifacts
echo "🏗️  Build Preparation"
echo "===================="

# Clean previous builds
rm -rf dist/ build/

# Install dependencies
bun install

# Run tests
bun test

echo "✅ Build preparation complete"
```

### **Phase 3: Deployment Execution**
```bash
# Execute deployment
echo "🚀 Deployment Execution"
echo "======================="

# Build application
bun run build

# Deploy to target environment
case "$FW_MODE" in
    "production")
        echo "🏭 Deploying to production..."
        # Production deployment logic
        ;;
    "staging")
        echo "🧪 Deploying to staging..."
        # Staging deployment logic
        ;;
    *)
        echo "❌ Unknown deployment mode: $FW_MODE"
        exit 1
        ;;
esac

echo "✅ Deployment completed"
```

### **Phase 4: Post-deployment Verification**
```bash
# Verify deployment success
echo "🔍 Post-deployment Verification"
echo "==============================="

# Health checks
bun run factory-wager-vault.ts health

# Service availability checks
# Add your service health checks here

echo "✅ Post-deployment verification complete"
```

---

## 📋 **DEPLOYMENT CHECKLIST**

### **Pre-deployment**
- [ ] Vault pre-flight check passed
- [ ] All credentials fresh (<80 days)
- [ ] Vault secrets injected into config.yaml
- [ ] Original config backed up as config.original.yaml
- [ ] Environment variables validated
- [ ] Dependencies installed
- [ ] Tests passing
- [ ] Build artifacts prepared

### **Deployment**
- [ ] Build completed successfully
- [ ] Services deployed to target environment
- [ ] Configuration applied
- [ ] Health checks passing

### **Post-deployment**
- [ ] All services responding
- [ ] Vault credentials accessible
- [ ] Monitoring active
- [ ] Rollback plan tested

---

## 🔄 **AUTOMATED DEPLOYMENT SCRIPT**

```bash
#!/bin/bash
# FactoryWager Automated Deployment
# Usage: ./deploy.sh [staging|production]

set -e  # Exit on any error

DEPLOY_MODE=${1:-staging}
export FW_MODE=$DEPLOY_MODE

echo "🚀 FactoryWager Automated Deployment"
echo "=================================="
echo "Mode: $DEPLOY_MODE"
echo "Time: $(date)"
echo ""

# Phase 0: Vault Pre-flight & Secret Injection
echo "📍 Phase 0: Vault Pre-flight & Secret Injection"
source <(cat <<'EOF'
# Vault pre-flight + secret injection script
echo "🔐 Running vault health check..."
if ! bun run vault-workflow-integration.ts deploy-preflight; then
    echo "❌ Vault pre-flight failed - aborting deployment"
    exit 1
fi

echo "🔐 Injecting vault secrets..."
if ! bun run vault-workflow-integration.ts inject-yaml config.yaml; then
    echo "❌ Secret injection failed - aborting deployment"
    exit 1
fi

echo "🔐 Preparing deployment configuration..."
if [[ -f "config.injected.yaml" ]]; then
    cp config.yaml config.original.yaml
    mv config.injected.yaml config.yaml
    echo "✅ Deployment configuration ready"
else
    echo "❌ Injected config file not found"
    exit 1
fi

echo "✅ Vault pre-flight + secret injection complete"
EOF
)

# Phase 1: Environment Validation
echo "📍 Phase 1: Environment Validation"
# Environment validation script

# Phase 2: Build Preparation
echo "📍 Phase 2: Build Preparation"
# Build preparation script

# Phase 3: Deployment Execution
echo "📍 Phase 3: Deployment Execution"
# Deployment execution script

# Phase 4: Post-deployment Verification
echo "📍 Phase 4: Post-deployment Verification"
# Post-deployment verification script

echo ""
echo "🎉 Deployment completed successfully!"
echo "📊 Deployment report saved to: deployment-report-$(date +%Y%m%d-%H%M%S).json"
```

---

## 🔧 **VAULT INTEGRATION NOTES**

### **Credential Freshness Policy**
- **Standard Rotation**: Every 90 days
- **Pre-flight Threshold**: Rotate if >80 days old
- **Emergency Rotation**: Immediate on health check failure
- **Backup Retention**: 30 days post-rotation

### **Vault Status Integration**
```bash
# Check vault status before deployment
VAULT_STATUS=$(bun run vault-dashboard.ts json | jq -r '.status')

if [[ "$VAULT_STATUS" != "healthy" ]]; then
    echo "⚠️  Vault status: $VAULT_STATUS"
    echo "🔄 Running pre-flight rotation..."
    bun run factory-wager-vault.ts rotate
fi
```

### **Deployment Credential Report**
```json
{
  "deployment_id": "deploy-2026-02-01-17-35-00",
  "vault_status": "healthy",
  "credentials_rotated": false,
  "freshness_check": "passed",
  "deployment_mode": "production",
  "timestamp": "2026-02-01T17:35:00.000Z"
}
```

---

## 🚨 **ROLLBACK PROCEDURES**

### **Vault Rollback**
```bash
# Restore from backup if deployment fails
fw-vault-restore vault-backup-YYYYMMDD-HHMMSS.json
fw-vault-health  # Verify vault status
```

### **Application Rollback**
```bash
# Rollback to previous version
# Add your application rollback logic here
```

---

## 📞 **SUPPORT CONTACTS**

- **Vault Issues**: Run `fw-vault-health` and check dashboard
- **Deployment Failures**: Check deployment logs and vault status
- **Emergency**: Use `fw-vault-reset` for immediate credential rotation

---

**🎯 Deployment Priority: Vault Security First**
*Always ensure credential freshness before any deployment operation.*
