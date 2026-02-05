#!/usr/bin/env bash
# Build Kalman System with v2.4.2 Infrastructure
#
# Production build with all security features enabled
# Golden Matrix components #42-45 integrated

set -e

echo "🚀 Building Kalman System v2.4.2 with Golden Matrix Infrastructure"
echo "=================================================================="

# Check if Bun is available
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first."
    exit 1
fi

# Create output directory
mkdir -p dist
mkdir -p logs

echo "📦 Building with security features enabled..."

# Build with all v2.4.2 security features enabled
bun build ./src/kalman-system.ts \
  --features="SECURITY_HARDENING,YAML12_STRICT,STRING_WIDTH_OPT,NATIVE_ADDONS,TRUSTED_DEPS_SPOOF,JSC_SANDBOX,UNICODE_ZWJ,ANSI_CSI_PARSER,V8_TYPE_BRIDGE,YAML_BOOLEAN_STRICT" \
  --define="KALMAN_VERSION=2.4.2" \
  --define="PATTERN_COUNT=89" \
  --define="INFRASTRUCTURE_VERSION=golden-matrix-v2.4.2" \
  --define="SECURITY_LEVEL=HARDENED" \
  --outfile=dist/kalman-v2-4-2-prod.js \
  --minify \
  --target=bun \
  --analyze > dist/build-analysis.json

echo "✅ Build completed successfully"

# Check build size
BUILD_SIZE=$(wc -c < dist/kalman-v2-4-2-prod.js)
echo "📊 Build size: $(echo "scale=2; $BUILD_SIZE / 1024" | bc)KB"

# Run security audit
echo "🔒 Running security audit..."
bun run ./scripts/security-audit.ts --patterns "70-89"

# Run feature validation
echo "🔧 Validating feature flags..."
bun run ./features/kalman-features.bun.ts

# Run integration tests
echo "🧪 Running integration tests..."
bun test infrastructure/integration-layer.bun.ts
bun test patterns/pattern74.bun.ts
bun test patterns/pattern81.bun.ts

# Performance benchmarks
echo "⚡ Running performance benchmarks..."
bun run infrastructure/v2-4-2/stringwidth-engine.ts
bun run infrastructure/v2-4-2/v8-type-bridge.ts
bun run infrastructure/v2-4-2/security-hardening-layer.ts

echo "📋 Build Summary:"
echo "   Version: 2.4.2"
echo "   Security: HARDENED"
echo "   Infrastructure: Golden Matrix Components #42-45"
echo "   Build Size: $(echo "scale=2; $BUILD_SIZE / 1024" | bc)KB"
echo "   Status: ✅ PRODUCTION READY"

echo ""
echo "🎯 Next Steps:"
echo "   1. Deploy to production environment"
echo "   2. Configure trustedDependencies in bunfig.toml"
echo "   3. Enable security monitoring"
echo "   4. Set up performance dashboards"

echo ""
echo "✅ Kalman System v2.4.2 build complete!"
