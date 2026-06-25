# Usage Examples

Complete examples for using the Dev Dashboard CLI and API.

## CLI Examples

### P2P Benchmarks

```bash
# Basic P2P benchmark
bun cli.ts p2p --gateways venmo,cashapp,paypal --operations create,query,switch --iterations 100

# With dry-run and full lifecycle
bun cli.ts p2p --gateways venmo,cashapp --operations create --iterations 50 --include-dry-run --include-full

# JSON output
bun cli.ts p2p --gateways venmo --operations create,query --iterations 10 --json --output results.json

# Compare mode
bun cli.ts p2p --gateways venmo,cashapp,paypal --operations create --iterations 20 --compare

# Summary statistics
bun cli.ts p2p --gateways venmo,cashapp --operations create,query,switch --iterations 100 --summary
```

### Profile Benchmarks

```bash
# Basic profile benchmark
bun cli.ts profile --operations xgboost_personalize,redis_hll_add,r2_snapshot --iterations 50

# Custom operations
bun cli.ts profile --operations create,query,update --iterations 100

# JSON output
bun cli.ts profile --operations xgboost_personalize --iterations 25 --json --output profile-results.json
```

**Note:** Profile benchmarks require the dashboard server to be running. Use the API endpoints instead for standalone execution.

### Combined Benchmarks

```bash
# Run both P2P and profile benchmarks
bun cli.ts combined --output combined-results.json

# JSON output
bun cli.ts combined --json --output combined-results.json
```

## API Examples

### Get Data

```bash
# Get all data
curl "http://localhost:3008/api/data"

# Get P2P data only
curl "http://localhost:3008/api/data?scope=p2p"

# Get P2P data for specific gateway
curl "http://localhost:3008/api/data?scope=p2p&gateway=venmo"

# Get profile data for specific operation
curl "http://localhost:3008/api/data?scope=profile&operation=xgboost_personalize"

# Force refresh (bypass cache)
curl "http://localhost:3008/api/data?refresh=true"
```

### Get History

```bash
# Get all history (last 24 hours)
curl "http://localhost:3008/api/history"

# Get P2P history
curl "http://localhost:3008/api/history?scope=p2p"

# Get P2P history for specific gateway
curl "http://localhost:3008/api/history?scope=p2p&gateway=venmo"

# Get profile history for specific operation
curl "http://localhost:3008/api/history?scope=profile&operation=xgboost_personalize"

# Get history for last 7 days
curl "http://localhost:3008/api/history?hours=168"
```

### Run Benchmarks via API

```bash
# Run P2P benchmarks
curl -X POST "http://localhost:3008/api/p2p/benchmark" \
  -H "Content-Type: application/json" \
  -d '{
    "gateways": ["venmo", "cashapp"],
    "operations": ["create", "query"],
    "iterations": 50
  }'

# Run P2P benchmarks with all options
curl -X POST "http://localhost:3008/api/p2p/benchmark" \
  -H "Content-Type: application/json" \
  -d '{
    "gateways": ["venmo", "cashapp", "paypal"],
    "operations": ["create", "query", "switch", "dry-run", "full"],
    "iterations": 100,
    "includeDryRun": true,
    "includeFull": true
  }'
```

### Get Metrics

```bash
# Get P2P metrics
curl "http://localhost:3008/api/p2p/metrics"

# Get P2P metrics for specific gateway
curl "http://localhost:3008/api/p2p/metrics?gateway=venmo&hours=48"

# Get profile metrics
curl "http://localhost:3008/api/profile/metrics"

# Get profile metrics for specific operation
curl "http://localhost:3008/api/profile/metrics?operation=xgboost_personalize&hours=48"
```

### Get Trends

```bash
# P2P duration trends (last 24 hours, hourly intervals)
curl "http://localhost:3008/api/p2p/trends?metric=duration_ms&interval=hour&period=24h"

# P2P trends for specific gateway
curl "http://localhost:3008/api/p2p/trends?metric=duration_ms&interval=hour&period=24h&gateway=venmo"

# P2P trends for specific operation
curl "http://localhost:3008/api/p2p/trends?metric=duration_ms&interval=day&period=7d&operation=create"

# Profile personalization score trends (last 7 days, daily intervals)
curl "http://localhost:3008/api/profile/trends?metric=personalization_score&interval=day&period=7d"

# Profile model accuracy trends
curl "http://localhost:3008/api/profile/trends?metric=model_accuracy&interval=hour&period=24h"

# Profile CPU time trends
curl "http://localhost:3008/api/profile/trends?metric=cpu_time_ms&interval=hour&period=24h"

# Profile memory trends
curl "http://localhost:3008/api/profile/trends?metric=peak_memory_mb&interval=day&period=7d"
```

### Health Check

```bash
# Get dashboard health status
curl "http://localhost:3008/api/health"
```

## Using with jq

For better JSON formatting, use `jq`:

```bash
# Install jq (macOS)
brew install jq

# Pretty print JSON responses
curl -s "http://localhost:3008/api/data?scope=p2p&gateway=venmo" | jq

# Extract specific fields
curl -s "http://localhost:3008/api/p2p/metrics" | jq '.metrics[0]'

# Count results
curl -s "http://localhost:3008/api/history?scope=p2p" | jq '.p2p | length'
```

## Using with JavaScript/TypeScript

```typescript
// Run P2P benchmark
const response = await fetch('http://localhost:3008/api/p2p/benchmark', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gateways: ['venmo', 'cashapp'],
    operations: ['create', 'query'],
    iterations: 50
  })
});

const data = await response.json();
console.log('Results:', data.results);
console.log('Summary:', data.summary);

// Get trends
const trendsResponse = await fetch(
  'http://localhost:3008/api/p2p/trends?metric=duration_ms&interval=hour&period=24h'
);
const trends = await trendsResponse.json();
console.log('Trends:', trends.trends);
```

## Testing Script

Use the provided test script to verify all endpoints:

```bash
# Make sure dashboard server is running first
bun src/enhanced-dashboard.ts

# In another terminal, run tests
./test-api.sh
```

## See Also

- [API Documentation](./API.md) - Complete API reference
- [Quick Start Guide](./QUICK_START.md) - Quick reference
- [P2P Benchmark Guide](./P2P_BENCHMARK.md) - Detailed P2P benchmarking
