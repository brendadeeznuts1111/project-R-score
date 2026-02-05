#!/bin/bash
# benchmark-terminal-api.sh
# Benchmarks Terminal API vs legacy spawn performance

set -e

echo "⚡ Benchmarking Terminal API vs legacy spawn..."

# Check if hyperfine is available
if ! command -v hyperfine &> /dev/null; then
    echo "❌ hyperfine not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install hyperfine
    else
        echo "Please install hyperfine manually: https://github.com/sharkdp/hyperfine"
        exit 1
    fi
fi

# Create test workspace
TEST_DIR="/tmp/bun-benchmark-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Create package.json with dependencies
cat > package.json << 'EOF'
{
  "name": "benchmark-test",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "^4.17.21",
    "express": "^4.18.2",
    "axios": "^1.6.0"
  }
}
EOF

echo "📊 Benchmark setup complete in $TEST_DIR"
echo ""

# Benchmark 1: Terminal API vs legacy install
echo "🎯 Benchmark 1: Terminal API vs legacy install"
hyperfine \
    'bun --terminal=raw install' \
    'bun install' \
    --warmup 3 \
    --runs 10 \
    --export-markdown benchmark-results.md \
    --title "Terminal API vs Legacy Install"

echo ""
echo "📈 Benchmark 2: Different terminal modes"
hyperfine \
    'bun --terminal=raw install' \
    'bun --terminal=dumb install' \
    'bun install' \
    --warmup 2 \
    --runs 5 \
    --export-markdown terminal-modes-results.md \
    --title "Terminal Mode Performance"

echo ""
echo "🔢 Benchmark 3: configVersion impact with terminal"
hyperfine \
    'BUN_CONFIG_VERSION=0 bun --terminal=raw install' \
    'BUN_CONFIG_VERSION=1 bun --terminal=raw install' \
    --warmup 2 \
    --runs 5 \
    --export-markdown config-version-results.md \
    --title "Config Version Impact with Terminal API"

# Memory usage analysis
echo ""
echo "💾 Memory usage analysis..."
echo "Terminal API memory profile:"
/usr/bin/time -l bun --terminal=raw install 2>&1 | grep "maximum resident set size" || echo "Memory profiling not available"

echo ""
echo "Legacy memory profile:"
/usr/bin/time -l bun install 2>&1 | grep "maximum resident set size" || echo "Memory profiling not available"

# Cleanup
cd - > /dev/null
echo ""
echo "📁 Results saved to:"
echo "- benchmark-results.md"
echo "- terminal-modes-results.md" 
echo "- config-version-results.md"
echo ""
echo "🧹 Cleaning up test directory..."
rm -rf "$TEST_DIR"

echo "✅ Benchmark complete!"
