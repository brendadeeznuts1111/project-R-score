#!/bin/bash
# Compare standard vs optimized shell integration

echo "🔥 Benchmark: Standard vs Optimized"
echo "===================================="
echo ""

MATRIX_COLS_HOME="."
source matrix/shell-integration-optimized.bash 2>/dev/null

# Wait for background cache warm
sleep 0.5

echo "Test 1: Get column (cached vs direct)"
echo "--------------------------------------"

echo "Direct (bun get 45):"
time for i in {1..5}; do bun matrix/column-standards-all.ts get 45 > /dev/null; done

echo ""
echo "Cached (cols_cached_get 45):"
time for i in {1..5}; do cols_cached_get 45 > /dev/null; done

echo ""
echo "Test 2: Column names list"
echo "--------------------------"

echo "Direct (pipe names):"
time for i in {1..5}; do bun matrix/column-standards-all.ts pipe names > /dev/null; done

echo ""
echo "Cached (cols_cached_names):"
time for i in {1..5}; do cols_cached_names > /dev/null; done

echo ""
echo "Test 3: Completion generation"
echo "------------------------------"

echo "Direct (pipe ids):"
time bun matrix/column-standards-all.ts pipe ids > /dev/null

echo ""
echo "Cached (cols_cached_ids):"
time cols_cached_ids > /dev/null

echo ""
echo "===================================="
echo "Cache Status:"
ls -la ~/.cache/matrix-cols/ 2>/dev/null || echo "Cache dir: $MATRIX_COLS_CACHE_DIR"
