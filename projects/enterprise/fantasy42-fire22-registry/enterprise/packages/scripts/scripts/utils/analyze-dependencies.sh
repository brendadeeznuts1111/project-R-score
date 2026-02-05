#!/bin/bash

echo "🔍 Fire22 Enterprise Dependency Analysis"
echo "========================================"

echo ""
echo "📦 Direct Dependencies Analysis:"
echo "--------------------------------"

# Check for direct dependencies with no dependents (potential cleanup candidates)
echo "Dependencies with no transitive dependents:"
for pkg in axios typescript express drizzle-orm drizzle-kit; do
    if bun why $pkg | grep -q "No dependents found"; then
        echo "  ✅ $pkg - Direct dependency, good for version control"
    else
        echo "  ⚠️  $pkg - Has transitive dependents"
    fi
done

echo ""
echo "🔄 Version Conflict Analysis:"
echo "-----------------------------"

# Check for version conflicts
echo "Checking for version conflicts..."
if bun why "semver*" | grep -q "semver@"; then
    echo "  ⚠️  Multiple semver versions detected"
    bun why "semver*" | grep "semver@" | head -2
else
    echo "  ✅ No obvious version conflicts"
fi

echo ""
echo "🔗 Complex Dependency Chains:"
echo "-----------------------------"

echo "Webpack ecosystem complexity:"
bun why webpack --top | wc -l | xargs echo "  📊 Lines of dependency info:"

echo ""
echo "@types packages depth:"
bun why "@types/*" --depth 1 | grep -c "@types/" | xargs echo "  📊 @types packages found:"

echo ""
echo "💡 Recommendations:"
echo "-------------------"
echo "1. Monitor webpack circular dependencies for build performance"
echo "2. Review @types package usage for bundle size optimization"
echo "3. Consider consolidating semver versions if possible"
echo "4. Use 'bun why' regularly for dependency hygiene"

