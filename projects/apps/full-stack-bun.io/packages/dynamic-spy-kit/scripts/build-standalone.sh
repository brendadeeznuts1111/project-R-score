#!/bin/bash
#
# @dynamic-spy/kit v9.0 - Standalone Build Script
# 
# Deterministic production build - NO .env dependency
#

set -e

echo "🔨 Building Standalone Arbitrage Engine"
echo "========================================"
echo ""

# Create dist directory
mkdir -p dist

# Build standalone executable
echo "📦 Compiling standalone executable..."
bun build --compile \
	--no-compile-autoload-dotenv \
	--no-compile-autoload-bunfig \
	--no-compile-autoload-tsconfig \
	--no-compile-autoload-package-json \
	src/standalone-arb-engine.ts \
	--outfile dist/arb-engine

echo ""
echo "✅ Standalone build complete!"
echo ""
echo "📊 Build Info:"
ls -lh dist/arb-engine
echo ""
echo "🚀 Usage:"
echo "   ./dist/arb-engine"
echo ""
echo "💡 Deploy anywhere - no config files needed!"
echo "   scp dist/arb-engine user@prod-server:/usr/local/bin/"
echo "   ssh user@prod-server ./arb-engine"



