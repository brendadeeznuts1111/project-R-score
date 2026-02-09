# Bun v1.3.9 Migration & Implementation Guide

Quick reference for upgrading to Bun v1.3.9 with practical examples.

---

## 1. Script Runner Modes

### Parallel Execution (for watch scripts)

**Before:**
```bash
# Ran sequentially, slow startup
bun run dev
```

**After v1.3.9:**
```bash
# Run all dev scripts in parallel
bun run --parallel --filter="*" dev

# Run specific workspace scripts
bun run --parallel --filter="@scope/*" build

# Don't stop on error (continue others)
bun run --parallel --filter="*" --no-exit-on-error ci
```

**Use Cases:**
```bash
# Frontend + Backend + Database all at once
bun run --parallel dev server client db

# Multiple package builds
bun run --parallel --filter="packages/*" build
```

### Sequential Execution (for memory-constrained builds)

**Before:**
```bash
# May run out of memory with many parallel builds
bun run build
```

**After v1.3.9:**
```bash
# Run one at a time, predictable memory usage
bun run --sequential build

# With workspace filtering
bun run --sequential --workspaces build:prod
```

---

## 2. Test Mock Auto-Cleanup

### Before (Manual Cleanup)

```typescript
import { describe, test, expect, spyOn, mock } from "bun:test";

describe("UserService", () => {
  let spy: ReturnType<typeof spyOn>;
  let mockFetch: ReturnType<typeof mock>;
  
  beforeEach(() => {
    spy = spyOn(UserService, "validate");
    mockFetch = mock(globalThis, "fetch");
  });
  
  afterEach(() => {
    spy.mockRestore();      // Manual cleanup
    mockFetch.mockRestore(); // Manual cleanup
  });
  
  test("validation", () => {
    spy.mockReturnValue(true);
    // ... test code
  });
});
```

### After v1.3.9 (Auto-Cleanup with `using`)

```typescript
import { describe, test, expect, spyOn, mock } from "bun:test";

describe("UserService", () => {
  // No beforeEach/afterEach needed!
  
  test("validation with spy", () => {
    {
      using spy = spyOn(UserService, "validate");
      spy.mockReturnValue(true);
      
      expect(UserService.validate("anything")).toBe(true);
      
    } // ← spy automatically restored here
    
    // Original behavior restored
    expect(UserService.validate("invalid")).toBe(false);
  });
  
  test("fetch mocking", async () => {
    {
      using mockFetch = mock(globalThis, "fetch");
      mockFetch.mockResolvedValue(new Response('{"id":1}'));
      
      const result = await fetch("/api/user");
      expect(mockFetch).toHaveBeenCalled();
      
    } // ← fetch automatically restored
  });
  
  test("multiple mocks", () => {
    {
      using spyValidate = spyOn(UserService, "validate");
      using spyCreate = spyOn(UserService, "create");
      using mockDate = mock(Date, "now");
      
      // All mocks active
      
    } // ← All automatically restored
  });
});
```

### Migration Checklist

- [ ] Remove `beforeEach` setup for mocks
- [ ] Remove `afterEach` cleanup
- [ ] Add `using` keyword before `spyOn()` and `mock()`
- [ ] Wrap test code in blocks `{ }` for scope-based cleanup
- [ ] Remove manual `mockRestore()` calls

---

## 3. NO_PROXY Verification

### Test Script

```typescript
// proxy-tests/no-proxy.test.ts
import { describe, test, expect } from "bun:test";

describe("NO_PROXY behavior", () => {
  test("localhost bypasses explicit proxy", async () => {
    // NO_PROXY=localhost should bypass even with explicit proxy
    const response = await fetch("http://localhost:3000/health", {
      proxy: "http://corporate-proxy:8080"  // Should be bypassed!
    });
    
    expect(response.status).toBe(200);
  });
  
  test("external uses explicit proxy", async () => {
    // External URLs should use the proxy
    const response = await fetch("https://api.example.com/data", {
      proxy: "http://corporate-proxy:8080"
    });
    
    expect(response.status).toBe(200);
  });
});
```

### Run Tests

```bash
# Test with NO_PROXY set
NO_PROXY=localhost,127.0.0.1 bun test proxy-tests/

# Test different scenarios
NO_PROXY=localhost bun test proxy-tests/local.test.ts
NO_PROXY="*.internal.com" bun test proxy-tests/internal.test.ts
```

### Environment Configuration

```bash
# .env.test
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,*.local,test-host
```

---

## 4. ESM Bytecode for CLI Tools

### Build Configuration

```json
// package.json
{
  "name": "my-cli",
  "type": "module",
  "scripts": {
    "build": "bun build --compile --bytecode --format=esm ./src/cli.ts --outfile ./dist/my-cli",
    "build:smol": "bun build --compile --bytecode --format=esm --minify ./src/cli.ts --outfile ./dist/my-cli"
  }
}
```

