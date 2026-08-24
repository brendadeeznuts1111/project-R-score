# Bun benchmarks & profiling (harness SSOT)

**Claim** `bun-bench-profiling`

**Owner** `runtime-tooling`

Harness-level Bun microbench and CPU-profile entrypoints. Nested
`projects/` / `scratch/` demos are **not** this contract — they may show more
APIs (heap snapshots, product-local guides) without defining root metrics.

Upstream Bun: [benchmarking](https://bun.com/docs/project/benchmarking) ·
[CPU profiling](https://bun.com/docs/project/benchmarking#cpu-profiling).

## When to use

| Need                                   | Use                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Search latency / quality pin           | `search:bench*`                                                                                                             |
| Brand palette throughput pin           | `brand:bench*`                                                                                                              |
| Brand hot-path CPU sample              | `brand:bench:profile` (`--cpu-prof`)                                                                                        |
| Limits-lab forecast CPU sample         | `ops:limits:lab:profile` (`--cpu-prof-md`)                                                                                  |
| Ad-hoc CPU markdown (SSH / LLM)        | `bun --cpu-prof-md ./script.ts` · [Bun 1.4 Observability](https://bun.com/blog/bun-v1.4#cpu-prof-md)                         |
| Ad-hoc heap markdown                   | `bun --heap-prof-md ./script.ts` · [Bun 1.4 Observability](https://bun.com/blog/bun-v1.4#heap-prof-md)                       |
| Console stringWidth / sliceAnsi bench  | `bench:console-depth`                                                                                                       |
| Nested inspect timing smoke            | `bench:deep`                                                                                                                |
| Catalog of suites → metrics → pins     | `bench:status` · `bench:status -- --json`                                                                                   |

Heap profiling (`--heap-prof` / `--heap-prof-md`) is available on Bun 1.4+ for
ad-hoc diagnosis. Harness scripts still default to **CPU** profiles
(`--cpu-prof` / `--cpu-prof-md`) for brand / limits-lab pins.

## Metric contract

| Suite | Script(s) | Metrics | Pin / evidence | Profile |
| ----- | --------- | ------- | -------------- | ------- |
| Search | `search:bench` · `search:bench:gate` · `search:bench:baseline:verify` | p50/p95/max ms, peak RSS/heap MB, quality/slop/duplicate scores | `.search/` · [`docs/performance/SEARCH_BASELINE_GOVERNANCE.md`](../../performance/SEARCH_BASELINE_GOVERNANCE.md) | n/a |
| Brand | `brand:bench:run` · `brand:bench:evaluate` · `brand:bench:pin` | ops/s, p50/p95 ms, avg memory footprint | brand-bench pins under reports | `brand:bench:profile` → `*.cpuprofile` + `*.md` under `reports/brand-bench/profiles/` |
| Limits lab | `ops:limits:lab` · `ops:limits:lab:profile` | lab wall time / forecast diagnostics | [`limit-forecast-lab.md`](limit-forecast-lab.md) | `--cpu-prof` + `--cpu-prof-md` under `reports/limit-forecast-lab/profiles/` |
| Console depth | `bench:console-depth` | stringWidth / sliceAnsi vs naive (size scales) | PROOF `console-depth-boundaries` · `tools/benchmarks/console-depth-perf.ts` | n/a |
| Deep inspect | `bench:deep` | mean / stddev / percentiles via `Bun.nanoseconds` | stdout (no pin yet) | n/a |

Types SSOT for brand metrics: [`scripts/lib/brand-bench-types.ts`](../../../scripts/lib/brand-bench-types.ts).  
Search thresholds: [`scripts/lib/search-benchmark-thresholds.ts`](../../../scripts/lib/search-benchmark-thresholds.ts).

## Runners vs static HTML

[`tools/benchmarks/`](../../../tools/benchmarks/) holds Bun runners
(`deep-benchmark.ts`, `console-depth-perf.ts`) and unrelated static HTML
dashboards (`benchmark-*.html`). Only the `.ts` runners are harness metrics.
See [`tools/benchmarks/README.md`](../../../tools/benchmarks/README.md).

## Package.json profiles

`package.json` → `profiles.benchmarks.performance` lists **live** scripts only
(no fictional `benchmark` / `test:load` / `test:stress`). Re-check with
`bun run bench:status`.

## Proof

```bash
bun run bench:status -- --json
bun run docs:map:check
bun run search:bench:baseline:verify
bun run brand:bench:evaluate
bun run bench:console-depth
bun run bench:deep
bun test tests/bun-1.4.0-observability-contract.test.ts
```

## Related

- Performance index: [`docs/performance/README.md`](../../performance/README.md)
- Full UI bundle/route audit (not Bun microbench): [`full-ui-performance-audit.md`](full-ui-performance-audit.md)
- Factory scaffold bench scripts: [`.bun-create/factory-library/`](../../../.bun-create/factory-library/)
- Path constants: `CANONICAL_REPO_DOCS.bunBenchProfiling` / `CANONICAL_TOOLS.consoleDepthBench` in [`lib/docs/repo-docs.ts`](../../../lib/docs/repo-docs.ts)
- Bun 1.4 Observability contracts: [`tests/bun-1.4.0-observability-contract.test.ts`](../../../tests/bun-1.4.0-observability-contract.test.ts)
- Docs operate planes: [`docs/BUN_DOCS_OPERATE.md`](../../BUN_DOCS_OPERATE.md)
