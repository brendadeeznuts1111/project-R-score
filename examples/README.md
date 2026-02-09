# Bun Examples Collection

A comprehensive collection of examples demonstrating Bun's features and capabilities.

## 📁 Directory Structure

```
examples/
├── bun-v139-features/      # Bun v1.3.9 new features
│   ├── parallel-scripts.ts     # Script orchestration demo
│   ├── regex-jit-demo.ts       # RegExp JIT optimization
│   ├── mock-auto-cleanup.test.ts  # Test mock auto-cleanup
│   ├── esm-bytecode-demo.ts    # ESM bytecode compilation
│   ├── cpu-profiling-demo.ts   # CPU profiling intervals
│   ├── http2-upgrade-demo.ts   # HTTP/2 connection upgrades
│   ├── no-proxy-demo.ts        # NO_PROXY enforcement
│   ├── performance-demo.ts     # Performance optimizations
│   ├── runner.ts               # Interactive example runner
│   ├── benchmarks/             # Performance benchmarks
│   └── MIGRATION.md            # Migration guide
│
├── demos/                  # Feature demonstrations
├── native-plugin/          # Native plugin examples
├── bun-file/               # Bun.file() API examples
├── cookie-crc32/           # Cookie handling demos
└── *.ts, *.js, *.html      # Various other examples
```

## 🚀 Quick Start

### Run v1.3.9 Examples

```bash
# Run the interactive runner
cd bun-v139-features
bun run runner.ts

# Run specific example
bun run bun-v139-features/parallel-scripts.ts

# Run all examples
bun run bun-v139-features/runner.ts all

# Run benchmarks
bun run bun-v139-features/runner.ts benchmarks

# Run tests
bun run bun-v139-features/runner.ts test
```

### Available v1.3.9 Examples

| Example | File | Description |
|---------|------|-------------|
| Parallel Scripts | `parallel-scripts.ts` | `--parallel` and `--sequential` flags |
| RegExp JIT | `regex-jit-demo.ts` | 3.9x speedup for fixed-count patterns |
| Mock Auto-Cleanup | `mock-auto-cleanup.test.ts` | `using` keyword for tests |
| ESM Bytecode | `esm-bytecode-demo.ts` | ESM bytecode compilation |
| CPU Profiling | `cpu-profiling-demo.ts` | `--cpu-prof-interval` flag |
| HTTP/2 Upgrades | `http2-upgrade-demo.ts` | Connection upgrade fix |
| NO_PROXY | `no-proxy-demo.ts` | Environment variable enforcement |
| Performance | `performance-demo.ts` | All performance improvements |

## 📚 Categories

### 🆕 Bun v1.3.9 Features

New features introduced in Bun v1.3.9:

- **Script Orchestration**: Run scripts in parallel or sequentially
- **RegExp JIT**: 3.9x speedup for fixed-count patterns
- **Mock Auto-Cleanup**: Automatic cleanup with `using` keyword
- **ESM Bytecode**: Compile ESM to bytecode binaries
- **CPU Profiling**: Configurable profiling intervals
- **HTTP/2 Fixes**: Connection upgrade pattern works
- **NO_PROXY**: Always respected even with explicit proxy

### 🔧 Core APIs

Examples for Bun's core APIs:

- `Bun.file()` - File I/O operations
- `Bun.write()` - Write files efficiently
- `Bun.spawn()` - Spawn child processes
- `Bun.serve()` - HTTP server
- `Bun.password` - Password hashing
- `Bun.hash` - Hashing functions

### 🧪 Testing

Testing examples and patterns:

- Mock auto-cleanup with `using`
- Test lifecycle management
- Snapshot testing
- Benchmark testing

### 🌐 Networking

Network-related examples:

- HTTP/2 client and server
- WebSocket connections
- Fetch API usage
- Proxy configuration

### 📦 Build & Bundle

Build and bundling examples:

- ESM bytecode compilation
- Cross-platform builds
- Bundle optimization
- Tree shaking

## 🏃 Running Examples

### Individual Examples

```bash
# TypeScript example
bun run example.ts

# JavaScript example  
bun run example.js

# HTML example (served)
bun serve example.html

# Test file
bun test example.test.ts
```

### With Arguments

```bash
# Pass arguments to example
bun run api-demo.ts urls
bun run api-demo.ts advanced
```

### With Environment Variables

```bash
# Run with NO_PROXY
NO_PROXY=localhost bun run example.ts

# Run with profiling
bun --cpu-prof --cpu-prof-interval 500 example.ts
```

## 📊 Benchmarks

Run performance benchmarks:

```bash
# RegExp JIT benchmark
cd bun-v139-features/benchmarks
bun run regex-benchmark.ts
```

## 🔍 Finding Examples

### By Feature

| Feature | Example Files |
|---------|--------------|
| Script running | `bun-v139-features/parallel-scripts.ts` |
| RegExp | `bun-v139-features/regex-jit-demo.ts` |
| Testing | `bun-v139-features/mock-auto-cleanup.test.ts` |
| Building | `bun-v139-features/esm-bytecode-demo.ts` |
| Profiling | `bun-v139-features/cpu-profiling-demo.ts` |
| HTTP/2 | `bun-v139-features/http2-upgrade-demo.ts` |
| Proxies | `bun-v139-features/no-proxy-demo.ts` |

### By Category

```bash
# Find all TypeScript examples
find examples -name "*.ts" -type f

# Find all test files
find examples -name "*.test.ts" -type f

# Find all demos
ls examples/demos/
```

## 📝 Contributing

When adding new examples:

1. Place in appropriate subdirectory
2. Include header comment with description
3. Add to relevant README
4. Test with `bun run <example>`
5. Follow existing code style

## 🔗 External Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun API Reference](https://bun.sh/docs/api)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Bun Discord](https://discord.gg/bun)

## 📖 v1.3.9 Migration Guide

See [bun-v139-features/MIGRATION.md](./bun-v139-features/MIGRATION.md) for detailed migration instructions.
