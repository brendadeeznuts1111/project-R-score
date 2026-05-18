#!/bin/bash
# fix-package-metadata.sh
# Automated script to standardize package metadata across all workspaces

set -e  # Exit on any error

echo "🔧 Fire22 Package Metadata Standardization Script"
echo "=================================================="

# Define correct repository URL
REPO_URL="https://github.com/brendadeeznuts1111/crystal-clear-architecture.git"

# Define standard author information
AUTHOR_NAME="Fire22 Development Team"
AUTHOR_EMAIL="dev@fire22.com"
AUTHOR_URL="https://fire22.com"

# Track processed packages
processed=0
errors=0

# Function to update package.json
update_package() {
    local file="$1"
    local dir_path="$2"

    echo "📦 Processing: $file"

    # Create backup
    cp "$file" "${file}.backup"

    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo "❌ jq is required but not installed. Please install jq first."
        echo "   macOS: brew install jq"
        echo "   Ubuntu: sudo apt-get install jq"
        exit 1
    fi

    # Update repository information
    jq --arg repo "$REPO_URL" --arg dir "$dir_path" '
        .repository = {
            "type": "git",
            "url": $repo,
            "directory": $dir
        }
    ' "$file" > "${file}.tmp1"

    # Update author information
    jq --arg author_name "$AUTHOR_NAME" --arg author_email "$AUTHOR_EMAIL" --arg author_url "$AUTHOR_URL" '
        if .author == null then
            .author = {
                "name": $author_name,
                "email": $author_email,
                "url": $author_url
            }
        elif (.author | type) == "string" then
            .author = {
                "name": .author,
                "email": $author_email,
                "url": $author_url
            }
        else
            .author.name = (.author.name // $author_name) |
            .author.email = (.author.email // $author_email) |
            .author.url = (.author.url // $author_url)
        end
    ' "${file}.tmp1" > "${file}.tmp2"

    # Ensure license is set
    jq '.license = (.license // "MIT")' "${file}.tmp2" > "${file}.tmp3"

    # Add standard keywords if missing
    jq 'if .keywords == null or (.keywords | length) == 0 then
            .keywords = ["fire22", "typescript", "bun", "enterprise"]
        else
            .
        end' "${file}.tmp3" > "${file}.tmp"

    if [ $? -eq 0 ]; then
        mv "${file}.tmp" "$file"
        rm -f "${file}.tmp1" "${file}.tmp2" "${file}.tmp3"
        echo "✅ Updated: $file"
        ((processed++))
    else
        echo "❌ Failed to update: $file"
        rm -f "${file}.tmp" "${file}.tmp1" "${file}.tmp2" "${file}.tmp3"
        ((errors++))
    fi
}

# Function to fix package names (add @fire22/ scope where missing)
fix_package_names() {
    local file="$1"

    # Read current name
    local current_name=$(jq -r '.name' "$file" 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$current_name" ]; then
        echo "⚠️  Could not read name from $file"
        return
    fi

    # Check if it needs @fire22/ prefix
    if [[ "$current_name" == fire22-* ]] && [[ "$current_name" != @fire22/* ]]; then
        local new_name="@fire22/${current_name#fire22-}"

        echo "🔄 Renaming: $current_name → $new_name"

        jq --arg new_name "$new_name" '.name = $new_name' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"

        if [ $? -eq 0 ]; then
            echo "✅ Renamed: $file"
        else
            echo "❌ Failed to rename: $file"
            ((errors++))
        fi
    fi
}

echo ""
echo "📋 Finding all package.json files..."
echo ""

# Find and process all package.json files (excluding node_modules and hidden dirs)
find . -name "package.json" -type f \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/.cache/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    | while read -r file; do

    # Get directory path relative to repo root
    dir_path=$(dirname "$file" | sed 's|^\./||')

    # Special case for root package.json
    if [ "$file" = "./package.json" ]; then
        dir_path=""
    fi

    # Update package metadata
    update_package "$file" "$dir_path"

    # Fix package names
    fix_package_names "$file"

done

echo ""
echo "🎯 Processing complete!"
echo "======================"
echo "📦 Packages processed: $processed"
if [ $errors -gt 0 ]; then
    echo "❌ Errors encountered: $errors"
    echo ""
    echo "💡 Check the error messages above for details."
    echo "   Backup files (*.backup) have been created for manual recovery if needed."
fi

echo ""
echo "🔍 Verification Commands:"
echo "========================"
echo "# Check repository URLs are consistent:"
echo "find . -name 'package.json' -exec grep -H 'repository' {} \\; | grep -v 'brendadeeznuts1111/crystal-clear-architecture'"
echo ""
echo "# Check for packages without @fire22/ scope:"
echo "find . -name 'package.json' -exec grep -H '\"name\"' {} \\; | grep -v '@fire22/' | grep -v '\"fire22-'"
echo ""
echo "# Validate all packages:"
echo "bun pm ls"
echo ""
echo "# Test package publishing (dry run):"
echo "bun pm pack --dry-run"

echo ""
echo "🎉 Package metadata standardization complete!"
echo "   Your packages are now enterprise-ready with consistent metadata! 🚀"
