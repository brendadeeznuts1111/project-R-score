# Bun v1.3.9 Feature Examples

Comprehensive examples demonstrating all new features in Bun v1.3.9.

## 🚀 Quick Start

```bash
# Run all examples
bun run examples/bun-v139-features/runner.ts

# Run specific example
bun run examples/bun-v139-features/parallel-scripts.ts
```

## 📁 Examples

### 1. Script Orchestration
- **File**: `parallel-scripts.ts`
- **Features**: `--parallel`, `--sequential`, workspace support

### 2. RegExp JIT Optimization
- **File**: `regex-jit-demo.ts`
- **Features**: 3.9x speedup for fixed-count patterns

### 3. Test Mock Auto-Cleanup
- **File**: `mock-auto-cleanup.test.ts`
- **Features**: `Symbol.dispose` with `using` keyword

### 4. ESM Bytecode Compilation
- **File**: `esm-bytecode-demo.ts`
- **Features**: `--format=esm` with `--bytecode`

### 5. CPU Profiling
- **File**: `cpu-profiling-demo.ts`
- **Features**: `--cpu-prof-interval` flag

### 6. HTTP/2 Connection Upgrades
- **File**: `http2-upgrade-demo.ts`
- **Features**: `net.Server → Http2SecureServer`

### 7. NO_PROXY Support
- **File**: `no-proxy-demo.ts`
- **Features**: Environment variable enforcement

### 8. Performance Optimizations
- **File**: `performance-demo.ts`
- **Features**: Markdown, String, Collection optimizations

## 📊 Performance Benchmarks

Run benchmarks to see the improvements:

```bash
# RegExp JIT benchmark
bun run examples/bun-v139-features/benchmarks/regex-benchmark.ts

# String optimization benchmark
bun run examples/bun-v139-features/benchmarks/string-benchmark.ts

# All benchmarks
bun run examples/bun-v139-features/benchmarks/run-all.ts
```

## 🔧 Migration Guide

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions.
