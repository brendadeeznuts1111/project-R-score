# Bun Examples Master Index

Complete index of all Bun examples across the repository.

## 📁 Quick Navigation

| Directory | Contents | Entry Point |
|-----------|----------|-------------|
| `bun-v139-features/` | Bun v1.3.9 new features | `runner.ts` |
| `demos/` | Feature demonstrations | Individual `.ts` files |
| `bun-file/` | File API examples | `example*.txt` |
| `cookie-crc32/` | Cookie handling | `cookie-crc32-integrator.ts` |
| `native-plugin/` | Native plugins | `native-plugin-demo.c` |

## 🆕 Bun v1.3.9 Features

Located in `bun-v139-features/`:

### Core Examples

| Example | Command | Description |
|---------|---------|-------------|
| Parallel Scripts | `bun run parallel-scripts.ts` | `--parallel` & `--sequential` flags |
| RegExp JIT | `bun run regex-jit-demo.ts` | 3.9x speedup demo |
| Mock Auto-Cleanup | `bun test mock-auto-cleanup.test.ts` | `using` keyword |
| ESM Bytecode | `bun run esm-bytecode-demo.ts` | ESM compilation |
| CPU Profiling | `bun run cpu-profiling-demo.ts` | Profiling intervals |
| HTTP/2 Upgrade | `bun run http2-upgrade-demo.ts` | Connection upgrade fix |
| NO_PROXY | `bun run no-proxy-demo.ts` | Proxy bypass |
| Performance | `bun run performance-demo.ts` | All optimizations |

### Interactive Runner

```bash
cd bun-v139-features

# Interactive mode
bun start

# Run all examples
bun run all

# Run specific example
bun start 1

# Run benchmarks
bun run benchmark

# Run tests
bun run test
```

### Documentation

- `README.md` - Overview and quick start
- `MIGRATION.md` - Migration guide from v1.3.8
- `CONTRIBUTING.md` - Contribution guidelines

## 🎭 Feature Demos

Located in `demos/`:

### Bun APIs

```bash
# Hash and crypto
bun run demos/DEMO-BUN-HASH-CRC32.ts

# Buffer operations
bun run demos/DEMO-BUFFER-SIMD-INDEXOF.ts

# String utilities
bun run demos/DEMO-STRINGWIDTH-TESTS.ts
bun run demos/DEMO-WRAPANSI-FEATURES.ts

# Archive handling
bun run demos/DEMO-ARCHIVE-FEATURES.ts

# Streaming
bun run demos/DEMO-ARRAYBUFFERSINK-FEATURES.ts
```

### v1.3.9 Specific (demos/bun/)

```bash
# Security fixes
bun run demos/bun/DEMO-BUN-SECURITY-FIXES.ts

# HTTP/2 improvements
bun run demos/bun/DEMO-BUN-API-HTTP2-FETCH-FIXES.ts

# WebSocket fixes
bun run demos/demo-websocket-fixes.ts
```

## 🔧 Other Examples

### File Operations (`bun-file/`)

Examples of `Bun.file()` API usage with various data types.

### Cookie Handling (`cookie-crc32/`)

```bash
bun run cookie-crc32/cookie-crc32-integrator.ts
```

### Native Plugins (`native-plugin/`)

```bash
# C plugin
cd native-plugin && make

# Rust plugin
cd native-plugin && cargo build
```

## 🧪 Testing Examples

```bash
# Run all tests in examples
bun test examples/

# Run specific test file
bun test examples/bun-v139-features/mock-auto-cleanup.test.ts

# Run with coverage
bun test --coverage examples/
```

## 📊 Benchmarking

```bash
# v1.3.9 benchmarks
cd bun-v139-features/benchmarks
bun run regex-benchmark.ts

# Run all benchmarks
bun run run-all.ts
```

## 🔗 Cross-References

### Scratch Directory

The `scratch/` directory contains experimental and development examples:

```bash
# v1.3.9 scratch examples
scratch/bun-v1.3.9-examples/

# Parallel testing
scratch/bun-parallel-test/

# General playground
scratch/bun-playground/
```

### Documentation

- `bun-v139-features/README.md` - Feature overview
- `bun-v139-features/MIGRATION.md` - Migration guide
- `demos/README.md` - Demo index
- `scratch/bun-v1.3.9-examples/README.md` - Scratch examples

## 🎯 By Use Case

### Learning Bun v1.3.9

1. Start with `bun-v139-features/README.md`
2. Run `bun-v139-features/runner.ts` for interactive tour
3. Read `MIGRATION.md` for upgrade path
4. Check specific examples for your use case

### Performance Optimization

1. `bun-v139-features/regex-jit-demo.ts` - RegExp optimization
2. `bun-v139-features/performance-demo.ts` - All improvements
3. `bun-v139-features/benchmarks/` - Performance testing

### Testing

1. `bun-v139-features/mock-auto-cleanup.test.ts` - Mock patterns
2. `demos/DEMO-STRINGWIDTH-TESTS.ts` - String testing

### Build & Deploy

1. `bun-v139-features/esm-bytecode-demo.ts` - CLI compilation
2. `bun-v139-features/cpu-profiling-demo.ts` - Performance profiling

## 📖 External Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun v1.3.9 Release Notes](https://bun.com/blog/bun-v1.3.9)
- [Bun GitHub](https://github.com/oven-sh/bun)
