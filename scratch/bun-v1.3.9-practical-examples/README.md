# Bun v1.3.9 Practical Examples

Ready-to-use examples for the five key migration tasks.

## 📂 Files

| File | Purpose | Run Command |
|------|---------|-------------|
| `auto-cleanup.test.ts` | Mock auto-cleanup examples | `bun test auto-cleanup.test.ts` |
| `proxy.test.ts` | NO_PROXY verification tests | `NO_PROXY=localhost bun test proxy.test.ts` |
| `cli.ts` | ESM bytecode CLI template | `bun build --compile --bytecode --format=esm ./cli.ts` |
| `benchmark.ts` | High-res profiling demo | `bun --cpu-prof --cpu-prof-interval 250 benchmark.ts` |

## 1. Script Runner Modes

```bash
# Parallel execution for watch scripts
bun run --parallel --filter="*" dev

# Sequential for memory-constrained builds  
bun run --sequential build

# Continue on error
bun run --parallel --filter="*" --no-exit-on-error ci
```

**Demo:**
```bash
bun run dev  # Runs server, client, db in parallel
```

## 2. Test Auto-Cleanup

```bash
bun test auto-cleanup.test.ts
```

**Before:**
```typescript
let spy;
beforeEach(() => { spy = spyOn(obj, 'method'); });
afterEach(() => { spy.mockRestore(); });
```

**After:**
```typescript
{
  using spy = spyOn(obj, 'method');
  // test code
} // auto-restored
```

## 3. NO_PROXY Verification

```bash
NO_PROXY=localhost,127.0.0.1 bun test proxy.test.ts
```

**Key point:** NO_PROXY is now respected even with explicit proxy options:

```typescript
// NO_PROXY=localhost
await fetch("http://localhost:3000", {
  proxy: "http://proxy:8080"  // Bypassed in v1.3.9+!
});
```

## 4. ESM Bytecode for CLI

```bash
# Build standalone executable
bun run build:cli

# Or directly:
bun build --compile --bytecode --format=esm ./cli.ts --outfile ./dist/my-cli

# Run it
./dist/my-cli info
```

Features demonstrated:
- Top-level await
- import.meta.dirname/filename
- Dynamic imports
- ESM module system

## 5. High-Resolution Profiling

```bash
# Default (1000μs)
bun --cpu-prof benchmark.ts

# High resolution (500μs)
bun --cpu-prof --cpu-prof-interval 500 benchmark.ts

# Ultra high (250μs)
bun --cpu-prof --cpu-prof-interval 250 benchmark.ts

# View results
bun x speedscope CPU.*.cpuprofile
```

## 6. SIMD-Accelerated Markdown (Bonus)

```bash
# Benchmark Markdown rendering improvements
bun run markdown-simd.ts
```

**v1.3.9 Improvements:**
- **3-15% faster** Markdown-to-HTML conversion
- **7-28% faster** `Bun.markdown.react()` for small docs
- **40% fewer** string allocations
- **6% smaller** heap size

```typescript
const markdown = await Bun.file('doc.md').text();
const html = Bun.Markdown.render(markdown);  // 3-15% faster!
const react = Bun.markdown.react(markdown);    // 7-28% faster!
```

## Quick Reference

```bash
# Upgrade Bun
bun upgrade

# All tests
bun test

# Build CLI
bun run build:cli && ./dist/my-cli --help

# Profile
bun run profile:high-res

# Markdown benchmark
bun run markdown-simd.ts
```
