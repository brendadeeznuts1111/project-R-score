#!/bin/bash
# Fix all packages in crystal-clear-architecture directory

echo "🔧 Fixing Crystal Clear Architecture Packages"
echo "=============================================="

REPO_URL="https://github.com/brendadeeznuts1111/crystal-clear-architecture.git"

processed=0
errors=0

# Find all package.json files in crystal-clear-architecture
find crystal-clear-architecture -name "package.json" -type f \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" | while read -r file; do

    echo "📦 Processing: $file"

    # Get directory path relative to repo root
    dir_path=$(echo "$file" | sed 's|crystal-clear-architecture/||' | xargs dirname)
    if [ "$dir_path" = "." ]; then
        dir_path=""
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
