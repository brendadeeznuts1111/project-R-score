#!/bin/bash

# Verify naming consistency across Fire22 workspace system
# Ensures all references use @fire22- for directories and @fire22/ for packages

echo "🔍 Fire22 Naming Consistency Verification"
echo "========================================="
echo ""

# Check 1: Verify all workspace directories use @fire22- prefix
echo "📁 Checking workspace directory naming..."
WORKSPACE_DIRS=$(ls -d workspaces/@fire22-* 2>/dev/null | wc -l)
if [ "$WORKSPACE_DIRS" -eq 6 ]; then
    echo "  ✅ All 6 workspaces use @fire22- prefix for directories"
else
    echo "  ❌ Expected 6 @fire22- prefixed directories, found $WORKSPACE_DIRS"
fi

# Check 2: Verify package.json names use @fire22/ namespace
echo ""
echo "📦 Checking package.json naming..."
for dir in workspaces/@fire22-*/; do
    if [ -f "$dir/package.json" ]; then
        NAME=$(grep '"name"' "$dir/package.json" | head -1 | sed 's/.*"name": *"\([^"]*\)".*/\1/')
        if [[ "$NAME" == "@fire22/"* ]]; then
            echo "  ✅ $(basename "$dir"): $NAME"
        else
            echo "  ❌ $(basename "$dir"): $NAME (should start with @fire22/)"
        fi
    fi
done

# Check 3: Verify root package.json workspace paths
echo ""
echo "🔗 Checking root package.json workspace paths..."
if grep -q '"workspaces/@fire22-' package.json; then
    echo "  ✅ Root package.json uses correct @fire22- paths"
else
    echo "  ❌ Root package.json missing @fire22- workspace paths"
fi

# Check 4: Check for old naming patterns that should be updated
echo ""
echo "⚠️  Checking for legacy naming patterns..."
LEGACY_PATTERNS=(
    "workspaces/pattern-system"
    "workspaces/api-client"
    "workspaces/core-dashboard"
    "workspaces/sports-betting"
    "workspaces/telegram-integration"
    "workspaces/build-system"
)

for pattern in "${LEGACY_PATTERNS[@]}"; do
    COUNT=$(grep -r "$pattern" --include="*.ts" --include="*.js" --include="*.json" --include="*.sh" --include="*.toml" --include="*.html" --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | wc -l)
    if [ "$COUNT" -gt 0 ]; then
        echo "  ⚠️  Found $COUNT references to legacy path: $pattern"
        echo "     Should be: workspaces/@fire22-${pattern#workspaces/}"
    fi
done

# Check 5: Verify bunfig.toml scoped registry
echo ""
echo "⚙️  Checking bunfig.toml configuration..."
if grep -q '@fire22.*fire22.workers.dev/registry' bunfig.toml; then
    echo "  ✅ Fire22 scoped registry configured"
else
    echo "  ⚠️  Fire22 scoped registry not found in bunfig.toml"
fi

# Check 6: Summary
echo ""
echo "📊 Summary"
echo "=========="
echo ""
echo "Directory Convention: @fire22-<name> (e.g., @fire22-pattern-system)"
echo "Package Convention:   @fire22/<name> (e.g., @fire22/pattern-system)"
echo ""
echo "This ensures:"
echo "  • Clear visual distinction between directories and packages"
echo "  • npm scoping works correctly with @fire22/ namespace"
echo "  • File system paths use @fire22- to avoid conflicts"
echo "  • Consistent naming across the entire workspace ecosystem"