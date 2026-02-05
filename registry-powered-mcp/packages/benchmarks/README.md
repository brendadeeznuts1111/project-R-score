# @registry-mcp/benchmarks

**Standalone benchmark suite for MCP implementations using Bun-native APIs**

Version: 1.0.0
License: MIT

## Features

✅ **Bun-Native** - Built on `Bun.bench()`, `Bun.nanoseconds()`, and `Bun.gc()`
✅ **Versioned** - Independent release cycle with semantic versioning
✅ **Reusable** - Share across all MCP projects via `bun add`
✅ **Type-Safe** - Full TypeScript support with exported types
✅ **Statistical** - p50/p95/p99 percentiles, std dev, coefficient of variation
✅ **Configurable** - Performance targets, warmup, iterations
✅ **Reporters** - Console, JSON, Markdown output formats

## Installation

```bash
# From workspace (monorepo)
bun add @registry-mcp/benchmarks --dev

# From registry
bun add @registry-mcp/benchmarks --registry http://localhost:4873
```

## Quick Start

```typescript
import { bench, suite, PERFORMANCE_TARGETS } from '@registry-mcp/benchmarks';

suite('My Benchmarks', () => {
  bench('fast operation', () => {
    // Your code here
  }, {
    target: PERFORMANCE_TARGETS.DISPATCH_MS,  // 0.03ms target
    iterations: 10000,
  });
});
```

## Performance Targets (v2.4.1 SLA)

| Target | Value | Description |
|:---|:---|:---|
| `DISPATCH_MS` | 0.03ms | URLPattern match + param extraction |
| `REQUEST_CYCLE_P99_MS` | 10.8ms | 99th percentile request time |
| `TOML_PARSE_MS` | 0.05ms | Native TOML parser |
| `BUNDLE_SIZE_KB` | 9.64KB | Minified bundle size |

See [constants.ts](./src/constants.ts) for full list.

## API Reference

### Core Functions

#### `bench(name, fn, options)`

Run a synchronous benchmark.

```typescript
bench('route matching', () => {
  router.match('/test');
}, {
  target: 0.03,        // Target in ms
  iterations: 1000,    // Number of iterations
  warmup: 100,         // Warmup iterations
  category: 'routing', // Category for grouping
});
```

#### `benchAsync(name, fn, options)`

Run an asynchronous benchmark.

```typescript
await benchAsync('load config', async () => {
  await loadConfig();
}, {
  target: 1.0,
});
```

#### `suite(name, fn)`

Group related benchmarks.

```typescript
suite('Routing Benchmarks', () => {
  bench('simple route', ...);
  bench('param route', ...);
});
```

#### `benchMemory(name, fn, options)`

Benchmark with heap profiling.

```typescript
benchMemory('memory test', () => {
  // Code that may allocate memory
}, {
  iterations: 1000,
});
```

### Standard Suites

Pre-built benchmark suites for common patterns:

```typescript
import { routingBenchmarks } from '@registry-mcp/benchmarks/suites/routing';

const router = new LatticeRouter(config);
routingBenchmarks(router);  // Runs 6 standard routing benchmarks
```

### Reporters

```typescript
import { reportToConsole, getBenchmarkResults } from '@registry-mcp/benchmarks';

// Run benchmarks...

const results = getBenchmarkResults();
reportToConsole(results);

// Output:
// ═══════════════════════════════════════════════════
// 📊 BENCHMARK RESULTS
// ═══════════════════════════════════════════════════
//
// 🏷️  ROUTING
// ─────────────────────────────────────────────────
//   ✓ simple route match        0.025ms (target: 0.03ms) [EXCELLENT]
//   ✓ parameterized route       0.028ms (target: 0.03ms) [GOOD]
```

## Statistics

The `BenchmarkStats` class provides comprehensive statistical analysis:

```typescript
import { BenchmarkStats } from '@registry-mcp/benchmarks';

const stats = new BenchmarkStats();

// Add samples
for (let i = 0; i < 1000; i++) {
  stats.start();
  // ... operation ...
  stats.end();
}

// Get metrics
console.log(stats.p50);    // Median
console.log(stats.p95);    // 95th percentile
console.log(stats.p99);    // 99th percentile (SLA)
console.log(stats.mean);   // Average
console.log(stats.stdDev); // Standard deviation
```

## Bun-Native APIs Used

| API | Purpose | Documentation |
|:---|:---|:---|
| `Bun.bench()` | Core benchmarking | [docs](https://bun.sh/docs/cli/test#benchmarks) |
| `Bun.nanoseconds()` | High-precision timing | [docs](https://bun.sh/docs/api/utils#bun-nanoseconds) |
| `Bun.gc()` | Manual GC for memory tests | [docs](https://bun.sh/docs/api/utils#bun-gc) |
| Workspaces | Monorepo management | [docs](https://bun.sh/docs/install/workspaces) |

## Example: Full Benchmark Suite

```typescript
import {
  bench,
  suite,
  PERFORMANCE_TARGETS,
  BENCHMARK_CATEGORIES,
  reportToConsole,
  getBenchmarkResults
} from '@registry-mcp/benchmarks';

suite('Performance Tests', () => {
  bench('URLPattern dispatch', () => {
    pattern.exec('/test');
  }, {
    target: PERFORMANCE_TARGETS.DISPATCH_MS,
    category: BENCHMARK_CATEGORIES.ROUTING,
    iterations: 10000,
  });

  bench('Cookie parsing', () => {
    parseCookie('session=abc123');
  }, {
    target: PERFORMANCE_TARGETS.COOKIE_PARSE_MS,
    category: BENCHMARK_CATEGORIES.COOKIE,
  });
});

// Report results
const results = getBenchmarkResults();
const summary = reportToConsole(results);

// Exit with error if benchmarks failed
if (summary.failed > 0) {
  process.exit(1);
}
```

## CI/CD Integration

```bash
# Run benchmarks and fail if targets not met
bun run benchmarks/run-all.ts

# Or in package.json
{
  "scripts": {
    "bench": "bun run benchmarks/run-all.ts",
    "bench:ci": "bun run benchmarks/run-all.ts --json > bench-results.json"
  }
}
```

## License

MIT
