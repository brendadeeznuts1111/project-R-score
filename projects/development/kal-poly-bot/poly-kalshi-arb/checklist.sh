#!/bin/bash
# Quick setup checklist for the arbitrage bot

echo "🎯 Polymarket-Kalshi Arbitrage Bot - Quick Checklist"
echo "===================================================="
echo ""

PROJECT_DIR="/Users/nolarose/Projects/kal-poly-bot/poly-kalshi-arb"
cd "$PROJECT_DIR"

# 1. Check binary
echo "1️⃣  Binary Build Status"
if [ -f "target/release/arb-bot" ]; then
    echo "   ✅ Binary compiled: $(ls -lh target/release/arb-bot | awk '{print $5}')"
else
    echo "   ⏳ Building... (check: ps aux | grep cargo)"
fi
echo ""

# 2. Check .env
echo "2️⃣  Configuration (.env)"
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    echo ""
    echo "   Variables set:"
    grep -E "^[A-Z_]+=" .env | grep -v "^#" | sed 's/=.*//' | sort | sed 's/^/      - /'
    echo ""
else
    echo "   ❌ .env file missing"
fi
echo ""

# 3. Check for placeholder values
echo "3️⃣  Credentials Check"
if grep -q "your_kalshi_api_key_id\|0xYOUR_WALLET_PRIVATE_KEY\|/path/to" .env; then
    echo "   ⚠️  Placeholder values found - need your real credentials:"
    echo ""
    if grep -q "your_kalshi_api_key_id" .env; then
        echo "      - [ ] Set KALSHI_API_KEY_ID"
    fi
    if grep -q "your_kalshi_api_key_id" .env; then
        echo "      - [ ] Set KALSHI_PRIVATE_KEY_PATH"
    fi
    if grep -q "0xYOUR_WALLET_PRIVATE_KEY" .env; then
        echo "      - [ ] Set POLY_PRIVATE_KEY"
    fi
    if grep -q "0xYOUR_WALLET_ADDRESS" .env; then
        echo "      - [ ] Set POLY_FUNDER"
    fi
    echo ""
else
    echo "   ✅ All credentials appear to be set"
fi
echo ""

# 4. Check dotenvx
echo "4️⃣  Environment Loader"
if which dotenvx > /dev/null 2>&1; then
    echo "   ✅ dotenvx installed: $(dotenvx --version)"
else
    echo "   ⚠️  dotenvx not in PATH"
    echo "      Run: export PATH=\$HOME/.local/bin:\$PATH"
fi
echo ""

# 5. Check Rust
echo "5️⃣  Rust Toolchain"
if which rustc > /dev/null 2>&1; then
    echo "   ✅ Rust installed: $(rustc --version)"
else
    echo "   ❌ Rust not found"
fi
echo ""

# 6. Helpful next steps
echo "6️⃣  Next Steps"
echo "   [ ] 1. Wait for binary build to complete"
echo "   [ ] 2. Edit .env with your real credentials"
echo "   [ ] 3. Run: ./run.sh  (or: DRY_RUN=1 ./run.sh)"
echo "   [ ] 4. Monitor logs for arbitrage opportunities"
echo "   [ ] 5. Test with DRY_RUN=0 on small position sizes"
echo ""

# 7. Quick links
echo "7️⃣  Documentation"
echo "   📖 Setup guide: cat SETUP.md"
echo "   📋 Full status: cat ../SETUP_STATUS.md"
echo "   🔧 Run script: ./run.sh"
echo ""

echo "=========================================="
echo "✨ Everything ready! Add credentials to .env and go!"
echo ""
