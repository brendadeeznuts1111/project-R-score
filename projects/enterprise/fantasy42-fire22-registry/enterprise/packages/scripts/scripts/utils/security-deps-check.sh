#!/bin/bash

echo "🔒 Fire22 Security Dependency Analysis"
echo "======================================"

echo ""
echo "🚨 Potential Security Concerns:"
echo "-------------------------------"

# Check for packages with many dependencies (potential attack surface)
echo "Packages with complex dependency trees:"
echo "  Webpack ecosystem: $(bun why "webpack*" --depth 1 | grep -c "webpack\|terser\|workbox") packages"
echo "  Babel ecosystem: $(bun why "@babel/*" --depth 1 | grep -c "@babel/") packages"
echo "  TypeScript types: $(bun why "@types/*" --depth 1 | grep -c "@types/") packages"

echo ""
echo "📦 Bundle Size Analysis:"
echo "------------------------"

# Analyze bundle impact
echo "Heavy dependencies to monitor:"
bun why "webpack" --top | head -3
bun why "typescript" --top | head -3

echo ""
echo "🔍 Orphaned Dependencies Check:"
echo "-------------------------------"

# Find potentially unused direct dependencies
echo "Direct dependencies with no dependents:"
for pkg in axios typescript express drizzle-orm drizzle-kit; do
    if bun why $pkg 2>/dev/null | grep -q "No dependents found"; then
        echo "  �� $pkg - Consider usage audit"
    fi
done

echo ""
echo "⚡ Performance Recommendations:"
echo "-------------------------------"
echo "1. $(bun why "@types/*" | grep -c "@types/") @types packages found - consider tree-shaking"
echo "2. Webpack shows $(bun why "webpack" | grep -c "peer") peer dependencies"
echo "3. $(bun why "semver*" | grep -c "semver@") semver versions - potential consolidation"

echo ""
echo "🛡️ Security Recommendations:"
echo "----------------------------"
echo "• Regular 'bun why' audits for new dependencies"
echo "• Monitor webpack ecosystem updates"
echo "• Review @types package necessity"
echo "• Audit direct dependencies quarterly"
