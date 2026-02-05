#!/bin/bash
# === QUICK START GUIDE ===
# Polymarket-Kalshi Arbitrage Bot

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ✅ SETUP COMPLETE! Your Arbitrage Bot is Ready                             ║
║                                                                              ║
║  📦 Binary:    /Users/nolarose/Projects/kal-poly-bot/poly-kalshi-arb/       ║
║              target/release/arb-bot (6.4MB)                                 ║
║                                                                              ║
║  🔧 Runtime:   Rust 1.92.0 + Cargo + dotenvx                               ║
║                                                                              ║
║  🛠️  Status:    ✅ Building ✅ Configuration ⏳ Credentials                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🚀 GETTING STARTED (5 MINUTES)
═══════════════════════════════════════════════════════════════════════════════

STEP 1️⃣  - Get Your API Keys & Wallet
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📱 KALSHI API KEY:
     1. Go to: https://kalshi.com/settings/api-keys
     2. Click "Create API Key"
     3. Save the Key ID (looks like: abc123...)
     4. Download the PEM file
     5. Copy full path to PEM file

  🪙 POLYMARKET WALLET:
     1. Use MetaMask or similar Ethereum wallet
     2. Switch to Polygon network
     3. Fund with USDC (testnet or mainnet)
     4. MetaMask → Account Details → Export Private Key
     5. Copy the key (starts with 0x)
     6. Save your wallet address (0x...)

STEP 2️⃣  - Configure Credentials
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Edit the .env file with your real values:

    cd /Users/nolarose/Projects/kal-poly-bot/poly-kalshi-arb
    nano .env

  Replace these lines:
    KALSHI_API_KEY_ID=your_actual_key_id_here
    KALSHI_PRIVATE_KEY_PATH=/full/path/to/kalshi_private_key.pem
    POLY_PRIVATE_KEY=0xyour_ethereum_private_key_here
    POLY_FUNDER=0xyour_wallet_address_here

  ⚠️  SECURITY: Never commit .env to git!
     (.env is already in .gitignore ✓)

STEP 3️⃣  - Test with Paper Trading
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Run with DRY_RUN=1 (no real trades):

    cd /Users/nolarose/Projects/kal-poly-bot/poly-kalshi-arb
    ./run.sh

  Expected output:

    🎯 Arb Bot v2.0
       Threshold: <99.5¢ for 0.5% profit
       Leagues: [SPY, USDT, BTC, ETH, ...]
       Mode: DRY RUN (no real orders)

    [KALSHI] Connecting to WebSocket...
    [POLYMARKET] Creating async client...
    🔍 Discovering markets...
    📊 Discovery complete: 142 market pairs found

    💓 Heartbeat | Markets: 142 total, 95 w/Kalshi, 120 w/Poly, 75 w/Both
    📊 Best: Will Bitcoin hit $100k? | P_yes(42¢) + K_no(56¢) = 98¢ | gap=-2¢

STEP 4️⃣  - Monitor for Opportunities
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  The bot logs every 60 seconds. Look for:

    ✅ Markets with prices from both exchanges
    ✅ Best arbitrage gaps (negative = profitable!)
    ✅ Arb detection when gap < threshold

  Example profitable arb:
    💰 NEW ARB DETECTED!
       Buy YES on Polymarket (40¢) + NO on Kalshi (56¢) = 96¢
       Profit: $0.04 per contract, executing 50 contracts
       Expected P&L: +$2.00 (before fees)

