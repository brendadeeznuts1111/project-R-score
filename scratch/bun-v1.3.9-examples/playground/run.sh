#!/usr/bin/env bash
# Simple launcher for Bun v1.3.9 Playground

cd "$(dirname "$0")"

echo "🚀 Bun v1.3.9 Playground"
echo ""

if [ "$1" = "" ]; then
  echo "Usage: ./run.sh [demo-number|all]"
  echo ""
  echo "Available demos:"
  echo "  1. Parallel & Sequential Scripts"
  echo "  2. HTTP/2 Connection Upgrades"
  echo "  3. Mock Auto-Cleanup (Symbol.dispose)"
  echo "  4. NO_PROXY Environment Variable"
  echo "  5. CPU Profiling Interval"
  echo "  6. ESM Bytecode Compilation"
  echo "  7. Performance Optimizations"
  echo ""
  echo "  all - Run all demos"
  echo ""
  echo "Examples:"
  echo "  ./run.sh 1      # Run demo 1"
  echo "  ./run.sh all    # Run all demos"
  echo ""
  exit 0
fi

if [ "$1" = "all" ]; then
  bun run playground.ts --all
else
  bun run playground.ts "$1"
fi
