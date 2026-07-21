# Velocity baseline (discovery)

Measured 2026-07-21 during harness-engineering velocity transform. Thesis: [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering).

## Commit-loop tax

| Condition | Wall time (`real`) | Notes |
|-----------|-------------------:|-------|
| No staged harness files | **~0.05s** | Fast path exit |
| Typical staged `scripts/*.ts` (pre-transform) | serial eslint → prettier → doc-refs → brand-manifest → brands staged → brands smart → brand types | Target: −30% after parallelize + annotate-on-write |

Gate order (before transform): see [`scripts/pre-commit-harness.ts`](../../scripts/pre-commit-harness.ts).

## Day-loop fiction (evidence)

### `type-check` (`tsconfig.check.json`)

Pre-transform `include` covered only:

- `src/**/*`, `lib/udp/**/*`, `lib/env/**/*`, two workers, two `scripts/lib` files, `types/**/*`, `index.ts`

Agent edit surfaces **missing**: `lib/types/**`, most of `scripts/lib/**`, `lib/docs/**`, packages.

### `build:affected` / `test:affected`

Were `bun run --filter '...' build|test` — Bun dependents filter, **not** git-changed packages.

```text
$ bun run build:affected
error: No packages matched the filter
```

Replaced by [`scripts/affected-workspaces.ts`](../../scripts/affected-workspaces.ts) (git → workspace filter).

## Context fan-out (cold start)

| File | Lines |
|------|------:|
| AGENTS.md | 146 |
| docs/AGENTS.md | 149 |
| .custom-instructions.md | 268 |
| docs/WIRE_BOUNDARY.md | 155 |
| **Total** | **718** |

Mitigation: JIT index at [`docs/harness/README.md`](../harness/README.md).

## Competing precedents (Phase D pick)

| Era | Spine status |
|-----|----------------|
| `Bun.env` vs `process.env` | Mostly migrated in `lib/`+`scripts/` `.ts` (catalog/docs leftovers) |
| `path` / `node:path` in `lib/` | **Unfinished** — finish via [`lib/path-bun.ts`](../../lib/path-bun.ts) |

## Timing artifact

Post-transform gate timings append to [`reports/harness-gate-timing.json`](../../reports/harness-gate-timing.json).
