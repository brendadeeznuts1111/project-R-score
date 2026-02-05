#!/bin/bash

# Quick Setup Script for Configuration Management
echo "🚀 Configuration Management Quick Setup"
echo "======================================="

# Step 1: Link the package
echo ""
echo "📦 Step 1: Linking package..."
bun link > /dev/null 2>&1
echo "✅ Package linked as 'windsurf-project'"

# Step 2: Create environment file
echo ""
echo "📝 Step 2: Setting up environment..."
if [ ! -f ".env" ]; then
    cp config/environment/.env.example .env
    echo "✅ Created .env file from template"
else
    echo "ℹ️  .env file already exists"
fi

# Step 3: Run core tests
echo ""
echo "🧪 Step 3: Testing core functionality..."
bun test tests/config.test.ts tests/final-verification.test.ts > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Core configuration system working!"
else
    echo "❌ Core tests failed"
    exit 1
fi

# Step 4: Show example
echo ""
echo "🎯 Step 4: Configuration system demo..."
bun examples/example-usage.js | head -20

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📚 Usage:"
echo "  import { config } from 'windsurf-project/src/config/index.js';"
echo "  console.log(config.ports.webServer);"
echo ""
echo "🔧 Configure: Edit .env file with your values"
echo "🧪 Test: bun test tests/config.test.ts"
echo "📖 Guide: See SETUP_GUIDE.md"
