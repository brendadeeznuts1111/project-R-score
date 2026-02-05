#!/bin/bash
# Quick Start: Bun Workspace Registry Setup
# This script runs all setup steps in sequence

set -e  # Exit on error

echo "🚀 Bun Workspace Registry Quick Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check token
echo "📝 Step 1: Checking registry token..."
if [ -z "$GRAPH_NPM_TOKEN" ] || [ "$GRAPH_NPM_TOKEN" = "your-token-here" ]; then
    echo "❌ Error: GRAPH_NPM_TOKEN not set"
    echo "   Set it with: export GRAPH_NPM_TOKEN='your-token'"
    exit 1
fi
echo "✅ GRAPH_NPM_TOKEN is set"
echo ""

# Step 2: Validate workspace dependencies
echo "🔍 Step 2: Validating workspace dependencies..."
bun run validate:workspace
echo ""

# Step 3: Install dependencies
echo "📦 Step 3: Installing dependencies..."
echo "   (workspace:* resolves automatically)"
bun install
echo ""

# Step 4: Show publish info
echo "📤 Step 4: Publish packages (manual)"
echo "   To publish: VERSION=1.4.0 bun run publish:registry"
echo ""

# Step 5: Show CI config
echo "🔄 Step 5: CI Configuration"
echo "   Test with workspaces disabled:"
echo "   BUN_WORKSPACES_DISABLED=1 bun install && bun test"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Quick start complete!"
echo ""
