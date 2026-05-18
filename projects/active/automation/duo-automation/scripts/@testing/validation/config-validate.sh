#!/bin/bash

# Configuration Validation Script
# Validates the entire configuration management system

echo "🔍 Configuration Validation"
echo "=========================="

# Check if configuration files exist
echo "📁 Checking configuration files..."

config_files=(
    "src/config/index.ts"
    "src/config/ports.ts"
    "config/environment/.env.example"
    "config/environment/.env.development"
    "config/environment/.env.production"
)

missing_files=()
for file in "${config_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ All configuration files present"
else
    echo "❌ Missing configuration files:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

# Run configuration tests
echo ""
echo "🧪 Running configuration tests..."

bun test tests/config.test.ts tests/final-verification.test.ts --silent

if [ $? -eq 0 ]; then
    echo "✅ All configuration tests passed"
else
    echo "❌ Configuration tests failed"
    exit 1
fi

echo ""
echo "🎉 Configuration Validation Complete!"
echo "✅ All checks passed - system is ready for production"
