#!/bin/bash
# scripts/build-development.sh
# Empire Pro v3.7 - Development build with debug features

set -e

echo "🧪 Building Empire Pro v3.7 - DEVELOPMENT Edition"
echo "==============================================="

# Clean previous builds
rm -rf dist/development
mkdir -p dist/development

# Build core security dashboard with development features
echo "📦 Building Security Dashboard (DEVELOPMENT_TOOLS)..."
bun build \
  --feature=DEVELOPMENT_TOOLS \
  --feature=DEBUG_UNICODE \
  --feature=PREMIUM_ANALYTICS \
  --feature=ADVANCED_DASHBOARD \
  --target=bun \
  --outfile=dist/development/security-dashboard.js \
  security/unicode-dashboard.ts

# Build enhanced table formatter with debug
echo "📊 Building Enhanced Table Formatter (DEBUG)..."
bun build \
  --feature=DEBUG_UNICODE \
  --feature=PREMIUM_ANALYTICS \
  --target=bun \
  --outfile=dist/development/table-formatter.js \
  terminal/unicode-formatter.ts

# Build status display with debug
echo "🔍 Building Security Status Display (DEBUG)..."
bun build \
  --feature=DEVELOPMENT_TOOLS \
  --feature=DEBUG_UNICODE \
  --target=bun \
  --outfile=dist/development/status-display.js \
  security/status-display.ts

# Create development package.json
echo "📄 Creating development package.json..."
cat > dist/development/package.json << 'EOF'
{
  "name": "empire-pro-development",
  "version": "3.7.0-dev",
  "description": "Empire Pro v3.7 - Development Security Dashboard",
  "type": "module",
  "main": "security-dashboard.js",
  "scripts": {
    "start": "bun security-dashboard.js",
    "debug": "DEBUG_UNICODE=true bun security-dashboard.js",
    "status": "bun status-display.js",
    "test-unicode": "bun table-formatter.js"
  },
  "features": [
    "DEVELOPMENT_TOOLS",
    "DEBUG_UNICODE",
    "PREMIUM_ANALYTICS",
    "ADVANCED_DASHBOARD"
  ],
  "engines": {
    "bun": ">=1.3.5"
  }
}
EOF

# Calculate bundle sizes
echo "📏 Bundle Analysis:"
echo "=================="
du -h dist/development/*.js | sort -h

# Verify development features are included
echo "🔍 Verifying development features..."
if grep -q "DEVELOPMENT_TOOLS\|Mock\|Simulated\|DEBUG_UNICODE" dist/development/*.js; then
  echo "✅ Development build includes debug features"
else
  echo "❌ WARNING: Development features missing!"
  exit 1
fi

# Verify no enterprise code in development build
echo "🔍 Verifying no enterprise-only code..."
if grep -q "ENTERPRISE_SECURITY\|SOC2\|GDPR\|HIPAA" dist/development/*.js; then
  echo "⚠️  WARNING: Enterprise code found in development build"
else
  echo "✅ Development build is properly scoped"
fi

echo ""
echo "🎉 Development build completed successfully!"
echo "📦 Location: dist/development/"
echo "🧪 Features: DEVELOPMENT_TOOLS, DEBUG_UNICODE, PREMIUM_ANALYTICS"
echo "🚀 Ready for local development!"