### CLI Source (ESM with top-level await)

```typescript
// src/cli.ts
#!/usr/bin/env bun

import { parseArgs } from "util";
import { loadConfig } from "./config.js";

// Top-level await works in ESM bytecode!
const config = await loadConfig();

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
  allowPositionals: true,
});

// CLI implementation...
console.log("Config loaded:", config);
```

### GitHub Actions Workflow

```yaml
# .github/workflows/build.yml
name: Build CLI

on: [push]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Build ESM bytecode
        run: bun run build
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: my-cli-${{ matrix.os }}
          path: dist/my-cli*
```

---

## 5. Higher-Resolution Profiling

### Performance Tuning

```bash
# Default (1000μs intervals)
bun --cpu-prof benchmark.js

# High resolution (500μs) - more detail
bun --cpu-prof --cpu-prof-interval 500 benchmark.js

# Ultra high resolution (250μs) - maximum detail
bun --cpu-prof --cpu-prof-interval 250 benchmark.js

# Very high resolution (100μs) - use sparingly
bun --cpu-prof --cpu-prof-interval 100 benchmark.js
```

### Analysis Script

```typescript
// analyze-profile.ts
import { readFileSync } from "fs";

interface ProfileNode {
  functionName: string;
  url: string;
  lineNumber: number;
  callCount: number;
  selfTime: number;
  totalTime: number;
  children: ProfileNode[];
}

function analyzeProfile(profilePath: string) {
  const profile = JSON.parse(readFileSync(profilePath, "utf-8"));
  
  // Find hottest functions
  const nodes: ProfileNode[] = [];
  
  function collectNodes(node: any) {
    nodes.push({
      functionName: node.callFrame.functionName,
      url: node.callFrame.url,
      lineNumber: node.callFrame.lineNumber,
      callCount: node.hitCount,
      selfTime: node.selfTime || 0,
      totalTime: node.totalTime || 0,
      children: (node.children || []).map(collectNodes)
    });
    
    (node.children || []).forEach(collectNodes);
  }
  
  collectNodes(profile.nodes[0]);
  
  // Sort by self time
  const hotFunctions = nodes
    .filter(n => n.selfTime > 0)
    .sort((a, b) => b.selfTime - a.selfTime)
    .slice(0, 10);
  
  console.log("🔥 Hottest Functions:");
  hotFunctions.forEach((fn, i) => {
    console.log(`${i + 1}. ${fn.functionName} (${fn.url}:${fn.lineNumber})`);
    console.log(`   Self time: ${(fn.selfTime / 1000).toFixed(2)}ms`);
    console.log(`   Call count: ${fn.callCount}`);
  });
  
  return hotFunctions;
}

const profileFile = process.argv[2];
if (profileFile) {
  analyzeProfile(profileFile);
} else {
  console.log("Usage: bun run analyze-profile.ts <profile.cpuprofile>");
}
```

### Profiling Workflow

```bash
# 1. Profile with high resolution
bun --cpu-prof --cpu-prof-interval 250 benchmark.js

# 2. Find the profile file
ls -la *.cpuprofile

# 3. Analyze
bun run analyze-profile.ts CPU.*.cpuprofile

# 4. Or view in speedscope
bun x speedscope CPU.*.cpuprofile
```

---

## 6. RegExp JIT Optimization

### Audit Your Codebase

```bash
# Find potentially optimizable patterns
grep -rE '\([^)]*\)\{[0-9]+\}' src/           # Fixed-count groups
grep -rE '\(\?:[^)]*\)\{[0-9]+\}' src/        # Fixed non-capturing
grep -rE '\([^)]*\)\+[^(]' src/               # Variable + (could optimize?)

# Check for problematic patterns
grep -rE '\([^)]*\)\{[0-9]+,[0-9]*\}' src/     # Variable range (no JIT)
grep -rE '\([^)]*\)\*' src/                   # Zero-or-more (no JIT)
```

### Optimization Examples

```typescript
// ❌ Variable count - NO JIT
const slowRegex = /(?:abc)+/;

// ✅ Fixed count - JIT OPTIMIZED (3.9x faster)
const fastRegex = /(?:abc){3}/;

// ❌ Nested quantifiers - NO JIT
const slowNested = /(a+)*b/;

// ✅ Fixed count - JIT OPTIMIZED
const fastNested = /(a+){2}b/;
```

---

## Quick Reference Commands

```bash
# Upgrade Bun
bun upgrade

# Check version
bun --version  # Should be 1.3.9+

# Parallel script execution
bun run --parallel --filter="*" dev

# Sequential builds
bun run --sequential build

# ESM bytecode compilation
bun build --compile --bytecode --format=esm ./cli.ts

# High-res profiling
bun --cpu-prof --cpu-prof-interval 250 app.ts

# Test with NO_PROXY
NO_PROXY=localhost bun test
```
