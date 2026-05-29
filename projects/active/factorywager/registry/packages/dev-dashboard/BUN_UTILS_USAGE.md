# 🚀 Bun Utils Usage in Dev Dashboard

This document outlines how we leverage Bun's native utility functions for optimal performance and functionality.

## Currently Used Utils

### `Bun.nanoseconds()`
**Location**: `enhanced-dashboard.ts` - Benchmark timing

Used for high-precision timing in performance benchmarks:
```typescript
const start = Bun.nanoseconds();
// ... operation ...
const time = (Bun.nanoseconds() - start) / 1_000_000; // Convert to milliseconds
```

**Benefits**:
- Nanosecond precision (vs millisecond with `Date.now()`)
- More accurate for micro-benchmarks
- Lower overhead than `performance.now()`

### `Bun.TOML.parse()`
**Location**: `enhanced-dashboard.ts` - Configuration loading

Used for parsing TOML configuration files:
```typescript
const configFile = Bun.file(new URL('../config.toml', import.meta.url));
const dashboardConfig = Bun.TOML.parse(await configFile.text());
```

**Benefits**:
- Native parsing (no dependencies)
- Fast and efficient
- Type-safe with proper error handling

### `Bun.file()`
**Location**: `enhanced-dashboard.ts` - File I/O

Used for reading TOML configuration files:
```typescript
const configFile = Bun.file(new URL('../config.toml', import.meta.url));
const content = await configFile.text();
```

**Benefits**:
- Zero-copy file reading
- Async/await support
- Works with URLs and paths

## Potential Optimizations

### `Bun.peek()` - Promise Optimization
**Use Case**: Profile queries with secrets check

Could optimize async operations by checking if promises are already resolved:
```typescript
// Instead of always awaiting:
const secretPrefs = await Bun.secrets.get(...);

// Could peek first:
const secretPromise = Bun.secrets.get(...);
const secretPrefs = Bun.peek(secretPromise) || await secretPromise;
```

**When to use**: Hot paths with frequently resolved promises

### `Bun.deepEquals()` - Comparison Optimization
**Use Case**: Profile comparison, test assertions

Could replace manual object comparisons:
```typescript
// Instead of manual comparison:
if (profile1.userId === profile2.userId && profile1.gateways.length === profile2.gateways.length) { ... }

// Use Bun.deepEquals:
if (Bun.deepEquals(profile1, profile2)) { ... }
```

**When to use**: Complex object comparisons in tests

### `Bun.inspect()` - Better Logging
**Use Case**: Error logging, debug output

Already implemented for error formatting:
```typescript
const errorMsg = Bun.inspect(error);
console.error('Failed to load dashboard:', errorMsg);
```

**Benefits**:
- Better formatting than `String(error)`
- Handles complex objects
- Consistent with `console.log` output

### `Bun.stringWidth()` - Terminal Formatting
**Use Case**: CLI output formatting

Could be used if we add CLI output:
```typescript
const width = Bun.stringWidth("\u001b[31mHello\u001b[0m"); // => 5 (ignores ANSI codes)
```

**When to use**: Terminal-based reporting or CLI tools

### `Bun.stripANSI()` - Clean Output
**Use Case**: Log file output, non-terminal contexts

Could strip ANSI codes when writing to files:
```typescript
const cleanOutput = Bun.stripANSI(coloredOutput);
await Bun.write('log.txt', cleanOutput);
```

**When to use**: Saving terminal output to files

## Performance Notes

According to Bun docs:
- `Bun.stringWidth()` is ~6,756x faster than `string-width` npm package
- `Bun.stripANSI()` is ~6-57x faster than `strip-ansi` npm package
- `Bun.nanoseconds()` has lower overhead than `performance.now()`

## References

- [Bun Utils Documentation](https://bun.com/docs/runtime/utils)
- [Bun API Reference](https://bun.com/docs/runtime/bun-apis)
