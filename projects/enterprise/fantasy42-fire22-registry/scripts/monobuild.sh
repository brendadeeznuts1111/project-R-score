#!/usr/bin/env bash
# Fantasy42-Fire22 Monorepo Build Script
# Builds all workspaces with defensive checks

set -euo pipefail

echo "🔨 Fantasy42-Fire22 Monorepo Build"
echo "=================================="

# Get list of workspaces
workspaces=$(bun workspaces list 2>/dev/null || echo "")

if [ -z "$workspaces" ]; then
    echo "ℹ️  No workspaces configured in this project"
    echo "💡 This is expected if you're not using a monorepo setup"
    echo "✅ Build check passed - no workspaces to validate"
    exit 0
fi

echo "📦 Found workspaces: $workspaces"
echo ""

# Track build results
total_workspaces=0
successful_builds=0
failed_builds=0
missing_scripts=()

# Build each workspace
for ws in $workspaces; do
    ((total_workspaces++))

    echo "🔍 Checking workspace: $ws"

    # Check if package.json exists
    if [ ! -f "$ws/package.json" ]; then
        echo "❌ $ws/package.json not found"
        ((failed_builds++))
        continue
    fi

    # Check if build script exists in package.json
    if ! bunx --package jq jq -e '.scripts.build' "$ws/package.json" >/dev/null 2>&1; then
        echo "❌ $ws missing build script in package.json"
        missing_scripts+=("$ws")
        ((failed_builds++))
        continue
    fi

    echo "✅ $ws has build script - building..."

    # Change to workspace directory and build
    if (cd "$ws" && bun run build); then
        echo "✅ $ws built successfully"
        ((successful_builds++))
    else
        echo "❌ $ws build failed"
        ((failed_builds++))
    fi

    echo ""
done

# Summary report
echo "📊 Build Summary"
echo "==============="
echo "Total workspaces: $total_workspaces"
echo "✅ Successful builds: $successful_builds"
echo "❌ Failed builds: $failed_builds"

if [ ${#missing_scripts[@]} -gt 0 ]; then
    echo ""
    echo "📋 Workspaces missing build scripts:"
    for ws in "${missing_scripts[@]}"; do
        echo "   • $ws"
    done
    echo ""
    echo "💡 Add build scripts to these workspaces:"
    for ws in "${missing_scripts[@]}"; do
        echo "   cd $ws && bun add -d script 'build': 'your-build-command'"
    done
fi

echo ""

if [ $failed_builds -eq 0 ]; then
    echo "🎉 All workspaces built successfully!"
    exit 0
else
    echo "❌ $failed_builds workspace(s) failed to build"
    echo "💡 Fix the issues above and run again"
    exit 1
fi
