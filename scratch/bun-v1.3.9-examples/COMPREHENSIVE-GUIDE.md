# Bun v1.3.9 Comprehensive Guide

A complete guide to all features, improvements, and optimizations in Bun v1.3.9.

## 📋 Table of Contents

1. [Script Orchestration](#script-orchestration)
2. [HTTP/2 Connection Upgrades](#http2-connection-upgrades)
3. [Test Mock Auto-Cleanup](#test-mock-auto-cleanup)
4. [NO_PROXY Environment Variable](#noproxy-environment-variable)
5. [CPU Profiling](#cpu-profiling) *(archived)*
6. [ESM Bytecode Compilation](#esm-bytecode-compilation) *(archived)*
7. [Performance Improvements](#performance-improvements)
8. [Bugfixes](#bugfixes) *(archived)*
9. [Migration Guide](#migration-guide)

---

## 🚀 Script Orchestration

### `bun run --parallel` and `bun run --sequential`

Run multiple `package.json` scripts concurrently or sequentially with Foreman-style prefixed output.

**Key Features:**
- ✅ Parallel execution with interleaved output
- ✅ Sequential execution with prefixed output
- ✅ Workspace support (`--filter`, `--workspaces`)
- ✅ Glob pattern matching (`"build:*"`)
- ✅ Error handling (`--no-exit-on-error`)
- ✅ Missing script handling (`--if-present`)
- ✅ Automatic pre/post script grouping

**Examples:**
```bash
# Basic parallel execution
bun run --parallel build test lint

# Sequential execution
bun run --sequential build test

# Workspace support
bun run --parallel --filter '*' build
bun run --sequential --workspaces build

# Multiple scripts across packages
bun run --parallel --filter '*' build lint test

# Error tolerance
bun run --parallel --no-exit-on-error --filter '*' test

# Skip missing scripts
bun run --parallel --workspaces --if-present build
```

**Output Format:**
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

**Difference from `--filter`:**
- `--filter` respects dependency order (waits for dependencies)
- `--parallel`/`--sequential` do NOT respect dependency order (start immediately)

**Use Cases:**
- ✅ Independent scripts (build, lint, test)
- ✅ Watch mode for multiple services
- ✅ CI/CD pipelines
- ❌ Scripts with dependencies (use `--filter` instead)

[See examples →](parallel-scripts/)

---

## 🔌 HTTP/2 Connection Upgrades

The `net.Server → Http2SecureServer` connection upgrade pattern now works correctly.

**Use Case:** Libraries like `http2-wrapper`, `crawlee`, and custom HTTP/2 proxy servers.

**Example:**
```typescript
import { createServer } from "node:net";
import { createSecureServer } from "node:http2";
import { readFileSync } from "node:fs";

const h2Server = createSecureServer({
  key: readFileSync("key.pem"),
  cert: readFileSync("cert.pem"),
});

h2Server.on("stream", (stream, headers) => {
  stream.respond({ ":status": 200 });
  stream.end("Hello over HTTP/2!");
});

const netServer = createServer((rawSocket) => {
  // Forward the raw TCP connection to the HTTP/2 server
  h2Server.emit("connection", rawSocket);
});

netServer.listen(8443);
```

**What Changed:**
- Previously: `h2Server.emit("connection", rawSocket)` was broken
- Now: Works correctly for proxy infrastructure

[See examples →](http2-proxy/)

---

## 🧪 Test Mock Auto-Cleanup

`mock()` and `spyOn()` now implement `Symbol.dispose`, enabling automatic cleanup with the `using` keyword.

**Benefits:**
- ✅ Automatic mock restoration when scope exits
- ✅ No need for manual `mockRestore()` calls
- ✅ No need to rely on `afterEach` cleanup
- ✅ Works with exceptions (cleanup happens automatically)

**Example:**
```typescript
import { spyOn, mock, expect, test } from "bun:test";

test("auto-restores spy", () => {
  const obj = { method: () => "original" };

  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    expect(obj.method()).toBe("mocked");
  }

  // Automatically restored when `spy` leaves scope
  expect(obj.method()).toBe("original");
});

// Works with mock() too
const fn = mock(() => "original");
fn();
expect(fn).toHaveBeenCalledTimes(1);

fn[Symbol.dispose](); // same as fn.mockRestore()
expect(fn).toHaveBeenCalledTimes(0);
```

**Best Practices:**
- Use `using` for automatic cleanup
- Works even if exceptions occur
- Can manually call `mockRestore()` if needed

[See examples →](tests/mock-auto-cleanup.test.ts)

---

## 🌐 NO_PROXY Environment Variable

`NO_PROXY` is now always respected, even when a proxy is explicitly provided via the `proxy` option.

**What Changed:**
- Previously: `NO_PROXY` only worked with auto-detected proxies
- Now: `NO_PROXY` always checked, even with explicit proxy settings

**Example:**
```typescript
// NO_PROXY=localhost
// Previously, this would still use the proxy. Now it correctly bypasses it.
await fetch("http://localhost:3000/api", {
  proxy: "http://my-proxy:8080",
});

// Same fix applies to WebSocket
const ws = new WebSocket("ws://localhost:3000/ws", {
  proxy: "http://my-proxy:8080",
});
```

**Impact:**
- Local development services correctly bypass corporate proxies
- Internal services don't go through proxy unnecessarily
- Better performance for localhost connections

[See examples →](http2-proxy/no-proxy-demo.ts)

---

## 📊 CPU Profiling *(archived)*

> **Note:** The full set of CPU profiling examples has been moved to `archive/scratch/bun-v1.3.9-examples/advanced/cpu-profiling/`.

Bun now supports the `--cpu-prof-interval` flag to configure the CPU profiler's sampling interval.

**Usage:**
```bash
# Sample every 500μs for higher resolution profiling
bun --cpu-prof --cpu-prof-interval 500 index.js

# Default interval is 1000μs (1ms)
bun --cpu-prof index.js
```

**Note:** If used without `--cpu-prof` or `--cpu-prof-md`, Bun will emit a warning.

**Use Cases:**
- High-resolution performance profiling
- Identifying micro-optimization opportunities
- Comparing performance across different intervals

[See examples →](profiling/)

---

## 📦 ESM Bytecode Compilation *(archived)*

Using `--bytecode` with `--format=esm` is now supported.

**Usage:**
```bash
# ESM bytecode (NEW in v1.3.9)
bun build --compile --bytecode --format=esm ./cli.ts

# CJS bytecode (existing)
bun build --compile --bytecode --format=cjs ./cli.ts

# Without explicit format, defaults to CommonJS
bun build --compile --bytecode ./cli.ts
```

**Note:** In a future version, the default may change to ESM when `--bytecode` is used.

[See examples →](archive/scratch/bun-v1.3.9-examples/esm-bytecode/) (archived)

---

## ⚡ Performance Improvements

### RegExp JIT Optimization

**3.9x speedup** for fixed-count regex patterns.

**JIT-optimized patterns:**
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

**SIMD Acceleration:**
- ARM64: Uses TBL2 instructions
- x86_64: Uses PTEST instructions
- Scans 16 bytes at a time for prefix matching

### Markdown Rendering

**Improvements:**
- **3-15% faster** Markdown-to-HTML rendering (SIMD-accelerated HTML escaping)
- **28% faster** `Bun.markdown.react()` for small documents (121 chars)
- **7% faster** for medium documents (1,039 chars)
- **7.4% faster** for large documents (20,780 chars)
- **40% reduction** in string object allocations
- **6% smaller** heap size during rendering

**Optimizations:**
- SIMD-accelerated scanning for HTML escaping (`&`, `<`, `>`, `"`)
- Cached frequently-used HTML tag strings (`div`, `p`, `h1`-`h6`, etc.)

### String Optimizations

**String#startsWith:**
- **1.42x faster** (general case)
- **5.76x faster** with constant folding (when both string and prefix are known at compile time)
- **1.22x faster** with index parameter

**String#trim:**
- **1.17x faster** (`trim`)
- **1.10x faster** (`trimStart`)
- **1.42x faster** (`trimEnd`)

**String#replace:**
- Returns ropes (lazy concatenation) instead of eager copy
- Avoids unnecessary allocations for short-lived results
- Aligns with V8's behavior

### Collection Optimizations

**Set#size and Map#size:**
- **2.24x faster** (`Set#size`)
- **2.74x faster** (`Map#size`)
- Now handled as intrinsics in DFG/FTL tiers
- Eliminates generic getter call overhead

### AbortSignal Optimization

**AbortSignal.abort():**
- **~6% faster** when no listeners are registered
- Skips creating and dispatching `Event` object
- Saves ~16ms per 1M calls

[See benchmarks →](benchmarks/)

---

## 🐛 Bugfixes *(archived)*

> **Note:** Detailed bugfix examples have been moved to `archive/scratch/bun-v1.3.9-examples/advanced/bugfixes/`.

### Node.js Compatibility

- ✅ Fixed: `existsSync('.')`, `statSync('.')` incorrectly failing on Windows
- ✅ Fixed: `Function.prototype.toString()` whitespace now matches V8/Node.js
- ✅ Fixed: 3 rare crashes in `node:http2`

### Bun APIs

- ✅ Fixed: `Bun.stringWidth` incorrectly reporting Thai SARA AA (`U+0E32`), SARA AM (`U+0E33`), and their Lao equivalents (`U+0EB2`, `U+0EB3`) as zero-width characters

### Web APIs

- ✅ Fixed: Crash in `WebSocket` client when using `binaryType = "blob"` with no event listener
- ✅ Fixed: Sequential HTTP requests with proxy-style absolute URLs hanging on 2nd+ request
- ✅ Fixed: Security issue in HTTP server chunked encoding parser (request smuggling)

### TypeScript Types

- ✅ Fixed: `Bun.Build.CompileTarget` missing SIMD variants
- ✅ Fixed: Missing `bun-linux-x64-baseline` and `bun-linux-x64-modern` compile target types
- ✅ Fixed: `Socket.reload()` TypeScript types now correctly expect `{ socket: handler }`

### Platform-Specific

- ✅ Fixed: Illegal instruction (SIGILL) crashes on ARMv8.0 aarch64 CPUs
  - Affected: Cortex-A53, Raspberry Pi 4, AWS a1 instances
  - Now correctly targets ARMv8.0 using outline atomics

---

## 📚 Migration Guide

### Immediate Actions

1. **Upgrade Bun:**
   ```bash
   bun upgrade
   ```

2. **Test parallel execution:**
   ```bash
   bun run --parallel build test lint
   ```

3. **Update test mocks:**
   ```typescript
   // Before
   const spy = spyOn(obj, "method");
   // ... test code ...
   spy.mockRestore(); // Manual cleanup

   // After
   {
     using spy = spyOn(obj, "method");
     // ... test code ...
   } // Automatic cleanup
   ```

4. **Audit regex patterns:**
   ```bash
   # Find patterns that could benefit from JIT
   grep -rE '\(\?:.*\)\{\d+\}' src/   # Fixed-count non-capturing
   grep -rE '\(.*\)\{\d+\}' src/      # Fixed-count capturing
   ```

### Performance Optimization Opportunities

1. **Regex Patterns:**
   - Use `{n}` instead of `+` when count is known
   - Use `(?:...)` for non-capturing groups
   - Use literal alternatives with common prefixes

2. **Markdown Rendering:**
   - Larger documents with fewer special characters see biggest gains
   - Use `Bun.markdown.react()` for React components

3. **String Operations:**
   - Use string literals when possible (constant folding)
   - No code changes needed - optimizations are automatic

### Breaking Changes

None! All changes are backward compatible.

### Known Issues

- Windows shell interpreter GC segfaults (issue #26625)
  - Workaround: Avoid `shell: true` in `Bun.spawn()` on Windows
  - Use parameterized commands instead

---

## 🎯 Quick Reference

| Feature | Command/Code | Improvement |
|---------|-------------|-------------|
| Parallel scripts | `bun run --parallel build test` | New feature |
| Sequential scripts | `bun run --sequential build test` | New feature |
| Mock auto-cleanup | `using spy = spyOn(...)` | New feature |
| NO_PROXY | `NO_PROXY=localhost bun test` | Fixed |
| CPU profiling | `bun --cpu-prof --cpu-prof-interval 500` | New feature |
| ESM bytecode | `bun build --compile --bytecode --format=esm` | New feature |
| Fixed-count regex | `/(?:abc){3}/` | 3.9x faster |
| Markdown (small) | `Bun.markdown.react()` | 28% faster |
| String#startsWith | Automatic | 1.42x faster |
| Set#size | Automatic | 2.24x faster |
| Map#size | Automatic | 2.74x faster |

---

## 📖 Additional Resources

- [Full Release Notes](https://bun.com/blog/bun-v1.3.9)
- [Bun Documentation](https://bun.sh/docs)
- [Examples Directory](./README.md)
- [Quick Reference](./QUICK-REFERENCE.md)
- [Benchmarks](./benchmarks/)

---

## 🙏 Credits

Thanks to all contributors who made Bun v1.3.9 possible:
- @alistair (ESM bytecode)
- @billywhizz (Markdown performance)
- @sosukesuzuki (AbortSignal optimization)
- And many more!
