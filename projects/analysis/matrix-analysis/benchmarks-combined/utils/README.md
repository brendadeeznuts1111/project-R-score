# Benchmark Utilities

This directory contains benchmark utilities and scripts for measuring performance improvements in Bun 1.3.6+.

**Aligned with Bun's official benchmark structure**: [github.com/oven-sh/bun/tree/main/bench](https://github.com/oven-sh/bun/tree/main/bench)

**Note**: We use `mitata@1.0.34` (newer) vs Bun's `mitata@0.1.14` for improved performance and features. API is fully compatible.

## Quick Start

```bash
# Run all benchmarks from project root
bun run bench

# Run with JSON output (CI/CD)
bun run bench:json

# Run from benchmark directory
cd scripts/bench && bun run all
```

## Benchmark Utilities

### `utils.ts` - Mitata Wrapper

Standardized benchmark wrapper using [Mitata](https://github.com/evanwashere/mitata):

```typescript
import { bench, group, run } from "./utils";

group("My Benchmarks", () => {
  bench("operation 1", () => {
    // benchmark code
  });
  
  bench("operation 2", () => {
    // benchmark code
  });
});

await run();
```

**Features**:
- Automatic JSON output when `BENCHMARK_RUNNER=1` is set
- Standardized benchmark format
- Grouped benchmarks for better organization
- Statistical analysis (min, max, p75, p99)

## Available Benchmarks

### Bun 1.3.6 Performance Benchmarks

**Using Mitata** (recommended):
```bash
bun run bench:mitata
```

**Using custom implementation**:
```bash
bun examples/bun-1.3.6-bench.ts
```

**JSON output** (for CI/CD):
```bash
bun run bench:mitata:json
```

### Individual Benchmarks

**Mitata-based (recommended)**:
- `bench:crc32:mitata` - CRC32 hardware acceleration (20x faster)
- `bench:spawn:mitata` - Bun.spawnSync performance (30x faster on Linux ARM64)
- `bench:all:mitata` - All Mitata benchmarks combined

**Custom implementations**:
- `bench:crc32` - CRC32 hardware acceleration (20x faster)
- `bench:spawn` - Bun.spawnSync performance (30x faster on Linux ARM64)
- `bench:archive` - Archive creation performance
- `bench:v136` - All v1.3.6 benchmarks combined

## Benchmark Results

### Response.json() (SIMD FastStringifier)
- `Response.json()`: ~10.95 µs/iter
- `JSON.stringify + Response`: ~11.48 µs/iter
- **Status**: ✅ SIMD optimized

### Buffer.indexOf/includes (SIMD search)
- `indexOf (found)`: ~8.13 µs/iter
- `indexOf (not found)`: ~20.20 µs/iter
- `includes (found)`: ~7.93 µs/iter
- `includes (not found)`: ~9.56 µs/iter
- **Status**: ✅ SIMD optimized (up to 2x faster)

### Bun.spawnSync (fd limit optimization)
- `Bun.spawnSync(['true'])`: ~1.28 ms/iter
- **Status**: ✅ Fixed 30x slowdown on Linux ARM64

### Bun.hash.crc32 (hardware accelerated)
- `Bun.hash.crc32 (1MB)`: ~102.74 µs/iter
- **Throughput**: ~9.7 GB/s
- **Status**: ✅ Hardware accelerated (20x faster)

## Creating New Benchmarks

### Using Mitata (Recommended)

```typescript
import { bench, group, run } from "./utils";

group("My Feature Benchmarks", () => {
  bench("fast operation", () => {
    // Your code here
  });
  
  bench("slow operation", () => {
    // Your code here
  });
});

await run();
```

### Using Custom Implementation

```typescript
function bench(name: string, fn: () => void, iterations = 10_000) {
  // Warmup
  for (let i = 0; i < 100; i++) fn();
  
  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = (Bun.nanoseconds() - start) / 1e6;
  
  return { name, elapsed, opsPerMs: iterations / elapsed };
}
```

## CI/CD Integration

For automated benchmarking in CI/CD:

```bash
# Set environment variable for JSON output
export BENCHMARK_RUNNER=1

# Run benchmarks
bun run bench:mitata

# Parse JSON output
# Results will be in JSON format for easy parsing
```

## Best Practices

1. **Warmup**: Always include warmup iterations before benchmarking
2. **Grouping**: Use `group()` to organize related benchmarks
3. **Consistency**: Use the same benchmark setup across runs
4. **Documentation**: Document what each benchmark measures
5. **Baselines**: Keep baseline measurements for comparison

## Related Documentation

- [`../../docs/BUN_1_3_6_IMPROVEMENTS.md`](../../docs/BUN_1_3_6_IMPROVEMENTS.md) - Detailed improvements documentation
- [`../../docs/BUN_1_3_6_QUICK_REFERENCE.md`](../../docs/BUN_1_3_6_QUICK_REFERENCE.md) - Quick reference guide
- [`../../docs/benchmarks/BUFFER_SIMD_PERFORMANCE.md`](../../docs/benchmarks/BUFFER_SIMD_PERFORMANCE.md) - Buffer optimizations
- [`../../docs/benchmarks/RESPONSE_JSON_PERFORMANCE.md`](../../docs/benchmarks/RESPONSE_JSON_PERFORMANCE.md) - Response.json optimizations
