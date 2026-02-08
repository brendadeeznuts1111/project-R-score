# Quick Start Guide

## CLI Commands

### Run P2P Benchmarks
```bash
bun cli.ts p2p --gateways venmo,cashapp,paypal --operations create,query,switch --iterations 100
```

### Run Profile Benchmarks
```bash
bun cli.ts profile --operations xgboost_personalize,redis_hll_add,r2_snapshot --iterations 50
```

### Run Combined Benchmarks
```bash
bun cli.ts combined --output combined-results.json
```

## API Endpoints

### Get Data
```bash
# Get P2P data for specific gateway
curl "http://localhost:3008/api/data?scope=p2p&gateway=venmo"

# Get profile data for specific operation
curl "http://localhost:3008/api/data?scope=profile&operation=xgboost_personalize"
```

### Get History
```bash
# Get P2P history
curl "http://localhost:3008/api/history?scope=p2p&gateway=venmo"

# Get profile history
curl "http://localhost:3008/api/history?scope=profile&operation=xgboost_personalize"
```

### Run Benchmarks via API
```bash
curl -X POST "http://localhost:3008/api/p2p/benchmark" \
  -H "Content-Type: application/json" \
  -d '{
    "gateways": ["venmo", "cashapp"],
    "operations": ["create", "query"],
    "iterations": 50
  }'
```

### Get Trends
```bash
# P2P trends
curl "http://localhost:3008/api/p2p/trends?metric=duration_ms&interval=hour&period=24h"

# Profile trends
curl "http://localhost:3008/api/profile/trends?metric=personalization_score&interval=day&period=7d"
```

## Using npm Scripts

```bash
# Run CLI
bun run cli p2p --gateways venmo --operations create --iterations 10

# Run P2P benchmark directly
bun run p2p-benchmark --gateways venmo,cashapp --operations create,query
```

## See Also

- [API Documentation](./API.md) - Complete API reference
- [P2P Benchmark Guide](./P2P_BENCHMARK.md) - Detailed P2P benchmarking guide
