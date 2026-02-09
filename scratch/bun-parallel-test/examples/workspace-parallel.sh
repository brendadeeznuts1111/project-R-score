#!/usr/bin/env bash
# workspace-parallel.sh — Workspace commands with --if-present
# Features #1-5 (workspace subset) — PR #26551 — New in Bun 1.3.9
#
# Demonstrates workspace-scoped parallel/sequential execution
# with --if-present to skip packages missing the target script.
#
# Run: bash examples/workspace-parallel.sh

set -euo pipefail

echo "=== Workspace Parallel Examples ==="
echo ""

# All workspace packages, single script
echo "# All workspaces, build:"
echo "bun run --parallel --filter '*' build"
echo ""

# All workspaces, multiple scripts (N scripts × M packages)
echo "# All workspaces, multiple scripts:"
echo "bun run --parallel --filter '*' build lint test"
echo ""

# --if-present: skip packages that don't have the script
echo "# Skip packages missing 'lint' (no error):"
echo "bun run --parallel --workspaces --if-present lint"
echo ""

# --no-exit-on-error: let all finish even on failure
echo "# Keep going on failure:"
echo "bun run --parallel --no-exit-on-error --filter '*' test"
echo ""

# Sequential workspace deployment
echo "# Sequential workspace deploy:"
echo "bun run --sequential --workspaces deploy:prod"
echo ""

# Equivalent --filter and --workspaces
echo "# These are equivalent:"
echo "bun run --parallel --filter '*' build"
echo "bun run --parallel --workspaces build"
