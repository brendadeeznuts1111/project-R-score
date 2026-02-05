# Bun Benchmark Structure Alignment

## Overview

Our benchmark structure is now aligned with [Bun's official benchmark directory](https://github.com/oven-sh/bun/tree/main/bench), following their organizational patterns and using Mitata as the benchmarking framework.

## Structure Comparison

### Bun's Structure
```
bench/
├── package.json          # Benchmark dependencies and scripts
├── runner.mjs            # Mitata wrapper
├── ffi/                  # FFI benchmarks
├── log/                  # Logging benchmarks
├── gzip/                 # Compression benchmarks
├── async/                # Async operation benchmarks
├── sqlite/               # SQLite benchmarks
└── modules/node_os/      # Node.js OS module benchmarks
```

### Our Structure
```
scripts/bench/
├── package.json          # Benchmark dependencies and scripts ✅
├── utils.ts              # Mitata wrapper (aligned with runner.mjs) ✅
├── runner.ts             # CLI runner ✅
├── crc32-bench-mitata.ts # CRC32 benchmarks ✅
├── spawn-bench-mitata.ts # Spawn benchmarks ✅
├── archive-bench-mitata.ts # Archive benchmarks ✅
└── examples/bun-1.3.6-bench-mitata.ts # Comprehensive benchmarks ✅
```

## Key Alignments

### 1. Package.json Structure
✅ **Matches Bun's pattern**:
- Separate `package.json` in benchmark directory
- Scripts for individual benchmarks
- `all` script to run everything
- `all:json` script for CI/CD

### 2. Mitata Wrapper
✅ **Aligned with Bun's runner.mjs**:
```typescript
// Bun's runner.mjs pattern
export function run(opts = {}) {
  if (asJSON) opts.format = "json";
  return Mitata.run(opts);
}

// Our utils.ts (matches Bun's pattern)
export function run(opts = {}) {
  if (asJSON) opts.format = "json";
  return Mitata.run(opts);
}
```

### 3. Benchmark Organization
✅ **Follows Bun's grouping pattern**:
- Uses `group()` for related benchmarks
- Uses `bench()` for individual operations
- Includes warmup iterations
- Provides statistical analysis

### 4. Scripts Pattern
✅ **Matches Bun's script structure**:
```json
// Bun's pattern
{
  "scripts": {
    "ffi": "cd ffi && bun run deps && bun run build && bun run bench",
    "log": "cd log && bun run deps && bun run build && bun run bench"
  }
}

// Our pattern
{
  "scripts": {
    "crc32": "bun crc32-bench-mitata.ts",
    "spawn": "bun spawn-bench-mitata.ts",
    "archive": "bun archive-bench-mitata.ts",
    "all": "bun crc32-bench-mitata.ts && bun spawn-bench-mitata.ts && ..."
  }
}
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

## Usage

### From Benchmark Directory
```bash
cd scripts/bench
bun run crc32      # Run CRC32 benchmarks
bun run spawn      # Run spawn benchmarks
bun run archive    # Run archive benchmarks
bun run response   # Run Response.json benchmarks
bun run all        # Run all benchmarks
bun run all:json   # Run all with JSON output
```

### From Project Root
```bash
bun run bench              # Run all benchmarks
bun run bench:json         # Run all with JSON output
bun run bench:crc32:mitata # Run specific benchmark
bun run bench:spawn:mitata # Run spawn benchmark
bun run bench:archive:mitata # Run archive benchmark
```

## Dependencies

**Bun's dependencies**:
- `mitata` - Benchmarking framework
- Various test dependencies (babel, swc, esbuild, etc.)

**Our dependencies**:
- `mitata` - Benchmarking framework ✅
- (Minimal - focused on benchmarks only)

## Benchmark Categories

### 1. CRC32 (Hardware Accelerated)
- **File**: `crc32-bench-mitata.ts`
- **Tests**: Hardware-accelerated CRC32 hashing
- **Improvement**: 20x faster in Bun 1.3.6+

### 2. Spawn (fd limit optimization)
- **File**: `spawn-bench-mitata.ts`
- **Tests**: Bun.spawn() vs Bun.spawnSync()
- **Improvement**: 30x faster on Linux ARM64 in Bun 1.3.6+

### 3. Archive (Creation performance)
- **File**: `archive-bench-mitata.ts`
- **Tests**: tar/tar.gz creation
- **Status**: Fast archive operations

### 4. Response.json (SIMD FastStringifier)
- **File**: `examples/bun-1.3.6-bench-mitata.ts`
- **Tests**: SIMD-optimized JSON serialization
- **Improvement**: 3.5x faster in Bun 1.3.6+

### 5. Buffer Operations (SIMD search)
- **File**: `examples/bun-1.3.6-bench-mitata.ts`
- **Tests**: Buffer.indexOf/includes
- **Improvement**: 2x faster in Bun 1.3.6+

## CI/CD Integration

### JSON Output
```bash
# From project root (recommended)
bun run bench:json

# Or from benchmark directory
cd scripts/bench && bun run all:json

# Manual method (sets BENCHMARK_RUNNER=1 automatically)
BENCHMARK_RUNNER=1 bun run bench
```

### Benchmark Results
Results are output in JSON format when `BENCHMARK_RUNNER=1` is set, making it easy to parse and compare in CI/CD pipelines.

## Future Enhancements

Potential additions following Bun's structure:
- `fetch/` - Fetch API benchmarks
- `buffer/` - Buffer operation benchmarks
- `crypto/` - Cryptographic operation benchmarks
- `file/` - File I/O benchmarks
- `network/` - Network operation benchmarks

## References

- [Bun's Benchmark Directory](https://github.com/oven-sh/bun/tree/main/bench)
- [Mitata Documentation](https://github.com/evanwashere/mitata)
- `BENCHMARK_STRUCTURE.md` - Detailed benchmark documentation
