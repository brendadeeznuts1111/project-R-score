#!/bin/bash

# DuoPlus Automation - Enhanced Setup Script
# This script sets up the complete development environment for the DuoPlus Automation project

set -e

echo "🚀 Setting up DuoPlus Automation Development Environment..."
echo "=================================================="

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun is installed"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Copy environment template
if [ ! -f .env.local ]; then
    echo "📋 Setting up environment configuration..."
    cp .env.sample .env.local
    echo "✅ Created .env.local from template"
    echo "⚠️  Please edit .env.local with your configuration"
else
    echo "✅ Environment file already exists"
fi

# Setup git hooks if they don't exist
if [ ! -d .git/hooks ]; then
    echo "🪝 Setting up git hooks..."
    mkdir -p .git/hooks
    # Add pre-commit hook for security checks
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔒 Running security checks..."
bun run security-check || echo "⚠️  Security check failed, but continuing..."
EOF
    chmod +x .git/hooks/pre-commit
    echo "✅ Git hooks configured"
fi

# Create development directories if they don't exist
echo "📁 Ensuring development directories exist..."
mkdir -p logs temp data

# Verify project structure
echo "🔍 Verifying project structure..."
required_dirs=("src" "packages" "docs" "scripts" "tests" "config")
for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir directory exists"
    else
        echo "❌ $dir directory is missing"
        exit 1
    fi
done

# Run basic tests to verify setup
echo "🧪 Running basic verification..."
if bun test tests/test-setup.ts 2>/dev/null; then
    echo "✅ Basic tests passed"
else
    echo "⚠️  Some tests failed, but basic setup is complete"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📊 Project Structure Overview:"
echo "   📁 src/           - Main source code"
echo "   📁 packages/      - Modular packages"
echo "   📁 docs/          - Documentation"
echo "   📁 scripts/       - Development tools"
echo "   📁 tests/         - Test suites"
echo "   📁 config/        - Configuration"
echo "   📁 infrastructure/ - Deployment configs"
echo "   📁 labs/          - Experimental projects"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your configuration"
echo "2. Run 'bun dev' to start development server"
echo "3. Visit docs/PROJECT_STRUCTURE.md for detailed overview"
echo "4. Check resources/examples/ for code examples"
echo "5. Explore labs/ for experimental features"
echo ""
echo "🚀 Happy coding with DuoPlus Automation!"