STEP 5️⃣  - Go Live (OPTIONAL - HIGH RISK!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  ONLY AFTER TESTING WITH DRY_RUN=1 FOR SEVERAL HOURS!

  Edit .env:
    DRY_RUN=0

  ⚠️  START WITH CONSERVATIVE LIMITS:
    CB_MAX_DAILY_LOSS=1000         # $10 max loss
    CB_MAX_POSITION_PER_MARKET=25  # Small positions
    RUST_LOG=debug                 # Detailed logging

  Then:
    ./run.sh

═══════════════════════════════════════════════════════════════════════════════
📚 COMMAND REFERENCE
═══════════════════════════════════════════════════════════════════════════════

  # Test with synthetic arbitrage
  TEST_ARB=1 DRY_RUN=0 ./run.sh

  # Force market re-discovery
  FORCE_DISCOVERY=1 ./run.sh

  # Verbose debugging
  RUST_LOG=debug ./run.sh

  # View cached market data
  cat .clob_market_cache.json | jq '.'

  # View positions
  cat positions.json | jq '.'

  # Kill the bot gracefully
  Ctrl+C (once or twice)

═══════════════════════════════════════════════════════════════════════════════
🛡️  SAFETY LIMITS (Circuit Breaker)
═══════════════════════════════════════════════════════════════════════════════

  These limits are automatically enforced:

  • CB_MAX_POSITION_PER_MARKET=100    → Max 100 contracts per market
  • CB_MAX_TOTAL_POSITION=500         → Max 500 contracts total
  • CB_MAX_DAILY_LOSS=5000            → Stop after losing $50
  • CB_MAX_CONSECUTIVE_ERRORS=5       → Halt after 5 API errors
  • CB_COOLDOWN_SECS=60               → Wait 60s after circuit breaker trips

  All can be customized in .env

═══════════════════════════════════════════════════════════════════════════════
🤖 HOW THE BOT WORKS
═══════════════════════════════════════════════════════════════════════════════

  1. Connects to Kalshi and Polymarket WebSockets
  2. Tracks real-time price updates
  3. Detects arbitrage: YES_price + NO_price < $1.00
  4. Calculates fees and profit margin
  5. Executes orders on both platforms concurrently
  6. Tracks positions and P&L
  7. Enforces circuit breaker limits

  Example:
    Market: "Will Trump win 2024?"

    Kalshi:     YES=42¢, NO=59¢
    Polymarket: YES=41¢, NO=59¢

    Bot detects: Buy Poly YES (41¢) + Kalshi NO (59¢) = 100¢
    = No profit (break-even with fees)

    Better: Buy Poly YES (40¢) + Kalshi NO (56¢) = 96¢
    = $4 profit per contract! ✅ Executes order

═══════════════════════════════════════════════════════════════════════════════
🐛 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════════════

  ❌ "cargo not found"
     → Run: source ~/.zshrc
     → Or close/reopen terminal

  ❌ "No such file: kalshi_private_key.pem"
     → Check path in .env matches your actual file location
     → Use absolute path: /Users/nolarose/path/to/file.pem

  ❌ "Invalid API credentials"
     → Verify Key ID in .env matches Kalshi dashboard
     → Verify PEM file is correct (download fresh from Kalshi)
     → Check Polymarket private key starts with 0x

  ❌ "Connection refused"
     → Check internet connection
     → Verify WebSocket endpoints are accessible
     → Try: FORCE_DISCOVERY=1 ./run.sh

  ❌ "Circuit breaker tripped"
     → Increase CB_MAX_DAILY_LOSS in .env
     → Or wait CB_COOLDOWN_SECS before restarting

═══════════════════════════════════════════════════════════════════════════════
📊 EXPECTED PROFITS
═══════════════════════════════════════════════════════════════════════════════

  Typical arbitrage opportunities: 0.5% - 2% per trade
  Fees: ~0.5% - 1% (Kalshi fees, Polymarket free)
  Net profit: 0% - 1.5% per trade

  Realistic example:
  • Find arb with 2% profit margin
  • Execute 50 contracts at $0.42 average price = $21 capital
  • Fees: ~$0.10
  • Profit: $0.42 - $0.10 = $0.32 (1.5%)
  • Per trade P&L: $16 per trade

  With multiple trades per hour: $50-200/day (market dependent)

═══════════════════════════════════════════════════════════════════════════════
✨ YOU'RE READY!
═══════════════════════════════════════════════════════════════════════════════

  ✅ Binary compiled
  ✅ Shell configured
  ✅ Tools installed (Rust, Cargo, dotenvx)
  ✅ Run script ready
  ✅ Safety limits configured

  Next: Add credentials → Test → Trade!

  Questions? See:
  • ./SETUP.md - Detailed setup guide
  • ../SETUP_STATUS.md - Full status
  • ../BUN_RUST_SETUP.md - Bun integration (optional)

  Good luck! 🚀

EOF
