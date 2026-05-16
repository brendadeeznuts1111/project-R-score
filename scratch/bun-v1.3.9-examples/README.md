# Bun v1.3.9 Examples & Tests

This directory contains practical examples demonstrating the key features and improvements in Bun v1.3.9.

## 📁 Directory Structure

```
bun-v1.3.9-examples/
├── benchmarks/
│   ├── regex-jit-benchmark.ts     # RegExp JIT 3.9x speedup demo
│   ├── markdown-performance.ts     # Markdown rendering improvements
│   ├── string-optimizations.ts    # String & collection optimizations
│   └── README.md                  # Benchmark documentation
├── tests/
│   └── mock-auto-cleanup.test.ts  # Test mock auto-cleanup examples
├── parallel-scripts/
│   ├── demo.sh                    # Interactive demo script
│   ├── package.json               # Example scripts
│   └── workspace-demo/            # Workspace examples
│       └── packages/               # Multiple workspace packages
├── esm-bytecode/                # Archived → see archive/scratch/bun-v1.3.9-examples/esm-bytecode/
├── profiling/
│   ├── cpu-profile-demo.ts        # CPU profiling with custom intervals
│   ├── profile-compare.sh         # Compare profiling resolutions
│   └── package.json
└── http2-proxy/
    ├── http2-server.ts            # HTTP/2 connection upgrade demo
    ├── no-proxy-demo.ts           # NO_PROXY environment variable demo
    └── package.json
├── playground/
│   ├── playground.ts              # Interactive menu system
│   ├── demos/                     # All feature demonstrations
│   └── package.json
└── playground-web/            # Archived → see archive/scratch/bun-v1.3.9-examples/playground-web/
    ├── server.ts                  # Web server
    ├── index.html                 # Web UI
    ├── styles.css                # Styling
    ├── app.js                    # Frontend JavaScript
    └── package.json
```

## 🚀 Quick Start

```bash
# Run all examples
cd scratch/bun-v1.3.9-examples

# 1. RegExp JIT Benchmark
bun run benchmarks/regex-jit-benchmark.ts

# 1b. Markdown Performance
bun run benchmarks/markdown-performance.ts

# 1c. String Optimizations
bun run benchmarks/string-optimizations.ts

# 2. Test Mock Auto-Cleanup
bun test tests/mock-auto-cleanup.test.ts

# 3. ESM Bytecode Build
# ESM Bytecode example has been archived.
# See: archive/scratch/bun-v1.3.9-examples/esm-bytecode/

# 4. CPU Profiling
cd profiling && bun run profile:high-res

# 5. Parallel Scripts Demo
cd parallel-scripts && ./demo.sh

# 6. NO_PROXY Demo
cd http2-proxy && bun run no-proxy
```

## ⚡ Key Features Demonstrated

### 1. Parallel & Sequential Script Execution

Run multiple `package.json` scripts concurrently or sequentially with Foreman-style prefixed output:

```bash
# Run scripts in parallel
bun run --parallel build test lint

# Run scripts sequentially
bun run --sequential build test

# Workspace support
bun run --parallel --filter '*' build
bun run --sequential --workspaces build

# Glob patterns
bun run --parallel "build:*"

# Error handling
bun run --parallel --no-exit-on-error --filter '*' test
```

**Output format:**
```
build | compiling...
test  | running suite...
lint  | checking files...
```

With workspaces:
```
app:build | compiling...
lib:build | compiling...
```

[See examples →](parallel-scripts/)

### 2. RegExp JIT Optimization (3.9x Speedup)

**JIT-optimized patterns (v1.3.9+):**
```typescript
/(?:abc){3}/      // Fixed-count non-capturing groups → 3.9x faster
/(a+){2}b/        // Fixed-count with captures → JIT enabled
/aaaa|bbbb/       // Alternatives with known prefixes → SIMD scan
```

**Still interpreter (no JIT):**
```typescript
/(?:abc)+/        // Variable count → no JIT
/(a+)*b/          // Zero-or-more quantifiers → no JIT
```

[Run benchmarks →](benchmarks/)

**Available benchmarks:**
- [RegExp JIT](benchmarks/regex-jit-benchmark.ts) - 3.9x speedup for fixed-count patterns
- [Markdown Performance](benchmarks/markdown-performance.ts) - 7-28% faster rendering
- [String Optimizations](benchmarks/string-optimizations.ts) - startsWith, trim, Set/Map size improvements

