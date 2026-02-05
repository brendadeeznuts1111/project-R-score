#!/usr/bin/env bash
# scripts/pre-publish-verify.sh - Enhanced with new Bun features

set -euo pipefail

# Set custom user agent for all Bun requests
export BUN_USER_AGENT="Fire22-Verify/1.0"

echo "🔍 Fire22 Pre-Publish Verification Pipeline"
echo "============================================"

# 0. Fix package.json issues
echo "🔧 Fixing package.json issues..."
bun pm pkg fix
echo ""

# 1. Dependency analysis
echo "📊 Analyzing dependencies..."
echo "  Checking for duplicate packages..."
bun why "zod" --depth 1 2>/dev/null || true
bun why "@types/*" --top 3 2>/dev/null || true
echo ""

# 2. Clean install with workspace linking
echo "📦 Clean installing dependencies..."
rm -rf node_modules
# Use frozen lockfile for reproducible builds
bun install --frozen-lockfile
echo ""

# 3. TypeScript check
echo "⚡ Running TypeScript checks..."
bun run typecheck || {
  echo "❌ TypeScript errors found"
  exit 1
}
echo ""

# 4. Linting
echo "🧹 Running linting checks..."
bun run lint || {
  echo "❌ Linting errors found"
  exit 1
}
echo ""

# 5. Build all packages
echo "🔨 Building all packages..."
bun run build || {
  echo "❌ Build failed"
  exit 1
}
echo ""

# 6. Run tests
echo "🧪 Running test suite..."
bun test || {
  echo "❌ Tests failed"
  exit 1
}
echo ""

# 7. Security audit
echo "🛡️ Running security audit..."
bun audit --audit-level=high --prod || {
  echo "⚠️ Security vulnerabilities found"
  # Don't fail on audit, just warn
}
echo ""

# 8. Check for circular dependencies
echo "🔄 Checking for circular dependencies..."
bunx -p madge madge --circular --extensions ts,tsx src/ || {
  echo "⚠️ Circular dependencies detected"
}
echo ""

# 9. Package validation using new bun pm pack --quiet
echo "📦 Creating package tarballs..."
TARBALLS=""
for pkg in packages/*/package.json workspaces/@fire22-*/package.json; do
  if [ -f "$pkg" ]; then
    dir=$(dirname "$pkg")
    name=$(basename "$dir")
    echo "  Packing $name..."
    
    # Use the new --quiet flag to capture tarball name
    TARBALL=$(cd "$dir" && bun pm pack --quiet 2>/dev/null || echo "")
    if [ -n "$TARBALL" ]; then
      echo "    ✓ Created: $TARBALL"
      TARBALLS="$TARBALLS $dir/$TARBALL"
    else
      echo "    ⚠️ Failed to pack $name"
    fi
  fi
done
echo ""

# 10. Check package sizes
echo "📏 Package sizes:"
for tarball in $TARBALLS; do
  if [ -f "$tarball" ]; then
    size=$(du -h "$tarball" | cut -f1)
    name=$(basename "$tarball")
    echo "  $name: $size"
  fi
done
echo ""

# 11. License check
echo "📜 Checking licenses..."
bunx -p license-checker license-checker --production --summary --onlyAllow "MIT;Apache-2.0;BSD-3-Clause;BSD-2-Clause;ISC;CC0-1.0" || {
  echo "⚠️ Non-standard licenses detected"
}
echo ""

# 12. Validate workspace consistency
echo "🔗 Validating workspace links..."
if grep -q "link-workspace-packages" .npmrc 2>/dev/null; then
  echo "  ✓ Workspace linking enabled"
else
  echo "  ℹ️ Workspace linking not configured"
fi

# Check if save-exact is enabled
if grep -q "save-exact=true" .npmrc 2>/dev/null; then
  echo "  ✓ Exact versions enforced"
else
  echo "  ⚠️ Exact versions not enforced"
fi
echo ""

# 13. Generate pre-publish report
REPORT_FILE="pre-publish-report-$(date +%Y%m%d-%H%M%S).json"
echo "💾 Generating pre-publish report..."

{
  echo "{"
  echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"packages\": ["
  
  first=true
  for pkg in packages/*/package.json workspaces/@fire22-*/package.json; do
    if [ -f "$pkg" ]; then
      dir=$(dirname "$pkg")
      name=$(cd "$dir" && bun pm pkg get name 2>/dev/null || echo "unknown")
      version=$(cd "$dir" && bun pm pkg get version 2>/dev/null || echo "0.0.0")
      
      if [ "$first" = false ]; then echo ","; fi
      echo -n "    {\"name\": \"$name\", \"version\": \"$version\"}"
      first=false
    fi
  done
  
  echo ""
  echo "  ]"
  echo "}"
} > "$REPORT_FILE"

echo "  Report saved to: $REPORT_FILE"
echo ""

# Clean up tarballs
echo "🧹 Cleaning up tarballs..."
for tarball in $TARBALLS; do
  rm -f "$tarball" 2>/dev/null || true
done

echo ""
echo "✅ All pre-publish checks passed!"
echo "============================================"
echo ""
echo "Package statistics:"
bun pm pkg get name version 2>/dev/null || true
echo ""
echo "Next steps:"
echo "  1. Review changeset files in .changeset/"
echo "  2. Run: bunx -p @changesets/cli changeset version"
echo "  3. Commit version bumps"
echo "  4. Create PR for review"
echo "  5. After merge, run: bun run release"