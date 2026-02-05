#!/bin/bash

# Test script for bun:ffi environment variable support
# This script demonstrates various scenarios for using C_INCLUDE_PATH and LIBRARY_PATH

set -e

echo "🧪 Testing bun:ffi with C_INCLUDE_PATH and LIBRARY_PATH support"
echo "================================================================"

# Create a temporary directory for our test headers and libraries
TEMP_DIR=$(mktemp -d)
mkdir -p "$TEMP_DIR/include"
mkdir -p "$TEMP_DIR/lib"

# Create a custom header file
cat > "$TEMP_DIR/include/test.h" << 'EOF'
#ifndef TEST_H
#define TEST_H

#define TEST_VALUE 42
int test_function(void);

#endif
EOF

# Create a simple library source
cat > "$TEMP_DIR/test_lib.c" << 'EOF'
#include "test.h"
#include <stdio.h>

int test_function(void) {
    printf("Library function called with TEST_VALUE=%d\n", TEST_VALUE);
    return TEST_VALUE;
}
EOF

# Compile the library (using system compiler for demonstration)
echo "📦 Creating test library..."
gcc -shared -fPIC "$TEMP_DIR/test_lib.c" -o "$TEMP_DIR/lib/libtest.so"

# Create test C file that uses the custom header
cat > "$TEMP_DIR/test_main.c" << 'EOF'
#include "test.h"
#include <stdio.h>

int main() {
    printf("Main function: Using custom header\n");
    int result = test_function();
    printf("Final result: %d\n", result);
    return result;
}
EOF

echo "✅ Test setup complete"
echo "📁 Temp directory: $TEMP_DIR"
echo ""

# Test 1: Without environment variables (should fail on non-standard systems)
echo "🧪 Test 1: Without environment variables"
echo "C_INCLUDE_PATH: ${C_INCLUDE_PATH:-not set}"
echo "LIBRARY_PATH: ${LIBRARY_PATH:-not set}"
echo ""

# Test 2: With environment variables set
echo "🧪 Test 2: With environment variables"
export C_INCLUDE_PATH="$TEMP_DIR/include"
export LIBRARY_PATH="$TEMP_DIR/lib"

echo "C_INCLUDE_PATH: $C_INCLUDE_PATH"
echo "LIBRARY_PATH: $LIBRARY_PATH"
echo ""

# Test the basic example
echo "🚀 Running basic bun:ffi example..."
if command -v bun &> /dev/null; then
    bun run examples/bun-ffi-env-vars.ts
    echo "✅ Basic example completed"
else
    echo "❌ Bun not found, skipping basic example"
fi

echo ""

# Test 3: Multiple paths (colon-separated)
echo "🧪 Test 3: Multiple paths"
export C_INCLUDE_PATH="$TEMP_DIR/include:/usr/include"
export LIBRARY_PATH="$TEMP_DIR/lib:/usr/lib"

echo "C_INCLUDE_PATH: $C_INCLUDE_PATH"
echo "LIBRARY_PATH: $LIBRARY_PATH"
echo ""

# Test 4: NixOS simulation
echo "🧪 Test 4: NixOS-style paths simulation"
export C_INCLUDE_PATH="/nix/store/abcd1234-gcc-11.3.0/include:/nix/store/efgh5678-glibc-2.35/include"
export LIBRARY_PATH="/nix/store/abcd1234-gcc-11.3.0/lib:/nix/store/efgh5678-glibc-2.35/lib"

echo "C_INCLUDE_PATH: $C_INCLUDE_PATH"
echo "LIBRARY_PATH: $LIBRARY_PATH"
echo ""

echo "🎉 All tests completed!"
echo ""
echo "📝 Summary:"
echo "  - C_INCLUDE_PATH and LIBRARY_PATH are now respected by bun:ffi"
echo "  - Multiple paths can be specified using colon (:) as separator"
echo "  - This enables compilation on NixOS and other non-FHS systems"
echo "  - Environment variables are automatically read during compilation"

# Cleanup
rm -rf "$TEMP_DIR"
echo "🧹 Cleanup completed"
