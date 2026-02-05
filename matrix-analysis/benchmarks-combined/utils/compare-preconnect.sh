#!/usr/bin/env bash
# Compare cold vs preconnect fetch performance
# Requires: hyperfine (brew install hyperfine)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOSTS="https://api.github.com,https://registry.npmjs.org,https://bun.sh"

echo "Benchmarking cold vs preconnect fetch..."
echo ""

# Check if hyperfine is installed
if ! command -v hyperfine &> /dev/null; then
    echo "hyperfine not found. Install with: brew install hyperfine"
    echo ""
    echo "Running manual comparison instead..."
    echo ""

    echo "=== Cold Fetch ==="
    bun "$SCRIPT_DIR/cold-fetch.ts"
    echo ""

    echo "=== Preconnect Fetch ==="
    bun "$SCRIPT_DIR/preconnect-fetch.ts"
    exit 0
fi

hyperfine \
    --warmup 2 \
    --runs 10 \
    --export-markdown "$SCRIPT_DIR/results.md" \
    "bun $SCRIPT_DIR/cold-fetch.ts" \
    "bun --fetch-preconnect $HOSTS $SCRIPT_DIR/preconnect-fetch.ts"

echo ""
echo "Results saved to $SCRIPT_DIR/results.md"
