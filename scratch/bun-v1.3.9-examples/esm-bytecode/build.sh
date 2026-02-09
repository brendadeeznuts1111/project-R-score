#!/bin/bash
# Bun v1.3.9 ESM Bytecode Compilation Demo
# 
# Previously, --bytecode was CJS-only. v1.3.9 adds ESM support!

echo "=============================================="
echo "Bun v1.3.9 ESM Bytecode Compilation"
echo "=============================================="
echo ""

cd "$(dirname "$0")"

echo "1. Building ESM bytecode executable..."
bun build --compile --bytecode --format=esm ./cli.ts -o ./dist/cli-esm-bytecode
echo ""

echo "2. Building CJS bytecode executable (for comparison)..."
bun build --compile --bytecode --format=cjs ./cli.ts -o ./dist/cli-cjs-bytecode
echo ""

echo "3. Building without bytecode (pure source)..."
bun build --compile --format=esm ./cli.ts -o ./dist/cli-esm-source
echo ""

echo "4. File sizes:"
ls -lh ./dist/ 2>/dev/null || echo "   (dist/ directory not created yet)"
echo ""

echo "5. Testing ESM bytecode executable..."
./dist/cli-esm-bytecode --help 2>/dev/null || echo "   (executable not built yet)"
echo ""

echo "Done!"
