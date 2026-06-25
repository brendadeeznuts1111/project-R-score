#!/bin/bash

# Playwriter Skill Installer for Kimi CLI
# This script installs the playwriter skill globally

set -e

echo "🎭 Installing Playwriter Skill for Kimi CLI"
echo ""

# Check for bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun found: $(bun --version)"
echo ""

# Install playwriter globally
echo "📦 Installing playwriter CLI..."
bun add -g playwriter
echo "✅ Playwriter CLI installed"
echo ""

# Install the skill wrapper
echo "📦 Installing skill wrapper..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bun link "$SCRIPT_DIR"
echo "✅ Skill wrapper linked"
echo ""

# Check for Chrome
echo "🌐 Checking Chrome installation..."
if command -v google-chrome &> /dev/null || command -v chrome &> /dev/null || [ -d "/Applications/Google Chrome.app" ]; then
    echo "✅ Chrome found"
else
    echo "⚠️  Chrome not found. Please install Google Chrome:"
    echo "   https://www.google.com/chrome/"
fi
echo ""

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "   1. Install Chrome Extension:"
echo "      https://chrome.google.com/webstore/detail/playwriter/..."
echo ""
echo "   2. Click the extension icon on any tab (turns green when connected)"
echo ""
echo "   3. Test the installation:"
echo "      playwriter session new"
echo ""
echo "Usage:"
echo "   bunx @factorywager/playwriter-skill <command>"
echo "   playwriter-skill <command>"
echo ""
echo "For help:"
echo "   bunx @factorywager/playwriter-skill --help"
