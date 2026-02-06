# NEXUS Performance Benchmarks

Run performance benchmarks for NEXUS components.

## [instructions]

Execute benchmarks to measure performance.

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [commands]

```bash
# Run all benchmarks
bun run bench

# Run specific benchmark file
bun run scripts/bench.ts
```

## [benchmark.areas]

| Component | Metric | Target |
|-----------|--------|--------|
| ORCA Normalize | ops/sec | > 100k |
| UUID Generation | ops/sec | > 500k |
| Cache Lookup | latency | < 1ms |
| API Response | latency | < 10ms |

## [bun.inspect.table]

Bun 1.3+ native table formatting for benchmark results:

```typescript
import { benchmarkTable, printInspectTable } from '@/utils/bun';

// Format benchmark results
const results = [
  { name: 'orca.normalize', ops: 125432, avgMs: 0.008 },
  { name: 'uuid.generate', ops: 892341, avgMs: 0.001 },
  { name: 'cache.get', ops: 1250000, avgMs: 0.0008 },
];
console.log(benchmarkTable(results));

// Raw Bun.inspect.table usage
const data = [
  { asset: 'BTC', price: 97500, change: '+2.5%' },
  { asset: 'ETH', price: 3400, change: '-1.2%' },
];
console.log(Bun.inspect.table(data));

// With specific columns
console.log(Bun.inspect.table(data, ['asset', 'price']));

// With options
console.log(Bun.inspect.table(data, null, { colors: true, sortKeys: true }));
```

## [table.api]

```typescript
// All columns
Bun.inspect.table(tabularData: object[]): string

// Specific columns only
Bun.inspect.table(tabularData: object[], properties: string[]): string

// With colors option
Bun.inspect.table(tabularData: object[], { colors: boolean }): string

// Columns + colors
Bun.inspect.table(tabularData: object[], properties: string[], { colors: boolean }): string
```

## [inspect.custom]

Customize how objects are printed with `Bun.inspect`:

```typescript
import { inspectCustom } from '@/utils/bun';

class Trade {
  constructor(public symbol: string, public price: number) {}

  [inspectCustom]() {
    return `Trade(${this.symbol} @ $${this.price.toLocaleString()})`;
  }
}

const trade = new Trade('BTC', 97500);
console.log(trade);
// => Trade(BTC @ $97,500)
```

## [bun.nanoseconds]

High-precision timing for benchmarks:

```typescript
const start = Bun.nanoseconds();
// ... operation ...
const elapsed = Bun.nanoseconds() - start;
console.log(`${elapsed}ns`); // => 7288958ns
```

## [output.format]

```
┌─────────────────┬──────────┬──────────┬───────┬───────┐
│    Benchmark    │  ops/sec │   avg    │  min  │  max  │
├─────────────────┼──────────┼──────────┼───────┼───────┤
│ orca.normalize  │ 125,432  │ 7.98μs   │ 6μs   │ 12μs  │
│ uuid.generate   │ 892,341  │ 1.12μs   │ 1μs   │ 3μs   │
│ cache.get       │ 1,250,00 │ 0.80μs   │ 0.5μs │ 2μs   │
└─────────────────┴──────────┴──────────┴───────┴───────┘
```

## [memory.table]

```typescript
import { memoryTable } from '@/utils/bun';

// Display formatted memory stats
console.log(memoryTable());
// ┌────────────┬───────────┐
// │   metric   │   value   │
// ├────────────┼───────────┤
// │ Heap Used  │ 12.5 MB   │
// │ Heap Total │ 32.0 MB   │
// │ RSS        │ 48.2 MB   │
// │ External   │ 1.2 MB    │
// └────────────┴───────────┘
```

## [compare.table]

A/B comparison for optimization testing:

```typescript
import { compareTable } from '@/utils/bun';

const before = { ops: 100000, avgMs: 0.01, memory: 1024 };
const after = { ops: 150000, avgMs: 0.007, memory: 980 };

console.log(compareTable('metric', before, after, 'v1', 'v2'));
// ┌────────┬────────┬────────┬────────┐
// │ metric │   v1   │   v2   │  diff  │
// ├────────┼────────┼────────┼────────┤
// │ ops    │ 100000 │ 150000 │ +50.0% │
// │ avgMs  │ 0.01   │ 0.007  │ -30.0% │
// │ memory │ 1024   │ 980    │ -4.3%  │
// └────────┴────────┴────────┴────────┘
```

## [bun.stringWidth]

Unicode-aware string width calculation (handles emojis, ANSI codes):

```typescript
import { stringWidth, padEnd, truncate } from '@/utils/bun';

stringWidth('hello');              // => 5
stringWidth('👋🌍');               // => 4 (each emoji = 2)
stringWidth('\x1b[31mred\x1b[0m'); // => 3 (ANSI ignored)

// Unicode-aware padding
padEnd('BTC 👍', 12);   // Correctly pads accounting for emoji width
truncate('Long text...', 10); // => 'Long tex…'
```

## [stringWidth.benchmarks]

Official benchmarks (i9-13900, Bun 1.0.29):

| Input | Time | ops/sec |
|-------|------|---------|
| 5 chars ASCII | 16.45ns | 60.8M |
| 500 chars ASCII | 37.09ns | 27.0M |
| 5,000 chars ASCII | 216.9ns | 4.6M |
| 7 chars emoji | 54.2ns | 18.5M |
| 700 chars emoji | 3.3µs | 303K |
| 8 chars ANSI+emoji | 66.15ns | 15.1M |
| 19 chars mixed | 135.46ns | 7.4M |

Time unit reference:
- 1ms = 1,000µs = 1,000,000ns
- 16ns = 0.016µs = 0.000016ms

## [profiling]

```bash
# CPU profiling
bun --inspect run scripts/bench.ts

# Memory profiling
bun --smol run scripts/bench.ts
```

## [code.location]

- Bun Utils: `src/utils/bun.ts`
- Benchmarks: `scripts/bench.ts`
