#!/bin/bash
# Simple package metadata fixer

echo "🔧 Simple Package Metadata Fixer"
echo "================================"

REPO_URL="https://github.com/brendadeeznuts1111/crystal-clear-architecture.git"

# List of key packages to fix
PACKAGES=(
    "package.json"
    "dashboard-worker/package.json"
    "fire22-core-packages/package.json"
    "fire22-core-packages/packages/middleware/package.json"
    "fire22-core-packages/packages/core/package.json"
    "fire22-core-packages/packages/env-manager/package.json"
    "fire22-benchmarking-suite/package.json"
    "fire22-wager-system/package.json"
    "fire22-wager-system/packages/wager-system/package.json"
)

processed=0
errors=0

for package in "${PACKAGES[@]}"; do
    if [ -f "$package" ]; then
        echo "📦 Processing: $package"

        # Get directory path
        dir_path=$(dirname "$package")
        if [ "$dir_path" = "." ]; then
            dir_path=""
        fi

        # Backup
        cp "$package" "${package}.backup"

        # Update repository
        jq --arg repo "$REPO_URL" --arg dir "$dir_path" '
            .repository = {
                "type": "git",
                "url": $repo,
                "directory": $dir
            }
        ' "$package" > "${package}.tmp" && mv "${package}.tmp" "$package"

        if [ $? -eq 0 ]; then
            echo "✅ Updated: $package"
            ((processed++))
        else
            echo "❌ Failed: $package"
            mv "${package}.backup" "$package"
            ((errors++))
        fi
    else
        echo "⚠️  Not found: $package"
    fi
done

echo ""
echo "🎯 Results:"
echo "==========="
echo "✅ Processed: $processed"
echo "❌ Errors: $errors"
echo ""
echo "🔍 Verification:"
echo "find . -name 'package.json' -not -path '*/node_modules/*' -exec grep -l 'nolarose1968-pixel' {} \\;"
