# Deribit Options Integration

Work with Deribit crypto options and derivatives data.

## [instructions]

Query Deribit index prices, options expirations, and volatility data.

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [endpoints]

```bash
# BTC Index Price
curl -s http://localhost:3001/api/deribit/index/btc | jq .

# ETH Index Price
curl -s http://localhost:3001/api/deribit/index/eth | jq .

# BTC Options Expirations
curl -s http://localhost:3001/api/deribit/expirations/BTC | jq .

# ETH Options Expirations
curl -s http://localhost:3001/api/deribit/expirations/ETH | jq .

# Options Chain (specific expiry)
curl -s "http://localhost:3001/api/deribit/options/BTC?expiry=2025-01-31" | jq .
```

## [data.structure]

Index response:
```json
{
  "asset": "BTC",
  "price": 97500.25,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

Expiration response:
```json
{
  "expirations": [
    "2025-01-17",
    "2025-01-24",
    "2025-01-31"
  ]
}
```

## [options.greeks]

Available Greeks per option:
- Delta
- Gamma
- Theta
- Vega
- Implied Volatility

## [cache.strategy]

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Index | 30s | Fast-moving |
| Expirations | 5m | Rarely changes |
| Options Chain | 60s | Balance freshness/load |

## [code.location]

- Provider: `src/providers/deribit.ts`
- Routes: `src/api/routes.ts` (Deribit section)
