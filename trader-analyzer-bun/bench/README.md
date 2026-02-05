# Benchmarks Directory

**Last Updated**: 2025-01-08  
**Status**: ✅ Active Benchmark Suite

---

## Overview

The `bench/` directory contains performance benchmarks for critical system components. Benchmarks help establish performance baselines, detect regressions, and validate optimizations.

---

## Quick Start

### Run All Benchmarks

```bash
# Via root package.json
bun run bench

# Via bench directory
cd bench && bun run all
```

### Run Individual Benchmarks

```bash
# Error normalization (defensive error handling)
bun run bench:error-normalization

# URLPattern performance
bun run bench/url-pattern-performance.ts

# Correlation engine
cd bench && bun run correlation

# Tick ingestion
bun run bench/ticks.bench.ts

# Binary manifest
cd bench && bun run binary-manifest

# Telegram API
cd bench && bun run telegram

# SQLite operations
cd bench && bun run sqlite

# Bun SQL
cd bench && bun run bun-sql

# CSV parsing
cd bench && bun run csv

# Position calculation
cd bench && bun run position

# HTTP server
cd bench && bun run http

# Fetch operations
cd bench && bun run fetch
```

---

## Benchmark Files

| File | Purpose | Key Metrics |
|------|---------|-------------|
| `error-normalization.ts` | Defensive error handling performance | normalizeError(), getErrorMessage(), logError() |
| `url-pattern-performance.ts` | URLPattern vs regex routing | Pattern matching, route registration |
| `ticks.bench.ts` | Tick ingestion throughput | Ticks/sec, database write performance |
| `correlation-engine.ts` | Multi-layer correlation performance | Graph building, correlation detection |
| `binary-manifest.ts` | Binary manifest encoding/decoding | Encoding speed, compression ratio |
| `telegram.ts` | Telegram API performance | Message sending, rate limits |
| `sqlite.ts` | SQLite operations | Query performance, transaction speed |
| `bun-sql.ts` | Bun.SQL performance | Query execution, prepared statements |
| `csv-parse.ts` | CSV parsing performance | Parse speed, memory usage |
| `position-calc.ts` | Position calculation | Calculation speed, accuracy |
| `http-server.ts` | HTTP server performance | Request handling, throughput |
| `fetch.ts` | Fetch API performance | Request/response speed |
| `connection-reuse-performance.ts` | Connection pooling | Connection reuse, latency |

---

## Benchmark Runner

The `runner.ts` file provides a unified benchmark runner using `mitata`:

```typescript
import { bench, group, execute } from "./runner";

// Define benchmark
bench("operation name", () => {
  // Benchmark code
});

// Execute all benchmarks
await execute();
```

### JSON Output Mode

For CI/CD integration, use JSON output:

```bash
BENCHMARK_RUNNER=1 bun run bench/error-normalization.ts
```

---

## Performance Targets

### Error Normalization (`error-normalization.ts`)

- `normalizeError()`: **~0.02ms per call**
- `getErrorMessage()`: **~0.01ms per call**
- `logError()`: **~0.05ms per call** (includes JSON serialization)

**Trade-off**: `+0.05ms per error vs never crashing on malformed errors = massive reliability win`

### Tick Ingestion (`ticks.bench.ts`)

- Target: **50,000 ticks/sec**
- Configurable via `--rate=` flag

### URLPattern (`url-pattern-performance.ts`)

- Pattern matching: Should be comparable to regex
- Route registration: Should scale linearly

---

## Benchmark Best Practices

### 1. Warmup Phase

Always include a warmup phase to ensure JIT optimization:

```typescript
const WARMUP_ITERATIONS = 1_000;

function warmup() {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    // Warmup code
  }
}
```

### 2. Multiple Iterations

Use sufficient iterations for accurate measurements:

```typescript
const ITERATIONS = 100_000; // For micro-benchmarks
```

### 3. Clean Test Data

Clean up test databases and files:

```typescript
if (existsSync(TEST_DB_PATH)) {
  unlinkSync(TEST_DB_PATH);
  unlinkSync(TEST_DB_PATH + "-wal");
  unlinkSync(TEST_DB_PATH + "-shm");
}
```

### 4. Use Bun.nanoseconds()

For high-precision timing:

```typescript
const start = Bun.nanoseconds();
// ... operation ...
const end = Bun.nanoseconds();
const durationMs = (end - start) / 1_000_000;
```

### 5. Report Results Clearly

Include:
- Per-call timing
- Total iterations
- Performance comparison vs targets
- Trade-off analysis (if applicable)

---

## Integration with CI/CD

Benchmarks can be integrated into CI/CD pipelines:

```yaml
# .github/workflows/benchmark.yml
- name: Run error normalization benchmark
  run: bun run bench:error-normalization
```

---

## Related Documentation

- [Benchmarks README](../benchmarks/README.md) - Performance benchmarking system
- [Bun HMR Error Handling](../docs/BUN-HMR-ERROR-HANDLING.md) - Error handling patterns
- [Version & Metadata Standards](../docs/VERSION-METADATA-STANDARDS.md) - Code standards
- [Bun v1.51 Impact Analysis](../docs/BUN-V1.51-IMPACT-ANALYSIS.md) - Performance optimizations

---

## Scripts Reference

All benchmarks are available via `bench/package.json` scripts:

```json
{
  "scripts": {
    "error-normalization": "bun run error-normalization.ts",
    "correlation": "bun run correlation-engine.ts",
    "binary-manifest": "bun run binary-manifest.ts",
    "telegram": "bun run telegram.ts",
    "sqlite": "bun run sqlite.ts",
    "bun-sql": "bun run bun-sql.ts",
    "csv": "bun run csv-parse.ts",
    "position": "bun run position-calc.ts",
    "http": "bun run http-server.ts",
    "fetch": "bun run fetch.ts",
    "all": "bun run csv && bun run position && bun run sqlite && bun run bun-sql"
  }
}
```

---

**Status**: ✅ Active Benchmark Suite  
**Maintained By**: NEXUS Team
