# Bun v1.3.9 Examples

Runnable examples for features in the [scorecard](../NOTES.md).

## Example Index

| File | Feature # | Description | Run |
|------|-----------|-------------|-----|
| [parallel-scripts.sh](parallel-scripts.sh) | #1-5 | Parallel/sequential script runner, glob, pre/post | `bash examples/parallel-scripts.sh` |
| [workspace-parallel.sh](workspace-parallel.sh) | #1-5 | Workspace --filter, --if-present, --no-exit-on-error | `bash examples/workspace-parallel.sh` |
| [symbol-dispose-spyon.ts](symbol-dispose-spyon.ts) | #6 | `using spy = spyOn()` auto-restore | `bun test examples/symbol-dispose-spyon.ts` |
| [symbol-dispose-mock.ts](symbol-dispose-mock.ts) | #6 | `mock()[Symbol.dispose]()` alias | `bun test examples/symbol-dispose-mock.ts` |
| [symbol-dispose-nested.ts](symbol-dispose-nested.ts) | #6 | Nested `using` scope ordering | `bun test examples/symbol-dispose-nested.ts` |
| [h2-connection-upgrade.ts](h2-connection-upgrade.ts) | #7 | net.Server → Http2SecureServer handoff | `bun run examples/h2-connection-upgrade.ts` |
| [regexp-jit-bench.ts](regexp-jit-bench.ts) | #10-11 | Fixed-count JIT + SIMD prefix benchmarks | `bun run examples/regexp-jit-bench.ts` |
| [unicode-regex-jit.test.ts](unicode-regex-jit.test.ts) | #10-11 | Unicode fixed-count regex correctness + perf gate | `bun test ./examples/unicode-regex-jit.test.ts` |
| [jsc-engine-bench.ts](jsc-engine-bench.ts) | #8-9, #12-14 | startsWith, trim, Set/Map size, defineProperty, replace ropes | `bun run examples/jsc-engine-bench.ts` |
| [markdown-api.ts](markdown-api.ts) | #15-16, #18 | Bun.markdown.html/render/react API | `bun run examples/markdown-api.ts` |
| [abort-signal-perf.ts](abort-signal-perf.ts) | #17 | AbortSignal.abort() optimization bench | `bun run examples/abort-signal-perf.ts` |
| [crc32-seed.ts](crc32-seed.ts) | #19 | CRC32 with optional seed parameter | `bun run examples/crc32-seed.ts` |
| [esm-compile.sh](esm-compile.sh) | #20 | ESM bytecode compilation | `bash examples/esm-compile.sh` |
| [no-proxy.ts](no-proxy.ts) | #21 | NO_PROXY honored with explicit proxy | `bun run examples/no-proxy.ts` |
| [stringwidth.ts](stringwidth.ts) | #22 | Thai/Lao spacing vowel width verification | `bun run examples/stringwidth.ts` |
| [cpu-profiling.sh](cpu-profiling.sh) | #23-24 | --cpu-prof-interval and --cpu-prof-md | `bash examples/cpu-profiling.sh` |

## Features without examples

These scorecard features don't have runnable examples for valid reasons:

| Feature # | Description | Reason |
|-----------|-------------|--------|
| #8-9 | Faster String.trim / String.startsWith | Now included in [jsc-engine-bench.ts](jsc-engine-bench.ts) |
| #25 | SIGILL fix ARMv8.0 | Platform-specific (ARM only), not reproducible on Apple Silicon |
| #26 | Hardened chunked encoding | Internal security fix |
| #27 | Shell double-free fix | Internal stability fix |
| #28 | WebSocket blob binaryType fix | Internal ref-counting fix |
| #29 | fs `.` path normalization | Windows-only fix |
| #30 | Socket.reload() types fix | Type definition only |
| #31 | SIMD compile target types | Type definition only |
| #32 | HTTP tunnel mode fix | Internal proxy routing fix |
