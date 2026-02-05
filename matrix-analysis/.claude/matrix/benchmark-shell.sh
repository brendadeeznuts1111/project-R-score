#!/bin/bash
# Tier-1380 OMEGA: Shell Integration Benchmark
# Identifies bottlenecks in shell functions

echo "🔥 Tier-1380 OMEGA: Shell Integration Benchmark"
echo "=============================================="
echo ""

MATRIX_COLS_HOME="${MATRIX_COLS_HOME:-$(dirname "$0")}"
CLI="$MATRIX_COLS_HOME/column-standards-all.ts"

# Benchmark function
benchmark() {
    local name="$1"
    local cmd="$2"
    local iterations="${3:-10}"
    
    echo "Testing: $name"
    
    # Warmup
    for i in {1..3}; do eval "$cmd" > /dev/null 2>&1; done
    
    # Benchmark
    local start=$(date +%s%N)
    for i in $(seq 1 $iterations); do
        eval "$cmd" > /dev/null 2>&1
    done
    local end=$(date +%s%N)
    
    local total_ns=$((end - start))
    local avg_ms=$((total_ns / iterations / 1000000))
    
    echo "  Average: ${avg_ms}ms per call (${iterations} iterations)"
    echo ""
}

# Test 1: Direct CLI call
echo "=== Direct CLI Performance ==="
benchmark "bun get 45" "bun $CLI get 45" 10
benchmark "bun list" "bun $CLI list" 5
benchmark "bun pipe names" "bun $CLI pipe names" 10

# Test 2: With jq parsing (bottleneck check)
echo "=== With jq Parsing ==="
if command -v jq &> /dev/null; then
    benchmark "get + jq" "bun $CLI get 45 --json | jq -r '.name'" 10
else
    echo "  ⚪ jq not installed, skipping"
fi
echo ""

# Test 3: Function overhead
echo "=== Function Call Overhead ==="

# Simple function
test_func() {
    bun "$CLI" get 45 > /dev/null 2>&1
}
benchmark "Function wrapper" "test_func" 10

# Test 4: Completion generation (potential bottleneck)
echo "=== Completion Generation ==="
benchmark "pipe ids (completions)" "bun $CLI pipe ids" 5
benchmark "pipe names (fzf)" "bun $CLI pipe names | head -20" 5

echo ""
echo "=== Bottleneck Analysis ==="
echo ""
echo "Common Bottlenecks:"
echo "  1. 🐌 Repeated bun process spawns (use caching)"
echo "  2. 🐌 jq parsing overhead (avoid in hot paths)"
echo "  3. 🐌 fzf without preview cache"
echo "  4. 🐌 Completion regeneration on every keystroke"
echo ""
echo "Recommendations:"
echo "  - Cache column list to /tmp"
echo "  - Use --json only when needed"
echo "  - Lazy-load completions"
echo "  - Batch operations"
