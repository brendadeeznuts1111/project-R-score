# NEXUS Arbitrage Scanner

Cross-market arbitrage detection across crypto, prediction markets, and sports betting.

## [instructions]

Check arbitrage scanner status and find opportunities.

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [endpoints]

```bash
# Scanner status
curl -s http://localhost:3001/api/arbitrage/status | jq .

# Crypto matcher stats
curl -s http://localhost:3001/api/arbitrage/crypto/stats | jq .

# Extract crypto from prediction question
curl -s http://localhost:3001/api/arbitrage/crypto/extract \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"Will Bitcoin reach $100000 by December 2025?"}' | jq .
```

## [market.types]

| Market | Source | Example |
|--------|--------|---------|
| Crypto Spot | Binance, Bybit, OKX | BTC/USDT price |
| Crypto Options | Deribit | BTC options |
| Prediction | Polymarket, Kalshi | "BTC > $100k" contracts |
| Sports | DraftKings, FanDuel | Game spreads |

## [arbitrage.types]

1. **Cross-Exchange** - Same asset, different prices
2. **Prediction-Spot** - Prediction market vs spot price
3. **Options-Spot** - Synthetic position vs spot
4. **Cross-Book** - Same event, different bookmakers

## [detection.flow]

```
1. Normalize events via ORCA
2. Fetch prices from all venues
3. Calculate implied odds/prices
4. Detect discrepancies > threshold
5. Calculate optimal position sizes
6. Report opportunities
```

## [code.location]

- Scanner: `src/arbitrage/scanner.ts`
- Crypto Matcher: `src/arbitrage/crypto-matcher.ts`
- Routes: `src/api/routes.ts` (Arbitrage section)
