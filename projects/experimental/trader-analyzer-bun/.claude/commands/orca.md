# ORCA Identity Normalization

Work with the ORCA (Omnibus Reference for Canonical Assets) identity layer.

## [instructions]

ORCA provides deterministic UUIDv5-based canonical IDs for events across all venues.

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [endpoints]

```bash
# ORCA statistics
curl -s http://localhost:3001/api/orca/stats | jq .

# List sports
curl -s http://localhost:3001/api/orca/sports | jq .

# List bookmakers
curl -s http://localhost:3001/api/orca/bookmakers | jq .

# Normalize event
curl -s http://localhost:3001/api/orca/normalize \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Lakers vs Celtics",
    "sport": "basketball",
    "league": "NBA",
    "date": "2025-01-15"
  }' | jq .

# Batch normalize
curl -s http://localhost:3001/api/orca/normalize/batch \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {"event": "Lakers vs Celtics", "sport": "basketball"},
      {"event": "Chiefs vs Eagles", "sport": "football"}
    ]
  }' | jq .
```

## [canonical.id.format]

UUIDv5 generation:

```
Namespace: ORCA_NAMESPACE (fixed UUID)
Input: normalized_event_string
Output: Deterministic UUID
```

Example:
- Event: "los angeles lakers vs boston celtics"
- Sport: "basketball"
- Canonical ID: `a1b2c3d4-e5f6-5a7b-8c9d-0e1f2a3b4c5d`

## [supported.venues]

| Category | Venues |
|----------|--------|
| Sports | DraftKings, FanDuel, BetMGM, Caesars, etc. |
| Prediction | Polymarket, Kalshi |
| Crypto | Deribit, Binance, Bybit |

## [code.location]

- Normalizer: `src/orca/normalizer.ts`
- Canonical IDs: `src/orca/canonical.ts`
- Routes: `src/api/routes.ts` (ORCA section)
