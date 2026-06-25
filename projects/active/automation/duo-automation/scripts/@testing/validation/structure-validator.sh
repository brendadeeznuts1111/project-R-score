#!/bin/bash
# scripts/validation/structure-validator.sh
# Unified directory structure validator

MODE=${1:-"standard"}

echo "🔍 Validating project structure in [$MODE] mode..."

validate_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1 exists"
    else
        echo "❌ $1 MISSING"
    fi
}

CHECK_DIRS=("src" "scripts" "utils" "config" "bench" "docs")

for dir in "${CHECK_DIRS[@]}"; do
    validate_dir "$dir"
done

if [ "$MODE" == "full" ]; then
    echo "Running deep structure validation..."
    # Additional checks for nested dirs
    validate_dir "src/core"
    validate_dir "scripts/setup"
    validate_dir "scripts/maintenance"
fi

echo "🎉 Validation complete."