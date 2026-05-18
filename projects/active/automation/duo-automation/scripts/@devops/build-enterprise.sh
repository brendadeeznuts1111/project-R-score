#!/bin/bash
# scripts/build-enterprise.sh
# Empire Pro v3.7 - Enterprise build with feature flags

set -e

echo "🏛️ Building Empire Pro v3.7 - ENTERPRISE Edition"
echo "================================================"

# Clean previous builds
rm -rf dist/enterprise
mkdir -p dist/enterprise

# Build core security dashboard with enterprise features
echo "📦 Building Security Dashboard (ENTERPRISE_SECURITY)..."
bun build \
  --feature=ENTERPRISE_SECURITY \
  --feature=PREMIUM_ANALYTICS \
  --feature=ADVANCED_DASHBOARD \
  --feature=AUDIT_EXPORT \
  --feature=REAL_TIME_UPDATES \
  --feature=MULTI_TENANT \
  --target=bun \
  --outfile=dist/enterprise/security-dashboard.js \
  security/unicode-dashboard.ts

# Build enhanced table formatter
echo "📊 Building Enhanced Table Formatter..."
bun build \
  --feature=PREMIUM_ANALYTICS \
  --target=bun \
  --outfile=dist/enterprise/table-formatter.js \
  terminal/unicode-formatter.ts

# Build audit exporter (enterprise only)
echo "📋 Building Audit Exporter..."
bun build \
  --feature=ENTERPRISE_SECURITY \
  --feature=AUDIT_EXPORT \
  --target=bun \
  --outfile=dist/enterprise/audit-exporter.js \
  utils/audit-exporter.ts

# Build status display
echo "🔍 Building Security Status Display..."
bun build \
  --feature=ENTERPRISE_SECURITY \
  --target=bun \
  --outfile=dist/enterprise/status-display.js \
  security/status-display.ts

# Create enterprise package.json
echo "📄 Creating enterprise package.json..."
cat > dist/enterprise/package.json << 'EOF'
{
  "name": "empire-pro-enterprise",
  "version": "3.7.0",
  "description": "Empire Pro v3.7 - Enterprise Security Dashboard",
  "type": "module",
  "main": "security-dashboard.js",
  "scripts": {
    "start": "bun security-dashboard.js",
    "audit": "bun audit-exporter.js",
    "status": "bun status-display.js"
  },
  "features": [
    "ENTERPRISE_SECURITY",
    "PREMIUM_ANALYTICS", 
    "ADVANCED_DASHBOARD",
    "AUDIT_EXPORT",
    "REAL_TIME_UPDATES",
    "MULTI_TENANT"
  ],
  "engines": {
    "bun": ">=1.3.5"
  }
}
EOF

# Calculate bundle sizes
echo "📏 Bundle Analysis:"
echo "=================="
du -h dist/enterprise/*.js | sort -h

# Verify no development code in enterprise build
echo "🔍 Verifying no development code..."
if grep -q "DEVELOPMENT_TOOLS\|Mock\|Simulated" dist/enterprise/*.js; then
  echo "❌ WARNING: Development code found in enterprise build!"
  exit 1
else
  echo "✅ Enterprise build is clean - no development code detected"
fi

echo ""
echo "🎉 Enterprise build completed successfully!"
echo "📦 Location: dist/enterprise/"
echo "🏛️ Features: ENTERPRISE_SECURITY, PREMIUM_ANALYTICS, AUDIT_EXPORT"
echo "🚀 Ready for production deployment!"
