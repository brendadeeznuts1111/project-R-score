#!/usr/bin/env bash
# scripts/update-dev-deps.sh - Enhanced with new Bun features

set -euo pipefail

# Set custom user agent for all Bun requests
export BUN_USER_AGENT="Fire22-Upgrade-Script/1.0"

echo "🔍 Fire22 Dev Dependencies Update"
echo "================================="
echo ""

# 1. Fix any package.json issues first
echo "🔧 Fixing package.json issues..."
bun pm pkg fix || echo "⚠️ No issues to fix"
echo ""

# 2. Check why certain packages are installed
echo "📊 Dependency analysis..."
echo "  Checking for duplicate dev dependencies..."
bun why "eslint" --depth 1 2>/dev/null || true
bun why "@types/*" --top 3 2>/dev/null || true
echo ""

# 3. Check outdated dev dependencies
echo "📋 Outdated dev dependencies:"
bun outdated -r --filter="@fire22/*" | grep -E "(dev)" || echo "  All dev dependencies up to date"
echo ""

# 4. Update specific dev dependencies
echo "🔄 Updating dev dependencies..."

DEV_DEPS=("eslint" "wrangler" "@types/node" "@typescript-eslint/eslint-plugin" "@typescript-eslint/parser")

for dep in "${DEV_DEPS[@]}"; do
  echo "  → Checking $dep..."
  
  # Use bun why to see if it's installed
  if bun why "$dep" --depth 0 &>/dev/null; then
    echo "    Updating $dep across all workspaces..."
    bun update -r --filter="@fire22/*" "$dep" 2>/dev/null || echo "    ⚠️ Update failed for $dep"
  else
    echo "    ⏭️ $dep not installed, skipping..."
  fi
done

echo ""
echo "📦 Installing updates with exact versions..."
# save-exact is now set in .npmrc
bun install --frozen-lockfile

echo ""
echo "🔧 Updating package.json scripts if needed..."
# Add or update common scripts using bun pm pkg
bun pm pkg set scripts.lint="eslint . --ext .ts,.tsx,.js,.jsx" 2>/dev/null || true
bun pm pkg set scripts.lint:fix="eslint . --ext .ts,.tsx,.js,.jsx --fix" 2>/dev/null || true
bun pm pkg set scripts.typecheck="tsc --noEmit" 2>/dev/null || true

echo ""
echo "🧹 Running linting with auto-fix..."
bun run lint:fix || echo "⚠️ Linting auto-fix encountered issues"

echo ""
echo "🔍 Running strict linting check..."
bun run lint || echo "⚠️ Linting check found issues"

echo ""
echo "⚡ Checking TypeScript compatibility..."
bun run typecheck || echo "⚠️ TypeScript check found issues"

echo ""
echo "📊 Final dependency status:"
bun why "eslint" --depth 0 2>/dev/null || true
echo ""

echo "✅ Dev dependency update complete!"
echo ""
echo "Next steps:"
echo "  • Run 'bun why <package>' to trace dependency chains"
echo "  • Run 'bun outdated -r' to verify all updates"
echo "  • Run 'bun pm pkg get scripts' to see all scripts"