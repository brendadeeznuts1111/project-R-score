# 🚀 Bun Utils Integration

This document outlines how we leverage Bun's utility functions throughout the dev dashboard for better performance, reliability, and functionality.

## Integrated Utilities

### `Bun.main` - Entry Point Detection

**Location**: `enhanced-dashboard.ts` - Startup logging

Used to verify the script is being directly executed vs imported:

```typescript
const isMainEntry = import.meta.path === Bun.main;
logger.info(`Entry: ${isMainEntry ? '✅ Main script' : '⚠️ Imported module'}`);
```

**Benefits**:
- Verify correct execution context
- Debug import vs execution issues
- Better error messages

**Also Used In**: `benchmark-runner.ts` to ensure it's run directly

### `Bun.sleep()` - Async Delays

**Location**: `enhanced-dashboard.ts` - Benchmark warmup

Used for warmup delays before large benchmarks:

```typescript
// Warmup: Let the system stabilize
if (iterations > 50) {
  await Bun.sleep(10); // 10ms warmup for large batches
}
```

**Benefits**:
- System stabilization before benchmarks
- More consistent benchmark results
- Non-blocking async delays

**Also Used In**: `benchmark-runner.ts` for warmup periods

### `Bun.which()` - Executable Detection

**Location**: `enhanced-dashboard.ts` - Subprocess spawning

Used to verify `bun` is available before spawning:

```typescript
const bunPath = Bun.which('bun');
if (!bunPath) {
  throw new Error('bun executable not found in PATH');
}

const proc = Bun.spawn({
  cmd: [bunPath, 'run', benchmarkRunnerPath],
  // ...
});
```

**Benefits**:
- Better error messages
- Verify dependencies before execution
- More reliable subprocess spawning

### `Bun.randomUUIDv7()` - Unique IDs

**Location**: 
- `enhanced-dashboard.ts` - Benchmark run tracking
- `benchmark-runner.ts` - Run identification

Used for generating unique benchmark run IDs:

```typescript
// Generate unique run ID using Bun.randomUUIDv7 for tracking
const runId = Bun.randomUUIDv7('base64url'); // Shorter ID for logging
```

**Benefits**:
- Monotonic UUIDs (sortable by time)
- Unique run tracking
- Shorter base64url encoding for logs
- Thread-safe counter (no collisions)

**Why UUID v7**:
- Timestamp-based (sortable)
- Better for databases
- Monotonic (no collisions in same millisecond)

### `Bun.peek()` - Promise Optimization

**Location**: Available for future optimization

Can be used to check promise status without awaiting:

```typescript
const promise = someAsyncOperation();
const peeked = Bun.peek(promise);

if (peeked !== promise) {
  // Already resolved, use peeked value
} else {
  // Still pending, await normally
}
```

**Use Cases**:
- Hot path optimization
- Reduce microticks
- Check if async work is already done

**Note**: Advanced API - use only when needed for performance

### `Bun.version` & `Bun.revision` - Version Info

**Location**: `enhanced-dashboard.ts` - Startup logging

Used for displaying runtime information:

```typescript
const bunVersion = Bun.version;
const bunRevision = Bun.revision?.substring(0, 8) || 'unknown';
logger.info(`Bun: v${bunVersion} (${bunRevision})`);
```

**Benefits**:
- Debug version-specific issues
- Display runtime environment
- Better support diagnostics

## Performance Impact

### Benchmarks

- **Warmup Delays**: `Bun.sleep()` adds ~5-10ms warmup for consistency
- **UUID Generation**: `Bun.randomUUIDv7()` is fast (~50ns per ID)
- **Executable Lookup**: `Bun.which()` is cached, minimal overhead

### Best Practices

1. **Use `Bun.sleep()`** for warmup periods before benchmarks
2. **Use `Bun.which()`** to verify executables before spawning
3. **Use `Bun.randomUUIDv7()`** for unique IDs (better than crypto.randomUUID)
4. **Use `Bun.main`** to verify execution context
5. **Use `Bun.peek()`** sparingly (advanced optimization only)

## Examples

### Warmup Before Benchmark

```typescript
// Let system stabilize before large benchmark
if (iterations > 100) {
  await Bun.sleep(10); // 10ms warmup
}
const start = Bun.nanoseconds();
// ... run benchmark ...
```

### Verify Executable Before Spawn

```typescript
const bunPath = Bun.which('bun');
if (!bunPath) {
  throw new Error('bun not found');
}
const proc = Bun.spawn({ cmd: [bunPath, 'run', script] });
```

### Generate Unique Run ID

```typescript
const runId = Bun.randomUUIDv7('base64url'); // Short, sortable ID
logger.info(`Benchmark run: ${runId}`);
```

### Check Execution Context

```typescript
if (import.meta.path === Bun.main) {
  // Running directly
  startServer();
} else {
  // Imported as module
  export { startServer };
}
```

## References

- [Bun Utils Documentation](https://bun.com/docs/runtime/utils)
- [Bun.main](https://bun.com/docs/runtime/utils#bun-main)
- [Bun.sleep](https://bun.com/docs/runtime/utils#bun-sleep)
- [Bun.which](https://bun.com/docs/runtime/utils#bun-which)
- [Bun.randomUUIDv7](https://bun.com/docs/runtime/utils#bun-randomuuidv7)
- [Bun.peek](https://bun.com/docs/runtime/utils#bun-peek)
