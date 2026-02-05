#!/bin/bash
# Quick Nix Development Commands for bun:ffi Implementation

echo "🚀 Bun FFI Development - Nix Environment"
echo "=========================================="

# Check we're in the right environment
if [ ! -d "src" ] || [ ! -f "package.json" ]; then
    echo "❌ Error: Not in Bun repository root"
    echo "Please run: git clone https://github.com/oven-sh/bun.git && cd bun"
    exit 1
fi

echo "✅ Nix environment detected"
echo ""

# Show current environment
echo "📊 Current Environment:"
echo "C_INCLUDE_PATH: $C_INCLUDE_PATH"
echo "LIBRARY_PATH: $LIBRARY_PATH"
echo "CC: $CC"
echo "CXX: $CXX"
echo ""

# Quick implementation checklist
echo "🔧 Implementation Checklist:"
echo "1. Edit src/bun.js/api/ffi.zig"
echo "2. Add getEnvPaths() function"
echo "3. Modify compile() function"
echo "4. Build with: bun bd"
echo "5. Test with: ./build/bun run test_ffi_env.ts"
echo ""

# Build commands
echo "🏗️  Build Commands:"
echo "# Debug build (faster)"
echo "bun bd"
echo ""
echo "# Release build (optimized)"
echo "bun run build:release"
echo ""

# Test commands
echo "🧪 Test Commands:"
echo "# Run FFI tests"
echo "./build/bun test test/js/bun/ffi"
echo ""
echo "# Test environment variables"
echo "./build/bun test test/js/bun/ffi/env-paths.test.ts"
echo ""

# Debug commands
echo "🔍 Debug Commands:"
echo "# Check Bun version"
echo "./build/bun --version"
echo ""
echo "# Test with custom env vars"
echo "C_INCLUDE_PATH=/tmp/test ./build/bun -e 'console.log(process.env.C_INCLUDE_PATH)'"
echo ""

# Create test file
echo "📝 Creating test file..."
cat > test_ffi_env.ts << 'EOF'
import { cc } from "bun:ffi";

console.log("C_INCLUDE_PATH:", process.env.C_INCLUDE_PATH);
console.log("LIBRARY_PATH:", process.env.LIBRARY_PATH);

// Test 1: Basic functionality
const { symbols: test1 } = cc({
  source: `
    #include <stdio.h>
    int hello() { return 42; }
  `,
  symbols: {
    hello: { returns: "int", args: [] }
  }
});

console.log("Test 1 (basic):", test1.hello() === 42 ? "PASS ✅" : "FAIL ❌");

// Test 2: Environment variable
const testDir = "/tmp/bun_ffi_test_" + Math.random().toString(36).substr(2, 9);
await Bun.$`mkdir -p ${testDir}/include`;
await Bun.write(`${testDir}/include/myheader.h`, "#define MAGIC 123\n");

const originalInclude = process.env.C_INCLUDE_PATH;
process.env.C_INCLUDE_PATH = `${testDir}/include`;

try {
  const { symbols: test2 } = cc({
    source: `
      #include "myheader.h"
      int get_magic() { return MAGIC; }
    `,
    symbols: {
      get_magic: { returns: "int", args: [] }
    }
  });
  
  console.log("Test 2 (env path):", test2.get_magic() === 123 ? "PASS ✅" : "FAIL ❌");
} catch (e) {
  console.log("Test 2 (env path): FAIL ❌ -", e.message);
}

// Cleanup
process.env.C_INCLUDE_PATH = originalInclude;
await Bun.$`rm -rf ${testDir}`;

console.log("\nAll FFI env tests complete!");
EOF

echo "✅ Created test_ffi_env.ts"
echo ""

echo "🎯 Ready to implement!"
echo ""
echo "Next steps:"
echo "1. Edit src/bun.js/api/ffi.zig"
echo "2. Add the getEnvPaths() function"
echo "3. Build: bun bd"
echo "4. Test: ./build/bun run test_ffi_env.ts"
echo ""
echo "Good luck! 🚀"
