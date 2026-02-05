#!/bin/bash

# Bun Isolated Installs Setup Script
# This script configures Bun for optimal isolated installs usage

set -e

echo "🚀 Setting up Bun isolated installs configuration..."

# Check if bunfig.toml exists
if [ -f "bunfig.toml" ]; then
    echo "⚠️  bunfig.toml already exists. Backing up to bunfig.toml.backup"
    cp bunfig.toml bunfig.toml.backup
fi

# Copy example configuration
if [ -f ".bunfig.toml.example" ]; then
    cp .bunfig.toml.example bunfig.toml
    echo "✅ Copied .bunfig.toml.example to bunfig.toml"
else
    echo "❌ .bunfig.toml.example not found. Creating minimal configuration..."
    cat > bunfig.toml << 'EOF'
# Bun Configuration File
# Isolated installs configuration

configVersion = 1

[install]
linker = "isolated"
cache = true
lockfile = true

[install.isolated]
backend = "auto"
verbose = false
EOF
fi

# Detect OS and suggest optimal backend
OS=$(uname -s)
case $OS in
    Darwin*)
        echo "🍎 macOS detected - clonefile backend will be used for best performance"
        ;;
    Linux*)
        echo "🐧 Linux detected - hardlink backend will be used"
        ;;
    CYGWIN*|MINGW*|MSYS*)
        echo "🪟 Windows detected - hardlink backend will be used"
        ;;
    *)
        echo "❓ Unknown OS - auto backend detection will be used"
        ;;
esac

# Check if .env files exist for registry configuration
if [ -f ".env.local" ] || [ -f ".env" ]; then
    echo "✅ Environment files found for registry configuration"
else
    echo "ℹ️  No .env files found. You may want to create one for registry tokens:"
    echo "   echo 'NPM_AUTH_TOKEN=your_token_here' > .env.local"
fi

# Clean existing node_modules if switching from hoisted to isolated
if [ -d "node_modules" ] && [ ! -d "node_modules/.bun" ]; then
    echo "⚠️  Existing node_modules detected (hoisted installs)"
    read -p "🔄 Clean and reinstall with isolated installs? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🧹 Cleaning existing installation..."
        rm -rf node_modules package-lock.json yarn.lock 2>/dev/null || true
        echo "📦 Installing with isolated installs..."
        bun install --linker isolated
        echo "✅ Installation complete!"
    else
        echo "ℹ️  You can manually reinstall later with: bun install --linker isolated"
    fi
else
    echo "✅ Ready for isolated installs"
fi

# Check for known compatibility issues
echo "🔍 Checking for potential compatibility issues..."

# Check for packages known to have issues with isolated installs
if [ -f "package.json" ]; then
    echo "📦 Analyzing package.json for compatibility..."

    # Check for common problematic patterns
    if grep -q "node_modules/" package.json 2>/dev/null; then
        echo "⚠️  Warning: Found hardcoded node_modules paths in package.json"
        echo "   These may cause issues with isolated installs"
    fi

    # Check for build tools that might have issues
    if grep -q -E "(webpack|rollup|vite)" package.json 2>/dev/null; then
        echo "ℹ️  Build tools detected - most work well with isolated installs"
        echo "   If you encounter issues, try: bun install --linker hoisted"
    fi
fi

echo ""
echo "🛡️  Compatibility Notes:"
echo "   - Most modern packages work perfectly with isolated installs"
echo "   - If you encounter issues, use hoisted mode as fallback"
echo "   - Report persistent issues to help improve Bun"
echo ""

echo ""
echo "🎉 Bun isolated installs setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Update bunfig.toml with your registry configuration"
echo "   2. Set NPM_AUTH_TOKEN in your .env files for private registries"
echo "   3. Run 'bun install' to install dependencies with isolation"
echo ""
echo "🔍 Debug with: bun install --linker isolated --verbose"
