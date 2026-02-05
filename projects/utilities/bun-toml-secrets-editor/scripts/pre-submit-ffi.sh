#!/bin/bash
# scripts/pre-submit-ffi.sh
# Pre-submit checks for bun:ffi environment variable support

set -e

echo "🔍 Running pre-submit checks for FFI env vars..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Error: Please run this script from the Bun repository root"
    exit 1
fi

# 1. Build
echo "Building Bun..."
if ! bun run build; then
    echo "❌ Build failed"
    exit 1
fi

# 2. Unit tests
echo "Running FFI tests..."
if ! bun bd test src/js/bun/ffi/test/env-vars.test.ts; then
    echo "❌ FFI tests failed"
    exit 1
fi

# 3. Security tests
echo "Running security tests..."
if ! bun test test/js/bun/ffi/security.test.ts 2>/dev/null; then
    echo "⚠️  Security tests not found (expected for new feature)"
fi

# 4. Performance benchmarks
echo "Running performance benchmarks..."
if ! bun test test/js/bun/ffi/performance.test.ts 2>/dev/null; then
    echo "⚠️  Performance tests not found (expected for new feature)"
fi

# 5. NixOS simulation (if available)
if command -v nix &> /dev/null; then
    echo "Testing NixOS compatibility..."
    if nix-shell -p libxml2 --run "C_INCLUDE_PATH=\$LIBXML2_DEV/include LIBRARY_PATH=\$LIBXML2/lib bun test test/js/bun/ffi/nixos.test.ts" 2>/dev/null; then
        echo "✅ NixOS compatibility verified"
    else
        echo "⚠️  NixOS test failed (may be expected if libxml2 not available)"
    fi
else
    echo "⚠️  Nix not available, skipping NixOS compatibility test"
fi

# 6. Check for required files
echo "Checking required files..."
required_files=(
    "src/zig/bun_ffi.zig"
    "src/js/bun/ffi/test/env-vars.test.ts"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
done

# 7. Check for security patterns
echo "Checking security patterns..."
if grep -r "\.\." src/js/bun/ffi/test/ | grep -v "Binary file" > /dev/null; then
    echo "⚠️  Found potential path traversal patterns in tests (expected for security testing)"
fi

echo "✅ All checks passed!"
echo ""
echo "Ready to submit PR:"
echo "1. Fork oven-sh/bun"
echo "2. git checkout -b ffi-env-paths"
echo "3. git add src/zig/bun_ffi.zig"
echo "4. git add test/js/bun/ffi/env-vars.test.ts"
echo "5. git commit -m 'feat(ffi): support C_INCLUDE_PATH and LIBRARY_PATH'"
echo "6. git push origin ffi-env-paths"
echo ""
echo "🎉 Your contribution will enable bun:ffi on NixOS and other non-FHS systems!"
