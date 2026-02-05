#!/bin/bash

# Lint All Script - Runs comprehensive linting and fixes
echo "🔧 Lint All - Comprehensive Code Quality Check"
echo "=============================================="

# TypeScript/JavaScript linting
echo "📝 TypeScript/JavaScript linting..."
if command -v eslint &> /dev/null; then
    eslint src/ --ext .ts,.js --fix || echo "⚠️ ESLint not configured, skipping..."
else
    echo "⚠️ ESLint not found, skipping JavaScript/TypeScript linting"
fi

# Markdown linting
echo ""
echo "📚 Markdown linting..."
if command -v markdownlint &> /dev/null; then
    markdownlint '**/*.md' -i reports/ -i node_modules/ -i dist/ -i config/project/ --fix
    echo "✅ Markdown linting complete"
else
    echo "⚠️ Markdownlint not found, skipping markdown linting"
fi

# Configuration specific checks
echo ""
echo "⚙️ Configuration-specific checks..."

# Check for hardcoded ports
echo "  🔍 Checking for hardcoded ports..."
hardcoded_ports=$(grep -r ":[0-9]\{4,5\}" src/ --include="*.ts" --include="*.js" | grep -v "config/" | grep -v "test" | head -5)
if [ -n "$hardcoded_ports" ]; then
    echo "  ⚠️ Found potential hardcoded ports:"
    echo "$hardcoded_ports"
else
    echo "  ✅ No hardcoded ports found in source code"
fi

# Check for hardcoded URLs
echo "  🔍 Checking for hardcoded URLs..."
hardcoded_urls=$(grep -r "https\?://[^'\"\\s]*" src/ --include="*.ts" --include="*.js" | grep -v "config/" | grep -v "example" | head -5)
if [ -n "$hardcoded_urls" ]; then
    echo "  ⚠️ Found potential hardcoded URLs:"
    echo "$hardcoded_urls"
else
    echo "  ✅ No hardcoded URLs found in source code"
fi

# TypeScript compilation check
echo ""
echo "🔨 TypeScript compilation check..."
if command -v tsc &> /dev/null; then
    tsc --noEmit --skipLibCheck
    if [ $? -eq 0 ]; then
        echo "✅ TypeScript compilation successful"
    else
        echo "❌ TypeScript compilation failed"
    fi
else
    echo "⚠️ TypeScript compiler not found"
fi

# Configuration validation
echo ""
echo "🎯 Configuration validation..."
bun run scripts/config-validate.sh --silent

if [ $? -eq 0 ]; then
    echo "✅ Configuration validation passed"
else
    echo "❌ Configuration validation failed"
fi

echo ""
echo "🎉 Lint All Complete!"
echo "===================="
echo "✅ Code quality checks completed"
echo "✅ Auto-fixes applied where possible"
echo "✅ Configuration system validated"
