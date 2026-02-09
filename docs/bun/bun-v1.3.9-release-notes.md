# Bun v1.3.9 Release — Full Scorecard

> Tested on Bun 1.3.10. Date: 2026-02-08.

## Scorecard

| # | Feature | API | Type | Default | Bench | Status | Test File | PR | Commit |
|---|---------|-----|------|---------|-------|--------|-----------|----|--------|
| 1 | `--parallel` | `bun run` | New | — | 2.1x vs sequential | ✅ Pass | `package.json` scripts | [#26551](https://github.com/oven-sh/bun/pull/26551) | `bb4d5b9` |
| 2 | `--sequential` | `bun run` | New | — | baseline | ✅ Pass | `package.json` scripts | [#26551](https://github.com/oven-sh/bun/pull/26551) | `bb4d5b9` |
| 3 | `--no-exit-on-error` | `bun run` | New | exits on error | — | ✅ Pass | `fail.ts` | [#26551](https://github.com/oven-sh/bun/pull/26551) | `bb4d5b9` |
| 4 | Glob script names `"build:*"` | `bun run` | New | — | — | ✅ Pass | `build-*.ts` | [#26551](https://github.com/oven-sh/bun/pull/26551) | `bb4d5b9` |
| 5 | Pre/post script grouping | `bun run` | Enhancement | pre/post ran standalone | — | ✅ Pass | `package.json` prebuild/postbuild | [#26551](https://github.com/oven-sh/bun/pull/26551) | `bb4d5b9` |
| 6 | `Symbol.dispose` mock/spyOn | `bun:test` | New | manual `mockRestore()` | — | ✅ 4/4 | `test-symbol-dispose.test.ts` | [#26692](https://github.com/oven-sh/bun/pull/26692) | `d23312d` |
| 7 | HTTP/2 connection upgrade | `node:http2` / `node:net` | Fix | broken emit pattern | — | ✅ Pass | `h2-blog-example.ts` | [#26539](https://github.com/oven-sh/bun/pull/26539) | `0ad562d` |
| 8 | Faster `String.trim` | `String.prototype` | Enhancement | worked, slower | 1M in 22.6ms | ✅ Bench | `test-v139-features.ts` | [#26769](https://github.com/oven-sh/bun/pull/26769) | `6c70ce2` |
| 9 | Faster `String.startsWith` | `String.prototype` | Enhancement | worked, slower | 1M in 1.5ms | ✅ Bench | `test-v139-features.ts` | [#26769](https://github.com/oven-sh/bun/pull/26769) | `6c70ce2` |
| 10 | RegExp SIMD acceleration | `RegExp.prototype` | Enhancement | no SIMD | 1M exec in 30.2ms | ✅ Bench | `test-jsc-upgrade.ts` | [#26769](https://github.com/oven-sh/bun/pull/26769) | `6c70ce2` |
| 11 | RegExp fixed-count parens | `RegExp` JIT | Enhancement | slower JIT path | 1M in 11.9ms | ✅ Bench | `test-jsc-upgrade.ts` | [#26769](https://github.com/oven-sh/bun/pull/26769) | `6c70ce2` |
| 12 | `Set#size` / `Map#size` DFG/FTL | `Set` / `Map` | Enhancement | not inlined | 10M in 7.3ms / 5.9ms | ✅ Bench | `test-jsc-upgrade.ts` | [#26769](https://github.com/oven-sh/bun/pull/26769) | `6c70ce2` |
| 13 | `Object.defineProperty` DFG/FTL | `Object` | Enhancement | interpreter only | 1M in 64.6ms | ✅ Bench | `test-jsc-upgrade.ts` | [#26769](https://github.com/oven-sh/bun/pull/26769) | `6c70ce2` |
| 14 | `String#replace` returns Ropes | `String.prototype` | Enhancement | eager concat | 1M in 94.5ms | ✅ Bench | `test-jsc-upgrade.ts` | [#26769](https://github.com/oven-sh/bun/pull/26769) | `6c70ce2` |
| 15 | Faster `Bun.markdown.html` | `Bun.markdown` | Enhancement | worked, slower | 10K in 10.3ms | ✅ Bench | `test-jsc-upgrade.ts` | [#26644](https://github.com/oven-sh/bun/pull/26644) | `7f498a2` |
| 16 | Faster `Bun.markdown.react` | `Bun.markdown` | Enhancement | worked, slower | 10K in 24.0ms | ✅ Bench | `test-jsc-upgrade.ts` | [#26668](https://github.com/oven-sh/bun/pull/26668) | `de8c754` |
| 17 | `AbortSignal.abort()` perf | `AbortSignal` | Enhancement | created Event always | 100K in 32.4ms | ✅ Bench | `test-v139-features.ts` | [#26686](https://github.com/oven-sh/bun/pull/26686) | `eba4da2` |
| 18 | `Bun.markdown` API | `Bun.markdown.html/render/react` | Existing | — | — | ✅ Pass | `test-v139-features.ts` | — | — |
| 19 | CRC32 seed parameter | `Bun.hash.crc32` | Enhancement | no seed option | — | ✅ Pass | `test-v139-features.ts` | [#26754](https://github.com/oven-sh/bun/pull/26754) | `e5cd034` |
| 20 | ESM bytecode compilation | `bun build --compile` | New | CJS only | — | ✅ Pass | `test-esm-bytecode.ts` | [#26402](https://github.com/oven-sh/bun/pull/26402) | `71ce550` |
| 21 | NO_PROXY for explicit proxy | `fetch` / `WebSocket` | Fix | NO_PROXY ignored | — | ✅ Pass | `test-no-proxy.ts` | [#26608](https://github.com/oven-sh/bun/pull/26608) | `a14a89c` |
| 22 | stringWidth Thai/Lao fix | `stringWidth` | Fix | width=0 (wrong) | — | ✅ 12/12 | `test-stringwidth.ts` | [#26728](https://github.com/oven-sh/bun/pull/26728) | `0e386c4` |
| 23 | `--cpu-prof-interval` | `bun run` CLI | New | 1000us fixed | — | ✅ Pass | `test-cpu-prof.ts` | [#26620](https://github.com/oven-sh/bun/pull/26620) | `1337f5d` |
| 24 | `--cpu-prof-md` | `bun run` CLI | New | JSON only | — | ✅ Pass | `test-cpu-prof.ts` | — | — |
| 25 | SIGILL fix ARMv8.0 aarch64 | Runtime | Fix | SIGILL crash | — | 🖥️ ARM only | — | [#26586](https://github.com/oven-sh/bun/pull/26586) | `adc1a6b` |
| 26 | Hardened chunked encoding | HTTP parser | Fix | vulnerable | — | 🔒 Internal | — | [#26594](https://github.com/oven-sh/bun/pull/26594) | `8f61adf` |
| 27 | Shell double-free fix | `Bun.$` | Fix | possible crash | — | 🔒 Internal | — | [#26626](https://github.com/oven-sh/bun/pull/26626) | `56b5be4` |
| 28 | WebSocket blob binaryType fix | `WebSocket` | Fix | missing ref count | — | 🔒 Internal | — | [#26670](https://github.com/oven-sh/bun/pull/26670) | `89d2b1c` |
| 29 | fs `.` path normalization | `node:fs` | Fix | broken on Windows | — | 🖥️ Windows | — | [#26634](https://github.com/oven-sh/bun/pull/26634) | `ddefa11` |
| 30 | Socket.reload() types fix | `Bun.Socket` | Fix (types) | wrong type signature | — | 📝 Types | — | [#26291](https://github.com/oven-sh/bun/pull/26291) | `a524634` |
| 31 | SIMD compile target types | `Bun.Build` | Fix (types) | missing variants | — | 📝 Types | — | [#26248](https://github.com/oven-sh/bun/pull/26248) / [#26607](https://github.com/oven-sh/bun/pull/26607) | `f648483` / `01fa610` |
| 32 | HTTP tunnel mode fix | HTTP proxy | Fix | wrong tunnel for absolute URLs | — | 🔒 Internal | — | [#26737](https://github.com/oven-sh/bun/pull/26737) | `63a323a` |

**Legend:** ✅ = verified hands-on · 🔒 = internal/security fix · 🖥️ = platform-specific · 📝 = type definitions

---

# bun run --parallel / --sequential

## What it does

`--parallel` starts all scripts immediately with interleaved, prefixed output.
`--sequential` runs scripts one at a time in order.
By default, a failure in any script kills all remaining scripts — use `--no-exit-on-error` to let them all finish.

## Syntax

```bash
bun run --parallel <script1> <script2> ...
bun run --sequential <script1> <script2> ...
```

## Foreman-style output

Both modes prefix every line with the script name in a unique color:

```
lint      | [lint] Checking code style...
typecheck | [typecheck] Analyzing types...
build     | [build] Starting compilation...
```

Workspace runs use `@pkg/name:script` labels:

```
@test/app:build   | [@test/app] Building app...
@test/lib:build   | [@test/lib] Building lib...
@test/utils:build | [@test/utils] Building utils...
```

## Timing

Parallel finishes when the slowest script completes. Sequential adds them up.

| Scripts (0.8s + 1s + 1.5s) | Sequential | Parallel | Speedup |
|-----------------------------|-----------|----------|---------|
| lint + typecheck + build    | 3.45s     | 1.66s    | 2.1x    |

| Scripts (3s + 1.5s) | Sequential | Parallel | Speedup |
|----------------------|-----------|----------|---------|
| slow + build         | 4.57s     | 3.04s    | 1.5x    |

## Error handling

### Default behavior (exit on error)

- **Parallel**: failure SIGINTs all siblings immediately, exits **130**
- **Sequential**: stops at the failed script, skips remaining, exits **1**

### With `--no-exit-on-error`

- **Parallel**: lets all running scripts finish, then exits **1**
- **Sequential**: continues to next script, runs them all, then exits **1**

Key distinction: `--no-exit-on-error` means "don't bail out early." All scripts
run to completion. But the final exit code **still reports failure** (exit 1).
This is correct for CI — see all failures in one run, but pipeline still knows
it wasn't clean.

## Pre/post script grouping

Pre/post scripts (`prebuild`/`postbuild`) are automatically grouped with their
main script and run in the correct dependency order **within each group**.

In parallel mode, the group runs as a chain (`prebuild → build → postbuild`)
while other scripts run concurrently alongside the whole group:

```
build | [prebuild] Cleaning dist...       ← prebuild runs first
lint  | [lint] Checking code style...     ← lint starts concurrently
build | [prebuild] Clean done
build | [build] Starting compilation...   ← build waits for prebuild
lint  | [lint] All clean!
build | [build] Done in 1551ms
build | [postbuild] Generating sourcemaps... ← postbuild waits for build
build | [postbuild] Sourcemaps done
```

All three (pre/main/post) share the same Foreman label (`build`).

## --parallel vs --filter (dependency order)

`--filter` respects **workspace dependency order** — it won't start a script
until all its dependents have also run. This can block long-lived watch scripts.

`--parallel` and `--sequential` do **not** respect dependency order — they
start immediately without waiting for cross-package dependencies.

| Flag | Dependency order | Use case |
|------|-----------------|----------|
| `--filter` | Yes (waits for deps) | CI builds where order matters |
| `--parallel` | No (starts all now) | Dev watch scripts, independent tasks |
| `--sequential` | No (runs in listed order) | Ordered tasks without dep resolution |

## Glob matching

Glob patterns expand to all matching script names in `package.json`:

```bash
# Runs build:css, build:js, build:assets concurrently
bun run --parallel "build:*"
```

## Workspace support

Two equivalent ways to target all workspace packages:

```bash
bun run --parallel --filter '*' build
bun run --parallel --workspaces build
```

### Multiple scripts across workspaces

Runs every script in every package (N scripts × M packages):

```bash
# 3 scripts × 3 packages = 8 tasks (utils has no lint)
bun run --parallel --filter '*' build lint test
```

### --if-present

Silently skips packages that don't have the script:

```bash
bun run --parallel --workspaces --if-present lint
# → runs in @test/app and @test/lib, skips @test/utils (no lint script)
```

Without `--if-present`, a missing script is a hard error:

```
error: Missing "lint" script in package "@test/utils"
# Exit: 1 — doesn't even start the other packages
```

## Edge cases

| Scenario | Behavior |
|----------|----------|
| Single script with `--parallel` | Works fine, still gets Foreman label |
| Same script repeated 3x | Runs 3 independent copies, each with own PID and color |
| Non-existent script | Treated as shell command, fails 127, kills siblings |
| `--silent` flag | Does NOT suppress Foreman labels (only suppresses the `$ bun run ...` header) |

## Environment variables

No special parallel/sequential env vars (no `BUN_SCRIPT_INDEX`). Each child gets:
- `BUN_RUNTIME=1`
- `npm_command=run-script`
- Standard `npm_package_*` vars
- Each child has its own PID

## Replaces

- `npm-run-all` / `npm-run-all2`
- `concurrently`
- Custom `& wait` shell scripts

Zero dependencies — built into `bun run`.

## Quick reference

```bash
# Parallel local scripts
bun run --parallel lint typecheck build

# Sequential local scripts
bun run --sequential lint typecheck build

# Glob match
bun run --parallel "build:*"

# All workspace packages, one script
bun run --parallel --filter '*' build

# All workspace packages, one script (sequential)
bun run --sequential --workspaces build

# All workspace packages, multiple scripts
bun run --parallel --filter '*' build lint test

# Keep going on failure
bun run --parallel --no-exit-on-error --filter '*' test

# Skip packages missing the script
bun run --parallel --workspaces --if-present lint
```

---

# Other notable in v1.3.9

## HTTP/2 Connection Upgrades via net.Server

The `net.Server` → `Http2SecureServer` connection upgrade pattern now works
correctly. This is used by libraries like `http2-wrapper`, `crawlee`, and custom
HTTP/2 proxy servers that accept raw TCP connections on a `net.Server` and
forward them to an `Http2SecureServer` via `h2Server.emit('connection', rawSocket)`.

```ts
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

Pattern: accept raw TCP on `net.Server`, emit `'connection'` on the H2 server
to hand off the socket. Previously broken in Bun, now fixed.

Regression coverage in this repo: `tests/http2-net-upgrade.test.ts`.

## Symbol.dispose support for mock() and spyOn()

`mock()` and `spyOn()` now implement `Symbol.dispose`, enabling the `using`
keyword to automatically restore mocks when they go out of scope. No more
manual `mockRestore()` or `afterEach` cleanup.

### spyOn with `using`

```ts
import { spyOn, expect, test } from "bun:test";

test("auto-restores spy", () => {
  const obj = { method: () => "original" };

  {
    using spy = spyOn(obj, "method").mockReturnValue("mocked");
    expect(obj.method()).toBe("mocked");
  }

  // automatically restored when `spy` leaves scope
  expect(obj.method()).toBe("original");
});
```

### mock() with Symbol.dispose

`Symbol.dispose` is aliased to `mockRestore`, so it works with both:

```ts
import { mock } from "bun:test";

const fn = mock(() => "original");
fn();
expect(fn).toHaveBeenCalledTimes(1);

fn[Symbol.dispose](); // same as fn.mockRestore()
expect(fn).toHaveBeenCalledTimes(0);
```

### Nested scopes work correctly

Inner `using` restores first, outer restores after — standard block scoping:

```ts
{
  using fooSpy = spyOn(obj, "foo").mockReturnValue("foo-mocked");
  {
    using barSpy = spyOn(obj, "bar").mockReturnValue("bar-mocked");
    // both mocked here
  }
  // bar restored, foo still mocked
}
// both restored
```

Tested: 4/4 pass on Bun 1.3.10.

## Performance improvements

Benchmarked on Bun 1.3.10 (Apple Silicon):

| Operation | Iterations | Time |
|-----------|-----------|------|
| `String.prototype.trim` | 1M | 22.6ms |
| `String.prototype.startsWith` | 1M | 1.5ms |
| `RegExp.test` (email pattern) | 1M | 18.9ms |
| `Bun.markdown.html` | 10K | 10.8ms |
| `AbortSignal.abort()` | 100K | 32.4ms |

### What changed

**JavaScriptCore upgrade** (all via WebKit update `6c70ce2`):
- **RegExp SIMD Acceleration** — character class matching uses SIMD instructions
- **RegExp JIT: Fixed-Count Parentheses** — date patterns like `(\d{4})-(\d{2})` JIT faster
- **String#startsWith** — optimized in DFG/FTL compiler tiers
- **String#trim** — optimized in DFG/FTL
- **Set#size / Map#size** — inlined in DFG/FTL + inline caches (10M in 7.3ms / 5.9ms)
- **Object.defineProperty** — now handled in DFG/FTL (1M in 64.6ms)
- **String#replace returns Ropes** — lazy concatenation instead of eager copy

**Bun-specific:**
- **Faster Bun.markdown.html** — improved markdown→HTML perf (`7f498a2`)
- **Faster Bun.markdown.react** — cached tag strings in React renderer (`de8c754`)
- **AbortSignal.abort()** — skips Event creation when no listeners attached

**Platform:**
- **SIGILL fix for ARMv8.0** — disabled mimalloc LSE atomics that crashed on
  older ARM CPUs (Ampere Altra, RPi4, Graviton 1). Not applicable to Apple Silicon.

## Bun.markdown API

`Bun.markdown` is an object with three methods:

```ts
// Returns HTML string
Bun.markdown.html("# Hello **world**");
// → "<h1>Hello <strong>world</strong></h1>"

// Returns plain text (strips all markup)
Bun.markdown.render("**bold** _italic_");
// → "bold italic"

// Returns React-compatible VDOM object
Bun.markdown.react("# Hello");
// → { type, props, ... }
```

## CRC32 seed parameter

`Bun.hash.crc32` now accepts an optional seed:

```ts
Bun.hash.crc32("hello world");         // → 222957957
Bun.hash.crc32("hello world", 12345);  // → 916383268 (different with seed)
```

## ESM bytecode compilation

ESM modules can now be compiled to standalone executables via `bun build --compile`.
Previously only CJS was supported.

```bash
bun build --compile app.ts --outfile app
./app
```

Tested: compiles and runs correctly. `import.meta.main` is `true`,
`import.meta.path` points to `/$bunfs/root/<name>` (virtual FS inside binary).

## NO_PROXY respected for explicit proxy options

`fetch()` and WebSocket now honor `NO_PROXY` even when a proxy is set
explicitly in options or via `HTTPS_PROXY` env var.

```ts
process.env.NO_PROXY = "localhost,example.com";
process.env.HTTPS_PROXY = "http://bad-proxy:9999";

// This bypasses the proxy because example.com is in NO_PROXY
await fetch("https://example.com"); // → 200 (not proxy error)

// Explicit proxy option is also bypassed when NO_PROXY matches
await fetch("http://localhost:3000/api", {
  proxy: "http://my-proxy:8080",
});

const ws = new WebSocket("ws://localhost:3000/ws", {
  proxy: "http://my-proxy:8080",
});
```

Tested: request to example.com succeeds despite `HTTPS_PROXY` pointing to
a nonexistent proxy.

## TypeScript types: Socket.reload options shape

`Socket.reload()` now expects the runtime shape `{ socket: handler }` in Bun
types (instead of passing the handler object directly).

Local coverage in this repo:
- `tests/bun-socket-typing.ts`
- `types/bun-reload.d.ts`

## stringWidth: Thai/Lao spacing vowel fix

Thai and Lao spacing vowels now correctly report width 1 (were 0 before).
Combining marks still correctly report 0.

```
[PASS] Thai Sara A  (U+0E30): width=1
[PASS] Thai Sara Aa (U+0E32): width=1
[PASS] Lao Sara A   (U+0EB0): width=1
[PASS] Thai Mai Han Akat (combining, U+0E31): width=0
```

Tested: 12/12 cases pass including Thai, Lao, Latin, and CJK.

## --cpu-prof-interval flag

Configurable sampling interval for CPU profiling (default: 1000us).

```bash
# Profile with 500us sampling interval
bun run --cpu-prof --cpu-prof-interval=500 app.ts

# Markdown output (LLM-friendly) — also new
bun run --cpu-prof-md --cpu-prof-interval=500 app.ts
```

The `--cpu-prof-md` flag outputs a markdown table with hot functions and
call tree — grep-friendly and designed for LLM analysis:

```
| Self% | Function    | Location                    |
|------:|-------------|:----------------------------|
| 93.4% | `fibonacci` | `test-cpu-prof.ts:6`        |
|  1.8% | `link`      | `[native code]`             |
```

Tested: both `.cpuprofile` (JSON) and `.md` outputs generated correctly.

## Other fixes in v1.3.9

- **Hardened chunked encoding parser** — security fix for HTTP parsing
- **Shell: prevent double-free during GC finalization** — stability fix
- **WebSocket: fix missing `incPendingActivityCount()` in blob binaryType**
- **fs: handle `.` path normalization on Windows**
