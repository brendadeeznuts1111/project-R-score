# 🚀 Benchmark Suite

This directory contains performance benchmarks following [Bun's benchmarking best practices](https://github.com/oven-sh/bun/tree/main/test#tests).

## 📁 Structure

```text
bench/
├── README.md                           # This file
├── feature-flags.bench.ts              # Feature flag registry operations
├── string-width.bench.ts               # Unicode string width calculations
├── logger.bench.ts                     # Logger performance benchmarks
├── dashboard.bench.ts                  # Dashboard rendering performance
├── bundle-size.bench.ts                # Bundle size comparison benchmarks
├── bun-runtime-features.bench.ts       # Bun runtime features performance
├── process-lifecycle.bench.ts          # Process lifecycle and management
├── runtime-controls.bench.ts           # Runtime control operations
├── networking-security.bench.ts        # 🌐 Networking & Security features
├── transpilation-features.bench.ts     # ⚡ Transpilation & Language features
├── configuration-management.bench.ts   # 📁 Configuration Management features
└── utils.ts                            # Shared benchmarking utilities
```

## 🆕 New Benchmark Categories

### 🌐 Networking & Security (`networking-security.bench.ts`)
Comprehensive benchmarks for Bun's networking and security capabilities:

- **HTTP Server Performance**: Server creation, TLS configuration, CORS handling
- **Network Connectivity**: IPv4/IPv6 tests, DNS resolution, latency measurement
- **Security Headers**: Header generation, CORS preflight handling
- **Redis Integration**: Connection parsing, pool management, connection resilience
- **TLS Certificate**: Certificate parsing, self-signed generation
- **Advanced Patterns**: Connection resilience scoring, concurrent handling

### ⚡ Transpilation & Language Features (`transpilation-features.bench.ts`)
Performance benchmarks for Bun's transpilation and language features:

- **TypeScript Configuration**: Config generation, options parsing, custom defines
- **File Loaders**: Loader configuration, type detection, content transformation
- **Build Optimization**: Dead code elimination, minification, tree shaking
- **React JSX Transformation**: Runtime detection, JSX transformation, plugin configuration
- **Advanced Pipeline**: 4-stage pipeline simulation, concurrent compilation
- **Code Analysis**: Transpilation analysis, performance optimization scoring

### 📁 Configuration Management (`configuration-management.bench.ts`)
Benchmarks for configuration file reading and analysis:

- **bunfig.toml Parsing**: TOML content parsing, default generation, configuration merging
- **package.json Enhancement**: Metadata extraction, dependency analysis, script validation
- **TypeScript Configuration**: tsconfig parsing, configuration validation
- **Comprehensive Analysis**: Project analysis, environment detection, recommendations
- **File Operations**: Existence checking, content reading simulation

## 🎯 Benchmarking Best Practices

Following Bun's conventions:

### Timing Methods
- **`performance.now()`** - High-resolution timestamps for general timing
- **`Bun.nanoseconds()`** - Nanosecond-precision for microbenchmarks
- **`Bun.gc()`** - Force garbage collection between benchmarks for consistency

### Benchmark Structure
```typescript
import { bench, describe } from "bun:test";

describe("Feature Flags", () => {
  bench("isEnabled() lookup", () => {
    // Benchmark code here
  });
});
```

### Running Benchmarks

```bash
# Run all benchmarks
bun test bench/

# Run specific benchmark file
bun test bench/feature-flags.bench.ts

# Run with iterations count
bun test bench/ --iterations 1000

# Run with timeout
bun test bench/ --timeout 5000

# Run with runtime controls (see Runtime & Process Control section)
bun --expose-gc test bench/runtime-controls.bench.ts
bun --smol test bench/runtime-controls.bench.ts
bun --console-depth 5 test bench/dashboard.bench.ts
```

## 📊 Benchmark Categories

### 1. Feature Flags (`feature-flags.bench.ts`)
- `isEnabled()` lookup performance
- Flag state updates
- Registry initialization
- Change listener notifications
- Bulk flag operations

### 2. String Width (`string-width.bench.ts`)
- Unicode-aware width calculation
- Emoji and flag rendering
- ANSI escape sequence handling
- East Asian character width
- Zero-width character handling

### 3. Logger (`logger.bench.ts`)
- Log entry creation
- Log level filtering
- External service integration overhead
- Structured logging performance
- Audit trail operations

### 4. Dashboard (`dashboard.bench.ts`)
- Dashboard rendering
- Status bar updates
- Performance graph rendering
- Integration grid updates
- Real-time refresh performance

### 5. Bundle Size (`bundle-size.bench.ts`)
- Build time comparisons
- Feature elimination verification
- Bundle size regression detection
- Minification impact
- Feature flag impact on bundle size

### 6. Runtime Controls (`runtime-controls.bench.ts`)
- Garbage collection performance (`Bun.gc()`)
- Memory management (Buffer operations)
- Process control APIs (`process.memoryUsage()`, etc.)
- Runtime flag impacts (`--smol`, `--expose-gc`, etc.)
- Console depth impact
- Unhandled rejection handling

### 7. Process Lifecycle (`process-lifecycle.bench.ts`)
- `Bun.spawn()` performance (INITIAL → CREATING)
- State transition performance (STARTING → RUNNING → EXITED)
- Kill signal performance (RUNNING → KILLED)
- Stream reading performance (stdout/stderr)
- Concurrent process spawning
- Full lifecycle overhead

### 8. Runtime Features (`bun-runtime-features.bench.ts`)
- Process spawning performance
- File I/O performance (read/write)
- Shell template strings performance
- File watching performance
- HTTP server performance
- WebSocket performance
- Glob patterns performance
- Console formatting performance
- Hash/Crypto performance
- Process info performance
- Memory/Stats performance
- Timeout/Abort performance

## 🔧 Benchmark Utilities

The `utils.ts` file provides helper functions:

- `measure(fn)` - Measure function execution time
- `benchmark(name, fn, iterations)` - Run benchmark with iterations
- `compareBaseline(current, baseline)` - Compare against baseline
- `gcBetweenRuns()` - Force GC between benchmark runs

## 📈 Interpreting Results

Benchmark results show:
- **Average time** - Mean execution time across iterations
- **Min/Max** - Best and worst case performance
- **Standard deviation** - Performance consistency
- **Throughput** - Operations per second (when applicable)

## 🎯 Performance Targets

Based on your system's requirements:

| Component | Target | Current |
|-----------|--------|---------|
| Feature flag lookup | < 1μs | TBD |
| String width calculation | < 10μs | TBD |
| Logger entry | < 50μs | TBD |
| Dashboard render | < 100ms | TBD |
| Bundle build | < 5s | TBD |

## 🚨 Regression Detection

Benchmarks should detect performance regressions:

```bash
# Run benchmarks and compare against baseline
bun test bench/ --compare-baseline
```

## 📝 Adding New Benchmarks

1. Create a new `.bench.ts` file in `/bench`
2. Import from `bun:test` and use `bench()` or `describe()`
3. Use `Bun.nanoseconds()` or `performance.now()` for timing
4. Use `Bun.gc()` for consistent benchmark runs (always available)
5. Include setup/teardown if needed
6. Document expected performance targets
7. Consider runtime control flags if relevant (`--smol`, `--expose-gc`, etc.)
8. Add to this README under appropriate category

### Example Benchmark Template

```typescript
#!/usr/bin/env bun

import { bench, describe } from "bun:test";
import { measureNanoseconds } from "./utils";

describe("My Feature Performance", () => {
  beforeEach(() => {
    // Setup
    Bun.gc(true); // Force GC before benchmarks
  });

  bench("operation", () => {
    // Your benchmark code
  }, {
    iterations: 10_000,
  });

  it("should measure with nanosecond precision", () => {
    const { duration } = measureNanoseconds(() => {
      // Your code
    });
    expect(duration).toBeLessThan(1); // Set appropriate threshold
  });
});
```

## ⚙️ Runtime & Process Control

Bun provides several runtime flags that can affect benchmark performance. See the [Runtime & Process Control documentation](https://bun.com/docs/runtime#runtime-%26-process-control) for details.

### Key Flags for Benchmarking

#### `--expose-gc`
Expose `gc()` on the global object. Note: `Bun.gc()` is always available and preferred.

```bash
bun --expose-gc test bench/runtime-controls.bench.ts
```

#### `--smol`
Use less memory but run garbage collection more often. Useful for testing memory-constrained scenarios.

```bash
bun --smol test bench/runtime-controls.bench.ts
```

#### `--console-depth`
Control the depth of object inspection in console output (default: 2).

```bash
bun --console-depth 5 test bench/dashboard.bench.ts
```

#### `--zero-fill-buffers`
Force `Buffer.allocUnsafe(size)` to be zero-filled (like `Buffer.alloc()`).

```bash
bun --zero-fill-buffers test bench/runtime-controls.bench.ts
```

#### `--unhandled-rejections`
Control unhandled rejection behavior: `strict`, `throw`, `warn`, `none`, or `warn-with-error-code`.

```bash
bun --unhandled-rejections strict test bench/runtime-controls.bench.ts
```

### Using Runtime Controls in Benchmarks

Our benchmarks use `Bun.gc()` directly, which is always available. For testing with different runtime configurations:

```typescript
// In your benchmark
describe("Memory Management", () => {
  bench("Buffer with default settings", () => {
    Buffer.allocUnsafe(1024);
  });

  // When run with --zero-fill-buffers, allocUnsafe behaves like alloc
  bench("Buffer with --zero-fill-buffers", () => {
    const buffer = Buffer.allocUnsafe(1024);
    buffer.fill(0); // Explicit zero-fill
    return buffer;
  });
});
```

## 🔗 Resources

- [Bun Runtime Documentation](https://bun.com/docs/runtime#runtime-%26-process-control)
- [Bun Test Documentation](https://bun.sh/docs/test)
- [Bun Benchmark Examples](https://github.com/oven-sh/bun/tree/main/test)
- [Performance.now() API](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [Bun.nanoseconds()](https://bun.sh/docs/api/bun)
