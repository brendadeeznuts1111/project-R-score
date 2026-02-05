# ⚙️ Runtime & Process Control Guide

This document explains how to use Bun's [Runtime & Process Control](https://bun.com/docs/runtime#runtime-%26-process-control) features in benchmarks and tests.

## 🎯 Overview

Bun provides several runtime flags that control process behavior, memory management, and performance characteristics. These flags are particularly useful for benchmarking and testing different runtime configurations.

## 🚀 Available Runtime Controls

### 1. `--expose-gc`

Expose `gc()` on the global object. Note that `Bun.gc()` is always available and is the recommended way to trigger garbage collection.

**Usage:**
```bash
bun --expose-gc test bench/runtime-controls.bench.ts
```

**In Code:**
```typescript
// Bun.gc() is always available (preferred)
Bun.gc(true);  // Blocking GC
Bun.gc(false); // Non-blocking GC

// Global gc() is only available with --expose-gc
// @ts-ignore - gc may not exist
if (typeof gc === 'function') {
  gc();
}
```

**When to Use:**
- When you need global `gc()` function for Node.js compatibility
- For testing code that expects `global.gc()` to exist

### 2. `--smol`

Use less memory but run garbage collection more often. This can help identify memory leaks and test performance under memory constraints.

**Usage:**
```bash
bun --smol test bench/runtime-controls.bench.ts
```

**Impact:**
- Reduces heap size
- More frequent garbage collection
- Useful for memory-constrained environments

**When to Use:**
- Testing memory efficiency
- Identifying memory leaks
- Simulating resource-constrained environments

### 3. `--console-depth`

Control the depth of object inspection in console output. Default is `2`.

**Usage:**
```bash
bun --console-depth 5 test bench/dashboard.bench.ts
```

**Values:**
- `1` - Very shallow (minimal nesting)
- `2` - Default (moderate nesting)
- `5+` - Deep inspection (verbose output)

**When to Use:**
- Debugging complex nested objects
- Benchmarking console output performance
- Testing dashboard rendering with different depth settings

### 4. `--zero-fill-buffers`

Force `Buffer.allocUnsafe(size)` to be zero-filled (like `Buffer.alloc()`).

**Usage:**
```bash
bun --zero-fill-buffers test bench/runtime-controls.bench.ts
```

**Impact:**
```typescript
// Without flag: may contain random data (faster)
const unsafe = Buffer.allocUnsafe(1024);

// With --zero-fill-buffers: always zero-filled (safer, slightly slower)
const safe = Buffer.allocUnsafe(1024); // Now zero-filled
```

**When to Use:**
- Testing security-sensitive buffer operations
- Ensuring consistent buffer behavior
- Comparing performance impact of zero-filling

### 5. `--unhandled-rejections`

Control unhandled Promise rejection behavior. See [Unhandled Rejections Guide](../errors/UNHANDLED_REJECTIONS.md) for detailed documentation.

**Options:**
- `strict` - Treat unhandled rejections as errors (process exits)
- `throw` - Throw on unhandled rejections (synchronous throw)
- `warn` - Warn on unhandled rejections (default, continues execution)
- `none` - Silently ignore unhandled rejections
- `warn-with-error-code` - Warn and exit with non-zero code

**Usage:**
```bash
# Strict mode (fail on unhandled rejections)
bun --unhandled-rejections strict test

# Warn mode (default, show warnings)
bun --unhandled-rejections warn test

# Silent mode (ignore rejections)
bun --unhandled-rejections none test bench/

# Warn and exit with error code
bun --unhandled-rejections warn-with-error-code start.js
```

**When to Use:**
- **`strict`**: Production environments, CI/CD pipelines, tests
- **`warn`**: Development environments (default)
- **`none`**: Benchmarks to avoid noise
- **`throw`**: Immediate failure detection
- **`warn-with-error-code`**: Production with warning logging

