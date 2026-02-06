# NEXUS Cache Operations

Manage the SQLite + Redis hybrid cache system.

## [instructions]

Inspect and manage the NEXUS cache via API endpoints.

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [endpoints.cache]

```bash
# Cache statistics
curl -s http://localhost:3001/api/cache/stats | jq .

# Clear cache (if endpoint exists)
curl -s http://localhost:3001/api/cache/clear -X POST | jq .
```

## [architecture]

| Layer | Backend | Purpose |
|-------|---------|---------|
| L1 | In-memory | Hot data, < 1ms |
| L2 | SQLite | Persistent, gzip compressed |
| L3 | Redis | Distributed (optional) |

## [config.ttl]

Exchange-specific TTL settings in `src/cache/api-manager.ts`:

| Exchange | TTL | Strategy |
|----------|-----|----------|
| Deribit | 30s | Aggressive |
| Binance | 60s | Standard |
| Polymarket | 120s | Conservative |

## [redis.setup]

Enable Redis cache:

```bash
# Set environment variable
export REDIS_URL="redis://localhost:6379"

# Or in .env
REDIS_URL=redis://localhost:6379
```

## [debugging]

```bash
# Memory usage
curl -s http://localhost:3001/api/debug/memory | jq .

# Check cache in SQLite
sqlite3 data/cache.db "SELECT key, length(value), created_at FROM cache LIMIT 10;"
```
