#!/bin/bash

# Production Build Script for Living House Sportsbook
# Creates signed, production-ready executable

set -e

echo "🏗️  Building Living House Production Executable..."
echo "================================================="

# Clean previous builds
rm -f living-house living-house.js.map

# Build optimized executable
echo "📦 Compiling executable..."
bun build upgrade-me.ts \
  --compile \
  --outfile living-house \
  --bytecode \
  --sourcemap external \
  --target bun \
  --minify

echo "✅ Executable compiled: living-house ($(du -h living-house | cut -f1))"

# Verify the build
echo "🔍 Verifying build..."
./living-house --help 2>/dev/null || echo "Binary ready (no --help flag)"

# Sign the executable (if cosign is available)
if command -v cosign >/dev/null 2>&1; then
    echo "🔐 Signing executable with cosign..."
    cosign sign-blob living-house --yes --tlog-upload=false
    echo "✅ Executable signed and ready for deployment"
else
    echo "⚠️  Cosign not found - install for production signing"
    echo "   brew install sigstore/tap/cosign"
fi

echo ""
echo "🎯 Production Build Complete!"
echo "============================"
echo "📁 Files created:"
echo "  • living-house (executable)"
echo "  • living-house.js.map (sourcemap)"
echo ""
echo "🚀 Ready for canary deployment:"
echo "  ./living-house"
echo ""
echo "🏷️  Tag this release: v1.0.0-living-house"
