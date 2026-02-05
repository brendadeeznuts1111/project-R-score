#!/bin/bash
# Install mcp-bun-docs globally for use with bunx

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_NAME="mcp-bun-docs"

echo "🔧 Installing $PACKAGE_NAME globally..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Get Bun's global bin directory
BUN_GLOBAL_BIN=$(bun pm bin -g 2>/dev/null || echo "$HOME/.bun/bin")

# Create symlink for global access
if [ -d "$BUN_GLOBAL_BIN" ]; then
    echo "📦 Linking to $BUN_GLOBAL_BIN..."
    ln -sf "$SCRIPT_DIR/index.ts" "$BUN_GLOBAL_BIN/mcp-bun-docs"
    ln -sf "$SCRIPT_DIR/index.ts" "$BUN_GLOBAL_BIN/bun-docs-mcp"
    echo "✅ Installed! You can now use:"
    echo "   bunx mcp-bun-docs"
    echo "   bunx bun-docs-mcp"
else
    echo "⚠️  Could not find Bun global bin directory."
    echo "   You can still use: bunx mcp-bun-docs"
    echo "   (bunx will auto-resolve from npm/local packages)"
fi

# Test resolution
echo ""
echo "🧪 Testing bunx resolution..."
if bunx --help &> /dev/null; then
    echo "✅ bunx is available"
    echo "   Try: bunx mcp-bun-docs"
else
    echo "⚠️  bunx not found, but you can use: bun run $SCRIPT_DIR/index.ts"
fi