**Reference**: [Bun Runtime - Unhandled Rejections](https://bun.com/docs/runtime#param-unhandled-rejections)

### 6. `--bun`

Force a script or package to use Bun's runtime instead of Node.js (via symlinking `node`).

**Usage:**
```bash
bun run --bun vite
```

**When to Use:**
- Running Node.js CLIs with Bun runtime
- Testing Bun compatibility with Node.js tools
- Comparing performance between Bun and Node.js

## 🔧 Using Runtime Controls in Benchmarks

### Garbage Collection

Always use `Bun.gc()` in benchmarks - it's always available:

```typescript
import { bench, describe } from "bun:test";

describe("Feature Benchmarks", () => {
  bench("operation", () => {
    // Your benchmark code
  }, {
    iterations: 10_000,
  });

  beforeEach(() => {
    Bun.gc(true); // Force GC before benchmarks
  });
});
```

### Memory Management

Test Buffer operations with different configurations:

```typescript
describe("Buffer Performance", () => {
  bench("allocUnsafe (default)", () => {
    Buffer.allocUnsafe(1024);
  });

  bench("allocUnsafe with zero-fill", () => {
    const buffer = Buffer.allocUnsafe(1024);
    buffer.fill(0); // Explicit zero-fill when needed
    return buffer;
  });

  bench("alloc (always safe)", () => {
    Buffer.alloc(1024);
  });
});
```

### Process Control APIs

Measure process control API performance:

```typescript
describe("Process Control", () => {
  bench("memoryUsage()", () => {
    process.memoryUsage();
  });

  bench("cpuUsage()", () => {
    process.cpuUsage();
  });

  bench("hrtime.bigint()", () => {
    process.hrtime.bigint();
  });
});
```

## 📊 Benchmarking Best Practices

### 1. Force GC Before Benchmarks

```typescript
beforeEach(() => {
  Bun.gc(true); // Blocking GC for consistency
});
```

### 2. Periodic GC During Long Runs

```typescript
for (let i = 0; i < iterations; i++) {
  // Benchmark code
  if (i % 100 === 0 && i > 0) {
    Bun.gc(true); // Periodic GC to avoid memory pressure
  }
}
```

### 3. Use Nanosecond Precision for Microbenchmarks

```typescript
import { measureNanoseconds } from "./utils";

it("should measure with precision", () => {
  const { duration } = measureNanoseconds(() => {
    // Very fast operation
  });
  expect(duration).toBeLessThan(0.1); // Expect sub-millisecond
});
```

### 4. Test with Different Runtime Configurations

```bash
# Normal mode
bun test bench/

# Memory-constrained mode
bun --smol test bench/

# With zero-filled buffers
bun --zero-fill-buffers test bench/runtime-controls.bench.ts
```

## 🎯 Common Use Cases

### Testing Memory Efficiency

```bash
# Run benchmarks in memory-constrained mode
bun --smol test bench/feature-flags.bench.ts
```

### Debugging Complex Objects

```bash
# Increase console depth for detailed output
bun --console-depth 5 test bench/dashboard.bench.ts
```

### Testing Buffer Security

```bash
# Ensure all buffers are zero-filled
bun --zero-fill-buffers test bench/runtime-controls.bench.ts
```

### Comparing Runtime Modes

```bash
# Normal mode
bun test bench/logger.bench.ts

# Memory-constrained mode
bun --smol test bench/logger.bench.ts
```

## 📝 Configuration in `bunfig.toml`

You can set default runtime controls in `bunfig.toml`:

```toml
[run]
bun = true  # Always use Bun runtime

# Note: Runtime control flags are typically set via CLI,
# but some settings can be configured here
```

## 🔗 Resources

- [Bun Runtime Documentation](https://bun.com/docs/runtime#runtime-%26-process-control)
- [Bun Test Documentation](https://bun.sh/docs/test)
- [Testing Alignment Guide](../guides/testing/TESTING_ALIGNMENT.md)

