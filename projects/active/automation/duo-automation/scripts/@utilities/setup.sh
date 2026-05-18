#!/bin/bash

# Configuration Management Setup Script
# Quick setup for the duo-automation configuration system

echo "🚀 Configuration Management Setup"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "📦 Step 1: Linking the package locally..."

# Link the package
bun link

echo ""
echo "✅ Package linked successfully as 'windsurf-project'"

echo ""
echo "📝 Step 2: Setting up environment files..."

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    cp config/environment/.env.example .env
    echo "✅ Created .env file from template"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "🧪 Step 3: Running configuration tests..."

# Run the tests to verify everything works
bun test tests/config.test.ts tests/config-manager-fixed.test.ts tests/environment-fixed.test.ts tests/final-verification.test.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed! Configuration system is working correctly."
else
    echo ""
    echo "❌ Some tests failed. Please check the configuration."
    exit 1
fi

echo ""
echo "🎯 Step 4: Running example usage..."

# Run the example to show how it works
bun examples/example-usage.js

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📚 Next Steps:"
echo "1. Edit .env file with your specific values"
echo "2. Import configuration in your project:"
echo "   import { config } from 'windsurf-project/src/config/index.js';"
echo "3. Use the configuration system in your application"
echo ""
echo "📖 For detailed usage, see: SETUP_GUIDE.md"
echo "🧪 To run tests: bun test tests/"
echo "🔧 To unlink: bun unlink windsurf-project"
