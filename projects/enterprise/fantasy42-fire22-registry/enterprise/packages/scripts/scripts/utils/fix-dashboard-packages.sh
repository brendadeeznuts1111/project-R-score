#!/bin/bash
# Fix all dashboard-worker packages

echo "🔧 Fixing Dashboard Worker Packages"
echo "===================================="

REPO_URL="https://github.com/brendadeeznuts1111/crystal-clear-architecture.git"

processed=0
errors=0

# Find all package.json files in dashboard-worker that don't have the correct repo URL
find dashboard-worker -name "package.json" -type f \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" | while read -r file; do

    # Check if it already has the correct repo URL
    if grep -q "nolarose1968-pixel" "$file"; then
        echo "✅ Already correct: $file"
        continue
    fi

    echo "📦 Processing: $file"

    # Get directory path relative to repo root
    dir_path="dashboard-worker/$(basename "$(dirname "$file")")"
    if [ "$dir_path" = "dashboard-worker/dashboard-worker" ]; then
        dir_path="dashboard-worker"
    fi

    # Backup
    cp "$file" "${file}.backup"

    # Update repository
    jq --arg repo "$REPO_URL" --arg dir "$dir_path" '
        .repository = {
            "type": "git",
            "url": $repo,
            "directory": $dir
        }
    ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"

    if [ $? -eq 0 ]; then
        echo "✅ Updated: $file"
        ((processed++))
    else
        echo "❌ Failed: $file"
        mv "${file}.backup" "$file"
        ((errors++))
    fi

done

echo ""
echo "🎯 Results:"
echo "==========="
echo "✅ Processed: $processed"
echo "❌ Errors: $errors"
