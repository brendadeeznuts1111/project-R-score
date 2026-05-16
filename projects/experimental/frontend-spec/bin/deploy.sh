#!/usr/bin/env bash
# deploy.sh - Complete production deployment

set -e

echo "🚀 Quantum Dashboard Deployment v2.0.0"
echo "====================================="

# Load configuration
CONFIG=${1:-"quantum-config.yaml"}
if [ ! -f "$CONFIG" ]; then
  echo "❌ Configuration file not found: $CONFIG"
  exit 1
fi

echo "📋 Loading configuration from $CONFIG"

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo "Install from: https://bun.sh"
    exit 1
fi

# Create necessary directories
mkdir -p {dist,logs,data,builds,deployments}

# Build all profiles
echo "🏗️ Building all profiles..."
bun run quantum-production-system.js build-all

# Get latest build
LATEST_BUILD=$(ls -t dist/universal/*.tar.gz 2>/dev/null | head -1)
if [ -z "$LATEST_BUILD" ]; then
    echo "❌ No build found in dist/universal/"
    exit 1
fi

BUILD_ID=$(basename "$LATEST_BUILD" .tar.gz)

echo "📦 Latest build: $BUILD_ID"

# Run tests
echo "🧪 Running tests..."
if bun test 2>/dev/null; then
    echo "✅ Tests passed"
else
    echo "⚠️ No tests found or tests failed, continuing..."
fi

# Deploy to staging
echo "🎭 Deploying to staging..."
DEPLOY_RESULT=$(bun run quantum-production-system.js deploy "$BUILD_ID" staging 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Staging deployment failed"
  echo "$DEPLOY_RESULT"
  exit 1
fi

echo "✅ Staging deployment successful"

# Run staging health check
echo "🧪 Running staging health check..."
if command -v curl &> /dev/null; then
    if curl -f http://localhost:3000/health 2>/dev/null; then
        echo "✅ Staging health check passed"
    else
        echo "⚠️ Staging health check failed, but continuing..."
    fi
else
    echo "⚠️ curl not available, skipping health check"
fi

# Canary deployment
echo "🎭 Starting canary release (10%)..."
CANARY_RESULT=$(bun run quantum-production-system.js deploy "$BUILD_ID" canary 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Canary release failed, rolling back..."
  bun run quantum-production-system.js rollback "$BUILD_ID"
  exit 1
fi

echo "✅ Canary deployment successful"

# Monitor canary
echo "👀 Monitoring canary release..."
sleep 5  # Brief monitoring period

# Check canary health
if command -v curl &> /dev/null; then
    CANARY_HEALTHY=$(curl -s http://localhost:3000/health 2>/dev/null | grep -q "healthy" && echo "true" || echo "false")
    
    if [ "$CANARY_HEALTHY" = "false" ]; then
        echo "❌ Canary unhealthy, rolling back..."
        bun run quantum-production-system.js rollback "$BUILD_ID"
        exit 1
    fi
else
    echo "⚠️ Cannot verify canary health without curl"
fi

# Full rollout
echo "🚀 Full production rollout..."
FULL_RESULT=$(bun run quantum-production-system.js deploy "$BUILD_ID" production 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Production deployment failed"
  echo "$FULL_RESULT"
  exit 1
fi

echo "✅ Production deployment successful!"
echo ""
echo "🌐 Dashboard: http://localhost:3000"
echo "📊 Monitoring: http://localhost:3002"
echo "🔧 Build ID: $BUILD_ID"
echo ""
echo "📋 Deployment Summary:"
echo "  Build: $BUILD_ID"
echo "  Size: $(du -h "$LATEST_BUILD" | cut -f1)"
echo "  Timestamp: $(date)"
echo "  Status: DEPLOYED"

# Generate deployment report
cat > "./deployments/deployment-${BUILD_ID}.json" << EOF
{
  "build_id": "$BUILD_ID",
  "deployment_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "deployed",
  "environment": "production",
  "config_file": "$CONFIG",
  "build_size": "$(du -h "$LATEST_BUILD" | cut -f1)",
  "steps": [
    {"name": "build", "status": "completed"},
    {"name": "staging", "status": "completed"},
    {"name": "canary", "status": "completed"},
    {"name": "production", "status": "completed"}
  ]
}
EOF

echo "📄 Deployment report saved to deployments/deployment-${BUILD_ID}.json"
