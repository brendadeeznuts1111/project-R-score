# Bun v1.3.9 Migration Guide

Complete guide for migrating to Bun v1.3.9 and leveraging new features.

## 🚀 Quick Checklist

- [ ] Upgrade Bun: `bun upgrade`
- [ ] Test parallel scripts: `bun run --parallel build test`
- [ ] Update tests to use `using` keyword for mocks
- [ ] Verify NO_PROXY settings for local development
- [ ] Try ESM bytecode compilation for CLI tools
- [ ] Audit regex patterns for JIT optimization opportunities

## 📦 Installation

```bash
# Upgrade to latest Bun
bun upgrade

# Verify version
bun --version  # Should be 1.3.9 or later
```

## 🔄 Major Changes

### 1. Script Orchestration (NEW)

**Before (v1.3.8):**
```bash
# Scripts ran sequentially, slow for independent tasks
bun run build
bun run test
bun run lint
```

**After (v1.3.9):**
```bash
# Run scripts in parallel
bun run --parallel build test lint

# Or sequentially with better output
bun run --sequential build test lint

# Workspace support
bun run --parallel --filter '*' build
```

**Migration:**
```json
// package.json
{
  "scripts": {
    "ci:old": "bun run build && bun run test && bun run lint",
    "ci:new": "bun run --parallel build test lint"
  }
}
```

### 2. Test Mock Auto-Cleanup (NEW)

**Before (v1.3.8):**
```typescript
import { describe, test, beforeEach, afterEach, spyOn } from "bun:test";

describe("MyService", () => {
  let spy: ReturnType<typeof spyOn>;
  
  beforeEach(() => {
    spy = spyOn(MyService, "method");
  });
  
  afterEach(() => {
    spy.mockRestore();
  });
  
  test("example", () => {
    spy.mockReturnValue("mocked");
    // Test code...
  });
});
```

**After (v1.3.9):**
```typescript
import { describe, test, spyOn } from "bun:test";

describe("MyService", () => {
  test("example", () => {
    using spy = spyOn(MyService, "method");
    spy.mockReturnValue("mocked");
    // Test code...
  } // ← Automatic cleanup!
  );
});
```

### 3. NO_PROXY Enforcement (FIXED)

**Before (v1.3.8):**
```typescript
// NO_PROXY=localhost
// This would still use the proxy - BUG!
await fetch("http://localhost:3000", {
  proxy: "http://corporate-proxy:8080"
});
```

**After (v1.3.9):**
```typescript
// NO_PROXY=localhost  
// This correctly bypasses the proxy - FIXED!
await fetch("http://localhost:3000", {
  proxy: "http://corporate-proxy:8080"  // Bypassed for localhost
});
```

**Action:** No code changes needed, but verify your local development setup works correctly now.

### 4. ESM Bytecode Compilation (NEW)

**Before (v1.3.8):**
```bash
# --bytecode only worked with --format=cjs
bun build --compile --bytecode --format=cjs ./cli.ts
```

**After (v1.3.9):**
```bash
# Now ESM bytecode works too!
bun build --compile --bytecode --format=esm ./cli.ts

# Top-level await works in ESM bytecode
```

**Migration for CLI tools:**
```json
// package.json
{
  "name": "my-cli",
  "type": "module",
  "scripts": {
    "build": "bun build --compile --bytecode --format=esm ./src/cli.ts --outfile ./dist/my-cli"
  }
}
```

### 5. CPU Profiling Interval (NEW)

**Before (v1.3.8):**
```bash
# Fixed 1000μs interval only
bun --cpu-prof app.ts
```

**After (v1.3.9):**
```bash
# Configurable interval
bun --cpu-prof --cpu-prof-interval 500 app.ts  # 500μs
bun --cpu-prof --cpu-prof-interval 250 app.ts  # 250μs
```

### 6. HTTP/2 Connection Upgrade (FIXED)

**Before (v1.3.8):**
```typescript
// This pattern was broken
const netServer = createServer((rawSocket) => {
  h2Server.emit("connection", rawSocket); // ❌ Didn't work
});
```

**After (v1.3.9):**
```typescript
// Now works correctly
const netServer = createServer((rawSocket) => {
  h2Server.emit("connection", rawSocket); // ✅ Works!
});
```

## ⚡ Performance Optimizations

