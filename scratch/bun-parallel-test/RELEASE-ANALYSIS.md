# GitHub Release Analysis: bun-v1.3.9

**Commit Range:** `b64edcb` (v1.3.8) → `35f815431` (v1.3.9-canary.19+)

> Full scorecard: [NOTES.md](NOTES.md) · Feature overview: [BUN-v139-APOCALYPSE.md](BUN-v139-APOCALYPSE.md) · Runnable examples: [examples/](examples/README.md)

**Critical findings from the wild:**
- OpenCode is already shipping with `1.3.9-canary.19+35f815431` on Windows
- GC/Segfault fixes in the shell interpreter are actively being patched

---

## Key Focus Areas (Tier-1380 Integration)

### 1. Shell Interpreter Stability (CRITICAL)

**The Issue:** Windows builds show GC-related segfaults in `interpreter.zig:1249` during shell operations

```zig
// Stack trace shows:
ShellInterpreterClass__finalize → deinitFromFinalizer → zap
```

**Your Action:**
- **Hold off** on `Bun.spawn` + shell integration for Windows production until stable
- Use native `Bun.spawn` without shell mode for critical paths
- Monitor `oven-sh/bun#26625` for resolution

---

### 2. Script Runner: `--parallel` / `--sequential` (HIGH)

**Commit evidence:** New Foreman-style runner with colored prefix output

```bash
# Production-ready patterns for your CLI:
bun run --parallel --filter '*' --no-exit-on-error ci
bun run --sequential --workspaces deploy:prod
```

**Integration:** Replace your custom `Promise.all()` script orchestrators in `Tier-1380 Flow Executor`

---

### 3. JavaScriptCore JIT: SIMD RegExp (HIGH)

**Commit range includes:**
- `579b96614b75` — SIMD fast prefix search (ARM64 TBL2)
- `b7ed3dae4a6a` — SIMD fast prefix search (x86_64 PTEST)
- `ac63cc259d74` — Fixed-count parentheses JIT (~3.9x speedup)

**Your regex audit checklist:**
```typescript
// OPTIMIZED PATTERNS (now JIT-compiled):
/(?:abc){3}/           // Fixed-count non-capturing → 3.9x faster
/(a+){2}b/             // Fixed-count with captures → JIT enabled
/aaaa|bbbb/            // Alternatives with known prefixes → SIMD scan

// AVOID (still interpreter):
/(?:abc)+/             // Variable count → no JIT
/(a+)*b/               // Zero-or-more → no JIT
```

**Apply to:** `EnhancedURLPatternRouter`, input validators, log parsers

---

### 4. HTTP/2 Connection Upgrade Fix (MEDIUM-HIGH)

**Commit:** HTTP/2 `net.Server` → `Http2SecureServer` upgrade path fixed

```typescript
// NOW WORKS (for proxy infrastructure):
const h2Server = createSecureServer({ key, cert });
const netServer = createServer((rawSocket) => {
  h2Server.emit("connection", rawSocket); // ← Fixed in v1.3.9
});
```

**Your use case:** `MultiURLProxyRouter` can now properly handle HTTP/2 ALPN upgrades for crawlee/http2-wrapper compatibility

---

### 5. `Symbol.dispose` for Test Mocks (MEDIUM)

**Commit:** `mock()` and `spyOn()` now implement `[Symbol.dispose]`

```typescript
import { spyOn } from "bun:test";

test("auto-cleanup", () => {
  {
    using spy = spyOn(obj, "method"); // ← Automatic mockRestore()
    // ... test code
  } // spy.mockRestore() called here
});
```

**Apply to:** All `SecureCookieManager`, `CSRFProtector`, `SecureDataRepository` test suites

---

### 6. ESM Bytecode Compilation (MEDIUM)

**Commit:** `--bytecode` now works with `--format=esm`

```bash
# WAS: CJS-only
bun build --compile --bytecode ./cli.ts

# NOW: ESM supported (explicit or implicit)
bun build --compile --bytecode --format=esm ./cli.ts
```

**Action:** Audit your `--compile` binaries for ESM migration opportunities

---

### 7. `NO_PROXY` Fix (MEDIUM)

**Commit:** Environment variable now respected for explicit proxy options

```typescript
// NO_PROXY=localhost now works even with explicit proxy:
await fetch("http://localhost:3000", {
  proxy: "http://my-proxy:8080" // ← Now correctly bypassed for localhost
});
```

**Apply to:** `SecureFetch` layer in `MultiURLProxyRouter`

---

### 8. CPU Profiling Interval (LOW-MEDIUM)

**New flag:** `--cpu-prof-interval` (microseconds)

```bash
bun --cpu-prof --cpu-prof-interval 500 index.js
# Default: 1000μs → configurable for higher resolution
```

**Integration:** Add to your `batch-profiler.ts` for nanosecond-accurate R-Score calculations

---

### 9. Markdown & React Rendering (LOW)

