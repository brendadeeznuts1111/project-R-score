#!/bin/bash
# Polymarket-Kalshi Arbitrage Bot - Quick Start

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "🎯 Polymarket-Kalshi Arbitrage Bot Setup"
echo "========================================"
echo ""

# Check if binary exists
BINARY="$PROJECT_DIR/target/release/arb-bot"
if [ ! -f "$BINARY" ]; then
    echo "❌ Binary not found at $BINARY"
    echo "Building release binary (this may take 5-15 minutes)..."
    echo ""
    source $HOME/.cargo/env
    cargo build --release --bin arb-bot
    echo ""
    echo "✅ Build complete!"
fi

# Check .env file
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "❌ .env file not found"
    echo "Please create .env with your credentials"
    exit 1
fi

# Check required credentials
missing_creds=false

if grep -q "KALSHI_API_KEY_ID=your_kalshi_api_key_id" .env; then
    echo "⚠️  KALSHI_API_KEY_ID not set in .env"
    missing_creds=true
fi

if grep -q "POLY_PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY" .env; then
    echo "⚠️  POLY_PRIVATE_KEY not set in .env"
    missing_creds=true
fi

if [ "$missing_creds" = true ]; then
    echo ""
    echo "📝 Edit .env file and add your real credentials:"
    echo "   1. Kalshi: Settings → API Keys"
    echo "   2. Polymarket: Export from MetaMask"
    echo "   3. Fund your Polygon wallet with USDC"
    echo ""
    exit 1
fi

# Verify binary executable
if [ ! -x "$BINARY" ]; then
    chmod +x "$BINARY"
fi

# Run bot
echo "🚀 Starting Arbitrage Bot..."
echo ""
echo "Current config:"
echo "  DRY_RUN=$(grep DRY_RUN .env | cut -d= -f2 || echo '1')"
echo "  RUST_LOG=$(grep 'RUST_LOG=' .env | cut -d= -f2 || echo 'info')"
echo ""

export PATH=$HOME/.local/bin:$PATH
dotenvx run -- "$BINARY"
