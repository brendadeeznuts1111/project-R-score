# Scratch Directory

Development playground and experimental code for Bun features and testing.

## 📁 Directory Structure

```
scratch/
├── bun-v1.3.9-examples/            # Primary active area for Bun v1.3.9 experimentation
│   ├── README.md
│   ├── COMPREHENSIVE-GUIDE.md
│   ├── QUICK-REFERENCE.md
│   ├── benchmarks/
│   ├── advanced/
│   ├── parallel-scripts/
│   ├── esm-bytecode/
│   ├── profiling/
│   ├── http2-proxy/
│   ├── playground/
│   └── tests/
│
├── bun-v1.3.9-practical-examples/  # Smaller practical examples
│
└── bun-v1.3.9-*.md                 # Release notes and migration guides
```

**Archived experiments** live in `archive/scratch/` (e.g. `bun-parallel-test/`, `f402-preview/`).

## 🎯 Main Directories

### bun-v1.3.9-examples/

The **primary active** location for Bun v1.3.9 feature demonstrations and experimentation.

```bash
cd scratch/bun-v1.3.9-examples

# Run interactive playground
bun run playground/playground.ts

# Run all demos
bun run playground/playground.ts all

# Run specific benchmark
bun run benchmarks/regex-jit-benchmark.ts
```

See `bun-v1.3.9-examples/README.md` and `COMPREHENSIVE-GUIDE.md` for detailed usage.

### Archived Experiments

Old or inactive experiments are moved to `archive/scratch/` to keep the root `scratch/` directory focused.

Current archived items:
- `bun-parallel-test/` — Parallel execution testing framework
- `f402-preview/` — Early Fantasy402 local preview

To explore archived work:
```bash
cd archive/scratch
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
