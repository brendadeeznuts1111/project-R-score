# Benchmark NEXUS API

Run comprehensive benchmarks using NEXUS utils (box, colors, table, timing).

## [instructions]

Run the benchmark script:

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
bun run scripts/bench.ts
```

If the script doesn't exist, create it first, then run benchmarks and report results using:
- `box()` for section headers
- `colors` for status (green=pass, red=fail, yellow=warn)
- `printTable()` for results
- `formatBytes()`, `formatDuration()` for values
- `timing.now()` for nanosecond precision

## [targets]

| Metric | Target | Status |
|--------|--------|--------|
| Cache GET | < 0.5ms avg | |
| Cache SET | < 1ms avg | |
| HTTP /health | < 10ms | |
| HTTP /orca/stats | < 20ms | |
| Memory (10k entries) | < 100MB | |
| Compression ratio | > 50% | |

## [scope]

1. **Cache Operations** - SET/GET with InspectableAPICacheManager
2. **HTTP Endpoints** - /api/health, /api/orca/stats, /api/arbitrage/status
3. **Memory** - /api/debug/memory before/after cache fill
4. **Compression** - Cache compression ratios per exchange
