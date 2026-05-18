#!/bin/bash

# Bun Setup Helper
# Sets up Bun environment and validates installation

set -e

echo "🐰 Bun Integration Setup"
echo "═══════════════════════════════════════"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun not found. Installing..."
    curl -fsSL https://bun.sh/install | bash
    export PATH=$HOME/.bun/bin:$PATH
    echo "✅ Bun installed. Add this to ~/.zshrc:"
    echo "   export PATH=\$HOME/.bun/bin:\$PATH"
else
    echo "✅ Bun installed"
    bun --version
fi

echo ""
echo "📋 Checking prerequisites..."

# Check for bot binary
if [ ! -f "./target/release/arb-bot" ]; then
    echo "⚠️  Bot binary not found. Build with:"
    echo "   cargo build --release --bin arb-bot"
else
    echo "✅ Bot binary found"
fi

echo ""
echo "🚀 Available Bun commands:"
echo ""
echo "  bun bot-controller.ts    # Start control panel (http://localhost:3000)"
echo "  bun bot-monitor.ts       # Start live dashboard"
echo ""
echo "📡 Example API calls:"
echo ""
echo "  curl http://localhost:3000/api/status"
echo "  curl -X POST http://localhost:3000/api/start"
echo "  curl -X POST http://localhost:3000/api/stop"
echo ""
echo "✅ Setup complete!"