### 3. Test Mock Auto-Cleanup

Uses the `using` keyword with `Symbol.dispose` for automatic cleanup:

```typescript
import { spyOn, mock } from "bun:test";

test("secure cookie validation", () => {
  {
    using spy = spyOn(SecureCookieManager, "validate");
    using mock = mock(fetch);
    // Mocks auto-restore when scope exits
  }
});
```

[See examples →](tests/mock-auto-cleanup.test.ts)

### 4. ESM Bytecode Compilation

Previously `--bytecode` was CJS-only. v1.3.9 adds ESM support:

```bash
# ESM bytecode (NEW in v1.3.9)
bun build --compile --bytecode --format=esm ./cli.ts

# CJS bytecode (existing)
bun build --compile --bytecode --format=cjs ./cli.ts
```

[Build example →](archive/scratch/bun-v1.3.9-examples/esm-bytecode/) (archived)

### 5. Configurable CPU Profiling

New `--cpu-prof-interval` flag for higher resolution:

```bash
bun --cpu-prof --cpu-prof-interval 250 app.ts  # 250μs resolution
bun --cpu-prof --cpu-prof-interval 500 app.ts  # 500μs resolution
bun --cpu-prof app.ts                           # Default 1000μs
```

[Try profiling →](profiling/)

### 6. HTTP/2 Connection Upgrade Fix

The `h2Server.emit("connection", rawSocket)` pattern now works:

```typescript
const h2Server = createSecureServer({ key, cert });
const netServer = createServer((rawSocket) => {
  h2Server.emit("connection", rawSocket); // Now works!
});
```

[Run server →](http2-proxy/http2-server.ts)

### 7. NO_PROXY Enforcement

`NO_PROXY` is now always respected, even with explicit proxy settings:

```bash
NO_PROXY=localhost bun test
```

```typescript
await fetch("http://localhost:3000", {
  proxy: "http://my-proxy:8080" // Correctly bypassed!
});
```

[Test NO_PROXY →](http2-proxy/no-proxy-demo.ts)

### 8. Interactive Playground

Explore all features interactively:

```bash
cd playground
bun start
```

[See playground →](playground/)

## 🎯 Running All Tests

```bash
# Run benchmarks
bun run benchmarks/regex-jit-benchmark.ts
bun run benchmarks/markdown-performance.ts
bun run benchmarks/string-optimizations.ts

# Or run all benchmarks in parallel
bun run --parallel "benchmarks:*"

# Run tests
bun test tests/mock-auto-cleanup.test.ts

# Build and run ESM bytecode (archived)
# cd archive/scratch/bun-v1.3.9-examples/esm-bytecode
# bun run build:all
# ./dist/cli-esm greet "Bun v1.3.9"

# Profile with different intervals
cd profiling
bun run compare

# Test parallel/sequential scripts
cd parallel-scripts
./demo.sh

# Test HTTP/2 and proxy settings
cd http2-proxy
bun run no-proxy
```

## 📊 Expected Results

| Feature | Before v1.3.9 | v1.3.9 |
|---------|---------------|--------|
| Parallel script execution | Not supported | ✓ Supported |
| Sequential script execution | Not supported | ✓ Supported |
| Fixed-count regex | 100ms | 26ms (3.9x faster) |
| Markdown rendering (small) | 3.20 µs | 2.30 µs (28% faster) |
| Markdown rendering (large) | 288.48 µs | 267.14 µs (7.4% faster) |
| String#startsWith | Baseline | 1.42x faster |
| String#startsWith (const) | Baseline | 5.76x faster |
| String#trim | Baseline | 1.17x faster |
| Set#size | Baseline | 2.24x faster |
| Map#size | Baseline | 2.74x faster |
| AbortSignal.abort() | 271 ms | 255 ms (~6% faster) |
| ESM bytecode | Not supported | ✓ Supported |
| CPU profiling interval | Fixed 1000μs | Configurable |
| HTTP/2 upgrade path | Broken | Fixed |
| NO_PROXY with explicit proxy | Ignored | Respected |
| Mock cleanup | Manual | Auto (using keyword) |

## 📚 References

- [Full Release Notes](../bun-v1.3.9-release-notes.md)
- [Bun Documentation](https://bun.sh/docs)
- [GitHub Issues](https://github.com/oven-sh/bun/issues)