**Commits:**
- SIMD-accelerated HTML escaping (`&`, `<`, `>`, `"`)
- Cached HTML tag strings in React renderer

| Metric | Improvement |
|--------|-------------|
| `Bun.markdown.react()` small docs | 28% faster |
| String object count | -40% |
| Heap size | -6% |

**Apply to:** Documentation generation pipeline, dashboard SSR

---

### 10. ARM64 ARMv8.0 Fix (CRITICAL for Edge)

**Commit:** Fixed SIGILL crashes on older ARM64 (Cortex-A53, RPi 4, AWS a1)

**Your impact:** 5-region deployment on AWS Graviton (ARMv8.0) now stable

---

### 11. WebSocket Blob binaryType Fix (LOW)

**Commit:** [#26670](https://github.com/oven-sh/bun/pull/26670) — Fixed missing `incPendingActivityCount()` when `binaryType` is `"blob"`

When a WebSocket received binary data with `binaryType: "blob"`, the internal reference count wasn't incremented, which could cause the blob to be garbage-collected prematurely. This is an internal fix — no API change required.

**Your impact:** If you use WebSocket blob mode, upgrade to avoid potential data loss on GC cycles

---

### 12. HTTP Tunnel Mode Fix (LOW)

**Commit:** [#26737](https://github.com/oven-sh/bun/pull/26737) — Fixed incorrect tunnel behavior for absolute URLs through proxies

Previously, absolute URLs (e.g., `http://example.com/path`) were incorrectly routed through HTTP CONNECT tunnels instead of being sent as plain proxy requests. This caused failures with HTTP (non-HTTPS) proxy targets.

**Your impact:** If your proxy layer handles both HTTP and HTTPS targets, this fix ensures correct routing behavior

---

### 13. Mimalloc v3 Reverted (ADVISORY)

**Revert:** [#26783](https://github.com/oven-sh/bun/pull/26783) — Reverts [#26379](https://github.com/oven-sh/bun/pull/26379) ("Mimalloc v3 update"), merged Feb 7 2026

The mimalloc v3 update (merged Jan 23) added thread-aware heap management (`BorrowedHeap`/`DebugHeap` types, per-thread heap init, thread-lock assertions) and new ownership APIs (`mi_heap_check_owned`, `mi_heap_set_default`, `mi_heap_get_backing`). It was reverted ~2 weeks later due to instability — CI showed macOS aarch64 failures.

The revert restores the old mimalloc bindings (`mi_heap_main`, thread-local `mi_theap_*` APIs) and actually reduces static initializer count by 1 (arm64: 2→1, others: 3→2).

**Not affected:** The ARMv8.0 SIGILL fix ([#26586](https://github.com/oven-sh/bun/pull/26586), scorecard #25) is a separate commit that disabled LSE atomics — it remains intact and is unrelated to the v3 API changes.

**Your impact:** No action needed unless you were depending on mimalloc v3 thread-safety guarantees (unlikely at application level). Monitor for a re-land of v3 in a future release.

---

### Version Note

The scorecard in [NOTES.md](NOTES.md) was tested on **Bun 1.3.10** (stable). The canary referenced in the wild (OpenCode) was **1.3.9-canary.19+35f815431**. All features listed are present in both versions. The commit range `b64edcb` → `35f815431` covers all changes.

---

## Risk Assessment Matrix

| Feature | Status | Risk | Action |
|---------|--------|------|--------|
| `--parallel` / `--sequential` | ✅ Stable | Low | Adopt immediately |
| SIMD RegExp JIT | ✅ Stable | Low | Audit regex patterns |
| `Symbol.dispose` mocks | ✅ Stable | Low | Refactor test suites |
| HTTP/2 upgrade | ✅ Stable | Low | Update proxy router |
| ESM bytecode | ✅ Stable | Medium | Test before migration |
| `NO_PROXY` fix | ✅ Stable | Low | Verify proxy layer |
| Shell interpreter (Windows) | ⚠️ Unstable | **High** | **Avoid until patched** |
| ARMv8.0 atomics | ✅ Stable | Low | Safe for AWS Graviton |
| Mimalloc v3 | ⚠️ Reverted | **Medium** | **v3 rolled back — no action needed** |

---

## Immediate Action Items

```bash
# 1. Upgrade checklist
bun upgrade --canary  # or wait for stable v1.3.9

# 2. Test parallel runner
bun run --parallel build test lint

# 3. Audit regex for JIT optimization
grep -rE '\(\?:.*\)\{\d+\}' src/  # Find fixed-count patterns

# 4. Verify NO_PROXY behavior
NO_PROXY=localhost bun test proxy.test.ts

# 5. Hold Windows shell operations
# Monitor: https://github.com/oven-sh/bun/issues/26625
```

**Bottom line:** v1.3.9 brings significant JIT performance gains and script orchestration features, but **avoid Windows shell mode** until the GC segfault is resolved. The canary is already battle-tested by OpenCode in production.
