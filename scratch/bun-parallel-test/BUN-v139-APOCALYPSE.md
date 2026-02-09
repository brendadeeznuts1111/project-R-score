# Bun v1.3.9 Feature Overview: Parallel Scripts + Symbol.Dispose + ESM Bytecode + RegExp JIT + HTTP/2 Upgrades

**Date:** February 08, 2026

The Bun v1.3.9 release delivers parallel/sequential script orchestration, auto-dispose mocks, ESM bytecode compilation, SIMD-accelerated RegExp JIT, NO_PROXY handling, CPU prof interval tuning, Markdown SIMD escaping, and AbortSignal optimizations:

- `bun run --parallel --filter '*' build test lint` orchestrates multi-scripts in Foreman-style prefixed output
- `using spy = spyOn(obj, "method")` auto-restores on scope exit
- `bun build --compile --bytecode --format=esm` compiles ESM bytecode with full format support
- `/(?:abc){3}/` JIT-compiles fixed-count patterns with 3.9x speedup
- `net.Server → Http2SecureServer` upgrades raw sockets for proxy stability

Backward-compatible with v1.3.8, schema-safe, runtime-resilient.

> Full scorecard: [NOTES.md](NOTES.md) · Performance comparison: [RELEASE-ANALYSIS.md](RELEASE-ANALYSIS.md) · Runnable examples: [examples/](examples/README.md)

---

## Completed Bun v1.3.9 Enhancements

### 1. Parallel & Sequential Script Runner
- **Modes**: `--parallel` for concurrent, `--sequential` for ordered execution.
- **Scoping**: Full `--filter` and `--workspaces` support for scoped packages.
- **Examples**: [parallel-scripts.sh](examples/parallel-scripts.sh), [workspace-parallel.sh](examples/workspace-parallel.sh)

### 2. Symbol.Dispose for Mocks & Spies
- **Auto-Restore**: `using` keyword triggers `mockRestore()` on scope exit.
- **Alias**: `[Symbol.dispose]` maps directly to `mockRestore`.
- **Examples**: [symbol-dispose-spyon.ts](examples/symbol-dispose-spyon.ts), [symbol-dispose-mock.ts](examples/symbol-dispose-mock.ts)

### 3. ESM Bytecode Compilation
- **Format Support**: `--bytecode` now works with ESM.
- **Defaults**: CommonJS without flag; ESM with `--format=esm`.
- **Example**: [esm-compile.sh](examples/esm-compile.sh)

### 4. RegExp JIT & SIMD Acceleration
- **Features**: SIMD prefix search, fixed-count parentheses loop.
- **Performance**: 3.9x speedup for patterns like `(?:abc){3}`.
- **Example**: [regexp-jit-bench.ts](examples/regexp-jit-bench.ts)

### 5. HTTP/2 Upgrades & NO_PROXY
- **Socket Forwarding**: Raw socket handoff to `Http2SecureServer` now works.
- **NO_PROXY**: Honored even with explicit `proxy` options.
- **Examples**: [h2-connection-upgrade.ts](examples/h2-connection-upgrade.ts), [no-proxy.ts](examples/no-proxy.ts)

### 6. CPU Prof Interval & Performance Tweaks
- **Flag**: `--cpu-prof-interval <µs>` for sampling control.
- **Markdown SIMD**: Faster HTML escaping and rendering.
- **Example**: [cpu-profiling.sh](examples/cpu-profiling.sh)

---

## Performance: v1.3.8 vs v1.3.9

See [RELEASE-ANALYSIS.md](RELEASE-ANALYSIS.md) for the full performance comparison, risk assessment, and integration action items.

**Highlights**: 3.9x RegExp JIT, 28% Markdown rendering, 124% Set.size, 42% String#startsWith.

---

## Commands Reference

### Runtime
```bash
bun run --parallel build test lint          # Concurrent orchestration
bun run --sequential --workspaces deploy    # Ordered workspaces
bun build --compile --bytecode --format=esm # ESM bytecode
bun --cpu-prof --cpu-prof-interval 500      # High-res profiling
```

### Testing & Benchmarks
```bash
bun run --parallel --filter '*' ci          # Parallel across workspaces
bun test mock-dispose.test.ts               # Mock auto-dispose tests
bun run examples/regexp-jit-bench.ts        # RegExp JIT bench
bun run examples/jsc-engine-bench.ts        # JSC engine bench
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Bun 1.3.9 Runtime                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Core Features                                           │ │
│ │ ┌───────────────┐ ┌──────────────┐ ┌─────────────────┐ │ │
│ │ │ Parallel      │ │ Mock Dispose │ │ ESM Bytecode    │ │ │
│ │ │ Runner        │ │ (using)      │ │ (--compile)     │ │ │
│ │ │ (Foreman)     │ │              │ │                 │ │ │
│ │ └───────────────┘ └──────────────┘ └─────────────────┘ │ │
│ │ ┌───────────────┐ ┌──────────────┐ ┌─────────────────┐ │ │
│ │ │ RegExp JIT    │ │ HTTP/2       │ │ CPU Profiling   │ │ │
│ │ │ (SIMD)        │ │ Upgrades     │ │ (--cpu-prof)    │ │ │
│ │ └───────────────┘ └──────────────┘ └─────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │                                 │
│ ┌─────────────────────────▼───────────────────────────────┐ │
│ │ JavaScriptCore (SIMD + DFG/FTL + ARMv8.0 Stable)       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Status

Bun v1.3.9 deployed. Parallel running. Dispose mocking. JIT accelerating. SIMD escaping.

PR `feat/bun-v1.3.9` live on `feat/bun-docs-mcp`.
