# tools/benchmarks

Harness Bun microbench runners and (separately) static HTML dashboards.

## Bun runners (metrics)

| File | Script | Role |
| ---- | ------ | ---- |
| [`console-depth-perf.ts`](console-depth-perf.ts) | `bun run bench:console-depth` | `Bun.stringWidth` / `Bun.sliceAnsi` vs naive |
| [`deep-benchmark.ts`](deep-benchmark.ts) | `bun run bench:deep` | Nested-object inspect timing via `Bun.nanoseconds` |

Contract + pins: [`docs/harness/tenants/bun-bench-profiling.md`](../../docs/harness/tenants/bun-bench-profiling.md) · `bun run bench:status`.

Other harness benches live outside this folder:

- Search — `scripts/search-benchmark*.ts` → `search:bench*`
- Brand — `scripts/brand-bench-*.ts` / `brand-cpu-profile.ts` → `brand:bench*`
- Limits lab — `scripts/limit-forecast-lab-profile.ts` → `ops:limits:lab:profile`

## Static HTML (not Bun runners)

`benchmark-*.html` files are static “Claude Code Benchmark” dashboards. They are
**not** invoked by `bench:*` scripts and do not define harness metrics.

## Path note

Runners live under `tools/benchmarks/` (not a root `templates/` directory).
