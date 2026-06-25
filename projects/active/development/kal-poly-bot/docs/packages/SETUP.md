# 🚀 Setup Guide - Polymarket-Kalshi Arbitrage Bot

## ✅ What's Already Done

- ✅ Repository cloned to `/Users/nolarose/Projects/kal-poly-bot/poly-kalshi-arb`
- ✅ Rust toolchain installed (v1.92.0)
- ✅ Binary compiled (in progress via LTO optimization)
- ✅ `.env` configuration file created with all variables
- ✅ `dotenvx` installed for environment management
- ✅ `run.sh` script created for easy startup

## 📝 Step 1: Fill in Your Credentials

Edit `.env` with your actual credentials:

```bash
nano .env
```

### Kalshi Setup
1. Go to [kalshi.com](https://kalshi.com)
2. Login → Settings → API Keys
3. Create a new API key with trading permissions
4. Download the private key (PEM file)
5. Copy the **API Key ID** into `.env`:
   ```
   KALSHI_API_KEY_ID=your_actual_key_id
   KALSHI_PRIVATE_KEY_PATH=/path/to/your/kalshi_private_key.pem
   ```

### Polymarket Setup
1. Create or import an Ethereum wallet (use MetaMask)
2. Export your private key from MetaMask:
   - MetaMask → Account Details → Export Private Key
   - Copy the key (should start with `0x`)
3. Fund your wallet on **Polygon network** with USDC (testnet or mainnet)
4. Copy into `.env`:
   ```
   POLY_PRIVATE_KEY=0xyour_actual_private_key
   POLY_FUNDER=0xyour_wallet_address
   ```

## 🧪 Step 2: Test with Dry Run (Paper Trading)

```bash
cd /Users/nolarose/Projects/kal-poly-bot/poly-kalshi-arb
./run.sh
```

This runs with `DRY_RUN=1`, so **no real trades will execute**. Perfect for testing!

### What to Expect
- Bot connects to both Kalshi and Polymarket WebSockets
- Monitors real-time price feeds
- Logs arbitrage opportunities detected
- Prints heartbeat every 60 seconds showing:
  - Markets with prices
  - Best arbitrage opportunity (gap from $1.00)
  - Fee calculations

## 🔍 Step 3: Monitor Output

Look for messages like:
```text
💓 Heartbeat | Markets: 45 total, 35 w/Kalshi, 40 w/Poly, 30 w/Both | threshold=1¢
📊 Best: Will Trump win the 2024 US... | P_yes(42¢) + K_no(56¢) + K_fee(2¢) = 100¢ | gap=0¢
```

## ⚡ Step 4: Enable Live Trading (CAREFULLY!)

Once you're confident, edit `.env`:
```text
DRY_RUN=0
```

Then run:
```bash
RUST_LOG=info ./run.sh
```

**⚠️ WARNING**: This will execute real trades with real money!

Recommended first settings:
```text
DRY_RUN=0
CB_MAX_DAILY_LOSS=1000      # Stop after losing $10
CB_MAX_POSITION_PER_MARKET=50  # Max 50 contracts per market
RUST_LOG=debug             # Verbose logging for monitoring
```

## 🛡️ Circuit Breaker Safety Limits

The bot has built-in risk limits:

| Variable | Default | Meaning |
|----------|---------|---------|
| `CB_ENABLED` | true | Enable safety limits |
| `CB_MAX_POSITION_PER_MARKET` | 100 | Max 100 contracts per market |
| `CB_MAX_TOTAL_POSITION` | 500 | Max 500 contracts total |
| `CB_MAX_DAILY_LOSS` | 5000 | Stop after losing $50 |
| `CB_MAX_CONSECUTIVE_ERRORS` | 5 | Halt after 5 API errors |

## 📊 Understanding Arbitrage

The bot profits when:
```text
Best YES price (Platform A) + Best NO price (Platform B) < $1.00
```

**Example**:
- Kalshi YES: 42¢
- Polymarket NO: 56¢
- Kalshi fee: ~2¢
- **Total cost**: 100¢ → Buy both sides → Guaranteed $1.00 payout
- **Profit**: 0¢ on this one (break-even with fees)

Better opportunities:
- Kalshi YES: 40¢
- Polymarket NO: 55¢
- Fee: 2¢
- Total: 97¢ → **$3 profit per contract!**

## 🧬 Four Arbitrage Types

| Type | Strategy |
|------|----------|
| `poly_yes_kalshi_no` | Buy YES on Polymarket + NO on Kalshi |
| `kalshi_yes_poly_no` | Buy YES on Kalshi + NO on Polymarket |
| `poly_same_market` | Buy both YES+NO on Polymarket (rare, 0% fees) |
| `kalshi_same_market` | Buy both YES+NO on Kalshi (fees apply both sides) |

## 🧪 Test Mode

To test without real credentials:
```bash
TEST_ARB=1 DRY_RUN=0 ./run.sh
```

This injects fake arbitrage opportunities so you can see the full execution path.

## 📈 Monitoring

### Real-time Logs
```bash
# Very detailed logging
RUST_LOG=debug ./run.sh

# Quiet logging
RUST_LOG=warn ./run.sh
```

### View Cached Markets
```bash
cat .clob_market_cache.json | jq '.' | less
cat .discovery_cache.json | jq '.' | less
```

### Check Positions
```bash
cat positions.json | jq '.'
```

## 🔧 Troubleshooting

### "Connection refused"
- Check WebSocket endpoints are accessible
- Verify network connectivity

### "No markets found"
```bash
FORCE_DISCOVERY=1 ./run.sh
```

### "Invalid API credentials"
- Double-check `.env` values
- Verify Kalshi API key has trading permissions
- Ensure Polymarket private key starts with `0x`

### "Circuit breaker tripped"
- Check `CB_MAX_DAILY_LOSS` - you may have hit loss limit
- Review `RUST_LOG=debug` output for detailed errors
- Wait `CB_COOLDOWN_SECS` before restart

### Telegram Issues
- Bot not sending: Check TOKEN/CHAT_ID in .env, bot admin in supergroup
- No topics: Use "general":0 or create topics
- Test: http://localhost:3000 → Test Telegram button

## 📚 Resources

- [Polymarket Docs](https://polymarket.com/)
- [Kalshi Docs](https://kalshi.com/)
- [Bot Architecture](README.md#architecture)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

**Good luck trading! 🎯 Bot + Telegram ready!**
