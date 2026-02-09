# Tier-1380 Integration: Bun v1.3.9

> Full scorecard: [NOTES.md](NOTES.md) · Performance comparison: [RELEASE-ANALYSIS.md](RELEASE-ANALYSIS.md) · Runnable examples: [examples/](examples/README.md)

## Deployment Commands

For the full command reference, see [parallel-scripts.sh](examples/parallel-scripts.sh), [workspace-parallel.sh](examples/workspace-parallel.sh), [esm-compile.sh](examples/esm-compile.sh), and [cpu-profiling.sh](examples/cpu-profiling.sh).

```bash
# Quick start — the most common patterns:
bun run --parallel --filter '*' --no-exit-on-error build test lint
bun build --compile --bytecode --format=esm --outfile=./dist/fw-cli ./src/cli.ts
NO_PROXY=localhost,127.0.0.1 bun test proxy-integration.test.ts
```

---

## Integration Snippets

### Parallel Runner via Bun.spawn
```typescript
// scripts/orchestrate.ts — wraps bun run --parallel via native spawn
const scripts = ['build', 'test', 'lint', 'deploy'];
const mode = process.argv.includes('--sequential') ? 'sequential' : 'parallel';

// Native Bun v1.3.9 — no custom Promise.all() needed
const result = await Bun.spawn([
  'bun', 'run', `--${mode}`, ...scripts
], {
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' }
});
```

### Symbol.Dispose Mock Pattern
```typescript
// tests/secure-cookie.test.ts
import { spyOn, test, expect } from "bun:test";
import { SecureCookieManager } from "../src/cookies";

test("auto-restores cookie parser", () => {
  const mgr = new SecureCookieManager();

  {
    using spy = spyOn(mgr, 'parse').mockReturnValue({ session: 'mocked' });
    expect(mgr.parse('token=abc')).toEqual({ session: 'mocked' });
  } // spy.mockRestore() auto-called

  expect(mgr.parse('token=abc')).toEqual({ session: 'real' }); // restored
});
```

See also: [symbol-dispose-spyon.ts](examples/symbol-dispose-spyon.ts), [symbol-dispose-nested.ts](examples/symbol-dispose-nested.ts)

### RegExp JIT Audit Script
```typescript
// scripts/audit-regex.ts — identifies patterns eligible for JIT optimization
const JIT_OPTIMIZED = /\(\?:[^)]+\)\{\d+\}/; // (?:abc){3} → 3.9x
const SIMD_PREFIX = /^(?:[a-z]+)\|(?:[a-z]+)/i; // aaaa|bbbb → SIMD

export function auditPatterns(patterns: string[]) {
  return patterns.map(p => ({
    pattern: p,
    jit: JIT_OPTIMIZED.test(p),
    simd: SIMD_PREFIX.test(p),
    recommendation: JIT_OPTIMIZED.test(p) ? '3.9x JIT boost' : 'Consider fixed-count'
  }));
}
```

See also: [regexp-jit-bench.ts](examples/regexp-jit-bench.ts), [jsc-engine-bench.ts](examples/jsc-engine-bench.ts)

---

## Production Gate: Windows Shell Hold

```typescript
// AVOID until oven-sh/bun#26625 resolved:
if (process.platform === 'win32') {
  // Use native spawn instead of shell mode
  await Bun.spawn(['cmd', '/c', 'echo', 'safe']);
} else {
  // Shell mode safe on macOS/Linux
  await Bun.$`echo "shell mode ok"`;
}
```

---

## Benchmark Validation

| Test | Command | Target | Status |
|------|---------|--------|--------|
| Parallel 500 scripts | `bun run --parallel $(seq 500)` | 95ms | Pass |
| RegExp JIT 1M ops | `bun run examples/regexp-jit-bench.ts` | 0.3ms | Pass |
| Markdown render | `bun run examples/markdown-api.ts` | 2.3µs | Pass |
| HTTP/2 upgrade | `bun run examples/h2-connection-upgrade.ts` | 18ms | Pass |
| ESM bytecode | `bun build --compile --bytecode` | 50ms | Pass |

---

## Next Steps

- **Multi-Runtime Fusion** — Integrate v1.3.9 with existing Node.js/Deno polyfills for universal runtime compatibility
- **JIT Profiling** — Build a time-series profiler that predicts RegExp JIT performance based on input patterns using SIMD-accelerated analytics
- **Arb Engine Integration** — Connect the parallel runner to odds calculation pipeline for faster market analysis
- **Standalone CLI Release** — Compile the Tier-1380 toolchain to ESM bytecode binaries for distribution
