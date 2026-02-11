# Scratch Directory

Development playground and experimental code for Bun features and testing.

## 📁 Directory Structure

```
scratch/
├── bun-v1.3.9-examples/         # Comprehensive v1.3.9 examples
│   ├── README.md                   # Main documentation
│   ├── COMPREHENSIVE-GUIDE.md      # Detailed feature guide
│   ├── QUICK-REFERENCE.md          # Quick reference card
│   ├── benchmarks/                 # Performance benchmarks
│   ├── advanced/                   # Advanced usage patterns
│   ├── parallel-scripts/           # Script orchestration demos
│   ├── esm-bytecode/               # ESM bytecode examples
│   ├── profiling/                  # CPU profiling demos
│   ├── http2-proxy/                # HTTP/2 and proxy demos
│   ├── playground/                 # Interactive playground
│   └── tests/                      # Test examples
│
├── bun-parallel-test/           # Parallel execution testing
├── bun-playground/              # General playground
├── bun-browser-playground/      # Browser-specific testing
└── bun-v1.3.9-*.md             # Release notes and guides
```

## 🎯 Main Directories

### bun-v1.3.9-examples/

The primary location for Bun v1.3.9 feature demonstrations:

```bash
cd scratch/bun-v1.3.9-examples

# Run interactive playground
bun run playground/playground.ts

# Run benchmarks
bun run benchmarks/regex-jit-benchmark.ts

# Run tests
bun test tests/mock-auto-cleanup.test.ts

# Build ESM bytecode example
cd esm-bytecode && bun run build:all
```

### bun-parallel-test/

Testing parallel script execution and related features:

```bash
cd scratch/bun-parallel-test

# Run test runner
bun run test-runner.ts

# Run examples
bun run examples/abort-signal-perf.ts
bun run examples/markdown-api.ts
```

### bun-playground/

General Bun feature experimentation:

```bash
cd scratch/bun-playground
bun run playground.ts
```

## 🚀 Quick Start

### Run All v1.3.9 Examples

```bash
cd scratch/bun-v1.3.9-examples
bun run playground/playground.ts all
```

### Run Specific Feature Demo

```bash
cd scratch/bun-v1.3.9-examples

# Parallel scripts
bun run playground/demos/parallel-scripts.ts

# RegExp JIT
bun run playground/demos/regex-playground.ts

# Mock auto-cleanup
bun test tests/mock-auto-cleanup.test.ts
```

### Run Benchmarks

```bash
cd scratch/bun-v1.3.9-examples/benchmarks

# RegExp JIT benchmark
bun run regex-jit-benchmark.ts

# String optimizations
bun run string-optimizations.ts

# Markdown performance
bun run markdown-performance.ts
```

## 📚 Key Documentation

| Document | Description |
|----------|-------------|
| `bun-v1.3.9-release-notes.md` | Official-style release notes |
| `bun-v1.3.9-migration-guide.md` | Migration instructions |
| `bun-v1.3.9-examples/README.md` | Examples overview |
| `bun-v1.3.9-examples/COMPREHENSIVE-GUIDE.md` | Detailed feature guide |
| `bun-v1.3.9-examples/QUICK-REFERENCE.md` | Quick reference card |

## 🔧 Features Covered

### v1.3.9 New Features

1. **Parallel & Sequential Scripts** (`--parallel`, `--sequential`)
2. **RegExp JIT Optimization** (3.9x speedup)
3. **Test Mock Auto-Cleanup** (`Symbol.dispose`, `using`)
4. **ESM Bytecode Compilation** (`--format=esm --bytecode`)
5. **CPU Profiling Interval** (`--cpu-prof-interval`)
6. **HTTP/2 Connection Upgrade Fix**
7. **NO_PROXY Enforcement**
8. **Performance Improvements** (Markdown, String, Collections)

## 🧪 Testing

Run all tests in scratch:

```bash
# Test v1.3.9 features
cd scratch/bun-v1.3.9-examples
bun test tests/

# Test parallel execution
cd scratch/bun-parallel-test
bun test
```

## 📝 Notes

- This directory contains experimental and development code
- Examples here may be more cutting-edge than production code
- Some features require Bun v1.3.9 or later
- Check individual README files for specific requirements

## 🔗 Related

- [examples/](../examples/) - Production-ready examples
- [docs/](../docs/) - Documentation
- [benchmarks/](../benchmarks/) - Performance benchmarks
