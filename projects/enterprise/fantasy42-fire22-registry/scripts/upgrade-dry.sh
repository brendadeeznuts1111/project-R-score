#!/usr/bin/env bash
# Fantasy42-Fire22 Upgrade Dry-Run Script
# Performs dry-run dependency upgrades with optional workspace scoping

set -euo pipefail

# Get workspace filter from argument, default to all workspaces
ws="${1:-*}"

echo "🔍 Fantasy42-Fire22 Upgrade Dry-Run"
echo "===================================="

if [ "$ws" = "*" ]; then
    echo "📦 Checking ALL workspaces for outdated dependencies..."
else
    echo "📦 Checking workspace '@fire22/$ws' for outdated dependencies..."
fi

echo ""

# Run bun outdated with workspace filtering and format output
if ! bun outdated -r --filter="@fire22/$ws" --json >/dev/null 2>&1; then
    echo "ℹ️  No outdated dependencies found or lockfile missing"
    echo "💡 Install dependencies first: bun install"
    exit 0
fi

bun outdated -r --filter="@fire22/$ws" --json \
  | bunx --package jq jq 'map(select(.dependencyType == "dev"))' 2>/dev/null \
  || {
    echo "❌ Failed to check for outdated dependencies"
    echo "💡 Make sure jq is available: bunx --package jq jq --version"
    echo "💡 Or run without jq: bun outdated -r --filter='@fire22/$ws'"
    exit 1
  }

echo ""
echo "✅ Upgrade dry-run completed!"
echo ""
echo "💡 To upgrade dependencies:"
if [ "$ws" = "*" ]; then
    echo "   bun update --filter='@fire22/*'"
else
    echo "   bun update --filter='@fire22/$ws'"
fi
echo ""
echo "💡 To see production dependencies:"
if [ "$ws" = "*" ]; then
    echo "   bun outdated -r --filter='@fire22/*' --json | bunx --package jq jq 'map(select(.dependencyType != \"dev\"))'"
else
    echo "   bun outdated -r --filter='@fire22/$ws' --json | bunx --package jq jq 'map(select(.dependencyType != \"dev\"))'"
fi