### RegExp JIT (3.9x speedup)

**Audit your patterns:**
```bash
# Find optimizable patterns
grep -rE '\(\?:.*\)\{\d+\}' src/  # Fixed-count non-capturing
grep -rE '\(.*\)\{\d+\}' src/     # Fixed-count capturing
```

**Optimize:**
```typescript
// Before (slower)
const pattern = /(?:abc)+/;

// After (3.9x faster)
const pattern = /(?:abc){3}/;  // Use fixed count when possible
```

### String Optimizations (Automatic)

No code changes needed! These are automatically faster:
- `String#startsWith` - 1.42x faster (5.76x with constants)
- `String#trim` - 1.17x faster
- `String#trimEnd` - 1.42x faster

### Collection Optimizations (Automatic)

No code changes needed! These are automatically faster:
- `Set#size` - 2.24x faster
- `Map#size` - 2.74x faster

## 🧪 Testing Migration

### Update Test Files

```typescript
// BEFORE
import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";

describe("UserService", () => {
  let fetchSpy: ReturnType<typeof spyOn>;
  
  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch");
  });
  
  afterEach(() => {
    fetchSpy.mockRestore();
  });
  
  test("fetches user", async () => {
    fetchSpy.mockResolvedValue(new Response('{"id": 1}'));
    // Test...
  });
});

// AFTER
import { describe, test, expect, spyOn } from "bun:test";

describe("UserService", () => {
  test("fetches user", async () => {
    using fetchSpy = spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValue(new Response('{"id": 1}'));
    // Test...
  } // Automatic cleanup
  );
});
```

### Run Tests with NO_PROXY

```bash
# Ensure local tests don't go through proxy
NO_PROXY=localhost,127.0.0.1 bun test
```

## 🔧 Build Configuration

### Package.json Scripts

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --parallel --filter '*' dev",
    "build": "bun run --sequential build:types build:js build:css",
    "build:types": "tsc --emitDeclarationOnly",
    "build:js": "bun build --target=browser ./src/index.ts --outdir ./dist",
    "build:css": "tailwindcss -i ./src/styles.css -o ./dist/styles.css",
    "test": "bun test",
    "test:ci": "bun run --parallel --no-exit-on-error --filter '*' test",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "ci": "bun run --parallel lint test build"
  }
}
```

### CI/CD Configuration

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Lint
        run: bun run lint
      
      - name: Test
        run: bun test
        env:
          NO_PROXY: localhost,127.0.0.1
      
      - name: Build
        run: bun run build
      
      - name: Profile (optional)
        run: bun --cpu-prof --cpu-prof-interval 500 benchmark.ts
      
      - name: Upload profile
        uses: actions/upload-artifact@v3
        with:
          name: cpu-profile
          path: CPU.*.cpuprofile
```

## 📊 Performance Checklist

- [ ] Audit regex patterns for JIT opportunities
- [ ] Profile hot paths with `--cpu-prof-interval`
- [ ] Benchmark critical code paths before/after migration
- [ ] Verify `Set#size` and `Map#size` usage patterns
- [ ] Check `String#startsWith` with constant strings

## 🐛 Troubleshooting

### Parallel Scripts Not Working

```bash
# Check Bun version
bun --version  # Must be 1.3.9+

# Verify scripts exist
bun run --parallel script1 script2  # All must exist in package.json
```

### Mock Cleanup Not Working

```typescript
// Ensure you're using 'using' keyword
using spy = spyOn(obj, "method");  // ✓ Correct
const spy = spyOn(obj, "method");   // ✗ Won't auto-cleanup
```

### NO_PROXY Not Respected

```bash
# Check environment variable
env | grep NO_PROXY

# Test with explicit proxy
NO_PROXY=localhost bun run test
```

### ESM Bytecode Build Fails

```bash
# Ensure "type": "module" in package.json
# Check for CommonJS require() calls
# Verify all imports use ESM syntax
```

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun v1.3.9 Release Notes](https://bun.com/blog/bun-v1.3.9)
- [Example Files](../README.md)
- [Performance Benchmarks](./benchmarks/)

## 🙏 Getting Help

- [Bun Discord](https://discord.gg/bun)
- [Bun GitHub Issues](https://github.com/oven-sh/bun/issues)
- [Bun GitHub Discussions](https://github.com/oven-sh/bun/discussions)
