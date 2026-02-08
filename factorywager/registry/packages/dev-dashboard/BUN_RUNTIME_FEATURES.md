# 🚀 Bun Runtime Features Integration

This document outlines how we leverage Bun's runtime features for optimal development and production performance.

## Runtime Features Used

### Hot Module Replacement (HMR)

**Location**: `enhanced-dashboard.ts` - Server configuration

Enabled automatically in development mode:

```typescript
Bun.serve({
  development: {
    hmr: process.env.NODE_ENV !== 'production',
    watch: process.env.NODE_ENV !== 'production',
  },
  // ...
});
```

**Benefits**:
- Auto-reload on file changes
- Faster development iteration
- No manual server restarts needed

**Usage**:
```bash
# Development mode (HMR enabled)
bun run dev-dashboard

# Production mode (HMR disabled)
NODE_ENV=production bun run dev-dashboard
```

### Watch Mode

**Location**: Package.json scripts

Use `--watch` flag for automatic restarts:

```bash
bun --watch run dev-dashboard
```

**Benefits**:
- Restarts server on code changes
- Faster development workflow
- No manual restarts

**Note**: Put `--watch` immediately after `bun`, not after `run`:
```bash
bun --watch run dev-dashboard  # ✅ Correct
bun run dev-dashboard --watch  # ❌ Wrong (flag ignored)
```

### Direct Execution (No `bun run`)

**Location**: `enhanced-dashboard.ts` - Subprocess spawning

For subprocesses, we use direct execution (faster):

```typescript
const proc = Bun.spawn({
  cmd: [bunPath, benchmarkRunnerPath], // Direct execution
  // Not: [bunPath, 'run', benchmarkRunnerPath]
});
```

**Benefits**:
- Faster startup (no `run` overhead)
- Lower latency for subprocesses
- Better for isolated benchmarks

### Entry Point Detection

**Location**: `enhanced-dashboard.ts` - Startup logging

Using `Bun.main` to verify execution context:

```typescript
const isMainEntry = import.meta.path === Bun.main;
logger.info(`Entry: ${isMainEntry ? '✅ Main script' : '⚠️ Imported module'}`);
```

**Benefits**:
- Verify correct execution
- Debug import vs execution issues
- Better error messages

### Runtime Version Info

**Location**: `enhanced-dashboard.ts` - Startup logging

Display Bun version and revision:

```typescript
const bunVersion = Bun.version;
const bunRevision = Bun.revision?.substring(0, 8) || 'unknown';
logger.info(`Bun: v${bunVersion} (${bunRevision})`);
```

**Benefits**:
- Debug version-specific issues
- Display runtime environment
- Better support diagnostics

## Available Runtime Flags

### Development Flags

**`--watch`**: Auto-restart on file changes
```bash
bun --watch run dev-dashboard
```

**`--hot`**: Enable hot reload
```bash
bun --hot run dev-dashboard
```

**`--no-clear-screen`**: Keep terminal output on reload
```bash
bun --watch --no-clear-screen run dev-dashboard
```

### Performance Flags

**`--smol`**: Reduce memory usage (for constrained environments)
```bash
bun --smol run dev-dashboard
```

**`--console-depth`**: Control object inspection depth
```bash
bun --console-depth 5 run dev-dashboard
```

### Debugging Flags

**`--inspect`**: Enable debugger
```bash
bun --inspect run dev-dashboard
```

**`--inspect-brk`**: Break on first line
```bash
bun --inspect-brk run dev-dashboard
```

## Recommended Usage

### Development

```bash
# With auto-reload
bun --watch run dev-dashboard

# With hot reload
bun --hot run dev-dashboard

# With both
bun --watch --hot run dev-dashboard
```

### Production

```bash
# Standard production mode
NODE_ENV=production bun run dev-dashboard

# Memory-constrained environments
NODE_ENV=production bun --smol run dev-dashboard
```

### Benchmarking

```bash
# With isolation enabled
BENCHMARK_ISOLATION=true bun run dev-dashboard

# With memory profiling
BENCHMARK_ISOLATION=true bun --smol run dev-dashboard
```

## Performance Notes

### Startup Time

- **Bun**: ~5-6ms (vs Node.js ~25ms)
- **4x faster** startup time
- **Zero overhead** for TypeScript/JSX

### Runtime Performance

- **JavaScriptCore** engine (Safari)
- **Faster** than V8 in most cases
- **Native transpiler** (Zig-based)

### Memory Usage

- **`--smol` flag**: Reduces memory at cost of performance
- **Auto-adjusts** based on available memory
- **Cgroup-aware** memory limits

## References

- [Bun Runtime Documentation](https://bun.com/docs/runtime)
- [Bun CLI Usage](https://bun.com/docs/cli/bun)
- [Hot Module Replacement](https://bun.com/docs/runtime/hot)
