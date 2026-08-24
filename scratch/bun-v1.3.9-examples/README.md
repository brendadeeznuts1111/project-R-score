# Bun v1.3.9 examples (scratch playground)

Runnable demos for local exploration. For the tracked agent-facing set, use
[`examples/bun-v139-features/`](../../examples/bun-v139-features/).

CPU / heap profiling contracts live in harness SSOT
[`docs/harness/tenants/bun-bench-profiling.md`](../../docs/harness/tenants/bun-bench-profiling.md)
(`brand:bench:profile`, `ops:limits:lab:profile`). The old `profiling/` demos
were removed so they cannot contradict Bun 1.4 (`.heapprofile`,
`--cpu-prof-md`).

## Layout

```
benchmarks/          # regex / markdown / string benches
http2-proxy/         # HTTP/2 + NO_PROXY
parallel-scripts/    # --parallel / --sequential shell demos
playground/          # interactive CLI menu + demos/
tests/               # mock auto-cleanup
```

## Quick start

```bash
bun run playground/playground.ts
bun run playground/playground.ts all
bun run benchmarks/regex-jit-benchmark.ts
bun test tests/mock-auto-cleanup.test.ts
cd parallel-scripts && ./demo.sh
cd http2-proxy && bun run no-proxy
```

`playground-web/` was retired from the tracked tree (archive only). Do not point
CI or skills at it.
