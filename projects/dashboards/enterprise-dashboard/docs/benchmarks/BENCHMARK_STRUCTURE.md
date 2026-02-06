# Benchmark Structure

## Overview

Our benchmark structure is aligned with [Bun's official benchmark directory](https://github.com/oven-sh/bun/tree/main/bench), using Mitata as the benchmarking framework.

## Directory Structure

```text
scripts/bench/
├── package.json          # Benchmark package.json (aligned with Bun's structure)
├── utils.ts              # Mitata wrapper (aligned with Bun's runner.mjs)
├── runner.ts             # Benchmark runner CLI
├── README.md             # Benchmark documentation
├── crc32-bench.ts        # Custom CRC32 benchmark
├── crc32-bench-mitata.ts # Mitata CRC32 benchmark
├── spawn-bench.ts        # Custom spawn benchmark
├── spawn-bench-mitata.ts # Mitata spawn benchmark
├── archive-bench.ts      # Archive creation benchmark
├── archive-bench-mitata.ts # Mitata archive benchmark
├── cold-fetch.ts         # Cold fetch benchmark
├── preconnect-fetch.ts  # Preconnect fetch benchmark
├── parallel-bench.ts     # Parallel operations benchmark
└── compare-preconnect.sh # Comparison script

examples/
├── bun-1.3.6-bench.ts           # Custom comprehensive benchmark
└── bun-1.3.6-bench-mitata.ts    # Mitata comprehensive benchmark
```

**Aligned with Bun's structure**: [github.com/oven-sh/bun/tree/main/bench](https://github.com/oven-sh/bun/tree/main/bench)

**Version Note**: Bun uses `mitata@0.1.14`, we use `mitata@1.0.34` (newer version with improved performance and features, API compatible).

## Benchmark Utilities

### `utils.ts` - Mitata Wrapper

Standardized wrapper matching Bun's `runner.mjs` pattern:

```typescript
import { bench, group, run } from "./utils";

group("My Benchmarks", () => {
  bench("operation", () => {
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

### `runner.ts` - CLI Runner

Command-line runner for executing benchmark files:

```bash
bun scripts/bench/runner.ts examples/bun-1.3.6-bench-mitata.ts
```

## Quick Start

```bash
# Run all benchmarks from project root
bun run bench

# Run with JSON output (CI/CD)
bun run bench:json

# Run from benchmark directory
cd scripts/bench && bun run all
```

## Available Benchmarks

### Mitata-Based (Recommended)

```bash
# Using benchmark package.json (aligned with Bun's structure)
cd scripts/bench
bun run crc32      # CRC32 hardware acceleration
bun run spawn      # Spawn performance
bun run archive    # Archive creation
bun run response   # Response.json benchmarks
bun run all        # All benchmarks
bun run all:json   # All with JSON output

# From project root
bun run bench              # Run all benchmarks
bun run bench:json         # Run all with JSON output

# Individual benchmarks
bun run bench:crc32:mitata      # CRC32 hardware acceleration
bun run bench:spawn:mitata      # Spawn performance
bun run bench:archive:mitata    # Archive creation
bun run bench:mitata            # Comprehensive benchmarks

# All Mitata benchmarks
bun run bench:all:mitata

# JSON output (for CI/CD)
bun run bench:json
```

### Custom Implementations

```bash
# Individual benchmarks
bun run bench:crc32             # CRC32 benchmark
bun run bench:spawn              # Spawn benchmark
bun run bench:archive           # Archive benchmark

# All custom benchmarks
bun run bench:v136
```

## Benchmark Categories

### 1. Response.json() (SIMD FastStringifier)
- Tests SIMD-optimized JSON serialization
- Compares `Response.json()` vs manual `JSON.stringify() + Response()`
- **Improvement**: 3.5x faster in Bun 1.3.6+

### 2. Buffer.indexOf/includes (SIMD Search)
- Tests SIMD-optimized buffer search operations
- Tests both found and not-found scenarios
- **Improvement**: Up to 2x faster in Bun 1.3.6+

### 3. Bun.spawnSync (fd limit optimization)
- Tests spawn performance improvements
- Compares async vs sync spawn
- **Improvement**: 30x faster on Linux ARM64 in Bun 1.3.6+

### 4. Bun.hash.crc32 (Hardware Accelerated)
- Tests hardware-accelerated CRC32 hashing
- Multiple buffer sizes (1KB to 10MB)
- **Improvement**: 20x faster in Bun 1.3.6+

### 5. Archive Creation
- Tests tar/tar.gz creation performance
- **Status**: Fast archive operations

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

For automated benchmarking:

```bash
# Set environment variable for JSON output
export BENCHMARK_RUNNER=1

# Run benchmarks
bun run bench:all:mitata

# Parse JSON output
# Results will be in JSON format for easy parsing
```

## Alignment with Bun's Structure

Our benchmark structure follows Bun's official patterns:

- ✅ Uses Mitata as benchmarking framework
- ✅ Provides JSON output for CI/CD
- ✅ Groups related benchmarks
- ✅ Includes warmup iterations
- ✅ Documents performance improvements
- ✅ Matches Bun's `runner.mjs` pattern

**Reference**: [github.com/oven-sh/bun/tree/main/bench](https://github.com/oven-sh/bun/tree/main/bench)

## Best Practices

1. **Warmup**: Always include warmup iterations before benchmarking
2. **Grouping**: Use `group()` to organize related benchmarks
3. **Consistency**: Use the same benchmark setup across runs
4. **Documentation**: Document what each benchmark measures
5. **Baselines**: Keep baseline measurements for comparison
6. **Mitata**: Prefer Mitata-based benchmarks for better statistics

## Related Documentation

- [`../BUN_1_3_6_IMPROVEMENTS.md`](../BUN_1_3_6_IMPROVEMENTS.md) - Detailed improvements documentation
- [`../BUN_1_3_6_QUICK_REFERENCE.md`](../BUN_1_3_6_QUICK_REFERENCE.md) - Quick reference guide
- [`BUFFER_SIMD_PERFORMANCE.md`](BUFFER_SIMD_PERFORMANCE.md) - Buffer optimizations
- [`RESPONSE_JSON_PERFORMANCE.md`](RESPONSE_JSON_PERFORMANCE.md) - Response.json optimizations
