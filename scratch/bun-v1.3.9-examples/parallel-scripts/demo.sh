#!/usr/bin/env bash
# Demo script for bun run --parallel and --sequential

set -e

echo "🚀 Bun v1.3.9: Parallel & Sequential Script Execution Demo"
echo "============================================================"
echo ""

# Basic parallel execution
echo "📦 Example 1: Running 'build' and 'test' in parallel"
echo "Command: bun run --parallel build test"
echo "---"
cd "$(dirname "$0")"
bun run --parallel build test
echo ""
echo ""

# Sequential execution
echo "📦 Example 2: Running 'build' and 'test' sequentially"
echo "Command: bun run --sequential build test"
echo "---"
bun run --sequential build test
echo ""
echo ""

# Glob pattern matching
echo "📦 Example 3: Running all 'build:*' scripts in parallel"
echo "Command: bun run --parallel 'build:*'"
echo "---"
bun run --parallel "build:*"
echo ""
echo ""

# Workspace parallel execution
echo "📦 Example 4: Running 'build' in all workspace packages (parallel)"
echo "Command: bun run --parallel --filter '*' build"
echo "---"
cd workspace-demo
bun run --parallel --filter '*' build
echo ""
echo ""

# Workspace sequential execution
echo "📦 Example 5: Running 'build' in all workspace packages (sequential)"
echo "Command: bun run --sequential --workspaces build"
echo "---"
bun run --sequential --workspaces build
echo ""
echo ""

# Multiple scripts across workspaces
echo "📦 Example 6: Running multiple scripts across all packages (parallel)"
echo "Command: bun run --parallel --filter '*' build lint test"
echo "---"
bun run --parallel --filter '*' build lint test 2>/dev/null || echo "Note: Some packages may not have all scripts"
echo ""
echo ""

# Continue on error
echo "📦 Example 7: Continue running even if one package fails"
echo "Command: bun run --parallel --no-exit-on-error --filter '*' test"
echo "---"
bun run --parallel --no-exit-on-error --filter '*' test 2>/dev/null || true
echo ""
echo ""

# Skip missing scripts
echo "📦 Example 8: Skip packages missing the script"
echo "Command: bun run --parallel --workspaces --if-present lint"
echo "---"
bun run --parallel --workspaces --if-present lint
echo ""
echo ""

echo "✅ Demo complete!"
echo ""
echo "Key differences:"
echo "  • --parallel: Starts all scripts immediately with interleaved output"
echo "  • --sequential: Runs scripts one at a time in order"
echo "  • --filter: Works with workspace packages"
echo "  • --workspaces: Runs across all workspace packages"
echo "  • --no-exit-on-error: Continue even if one script fails"
echo "  • --if-present: Skip packages missing the script"
echo ""
echo "Pre/post scripts (prebuild/postbuild) are automatically grouped!"
