# Velocity baseline (discovery)

Measured 2026-07-21 during harness-engineering velocity transform. Thesis: [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering).

## Commit-loop tax

| Condition | Wall time | Notes |
|-----------|----------:|-------|
| No staged harness files | **~0.04s** | Fast path exit |
| Typical staged `scripts/*.ts` (pre-transform, serial) | estimated multi-second serial eslint → prettier → doc-refs → brands×3 | brands types always ran |
| Typical staged `scripts/*.ts` (post-transform) | **~2.1–2.7s** gate sum (`reports/harness-gate-timing.json`) | annotate-on-write; brands staged‖smart; brand-types deferred; path-bun / bun-env parallel when lib\|scripts staged |

Dominant cost remains ESLint (~1.7s in the sample). Parallel brand/ratchet gates remove serial brand-types (~types deferred) and kill doc-refs re-stage loops.

## Day-loop fiction (evidence) → fixed

### `type-check` (`tsconfig.check.json`)

Pre-transform `include` covered only a thin slice. Post-transform covers spine agent surfaces: `lib/types/**`, `lib/path-bun`, `lib/harness/**`, select `lib/docs/*`, key `scripts/lib/*`, harness scripts. Full `lib/docs/**` still deferred (type debt).

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

## Competing precedents (Phase D)

| Era | Spine status |
|-----|----------------|
| `path` / `node:path` in `lib/` | **Done** — [`lib/path-bun.ts`](../../lib/path-bun.ts) + `bun run check:path-bun` (pre-commit when `lib/` staged) |
| `Bun.env` vs `process.env` | **Done** — spine clean + `bun run check:bun-env` (pre-commit when lib\|scripts staged; migrator/catalog allowlist) |

Next single era (not started): remaining soft warns on touch (`bun/prefer-*`, `harness/no-unknown-function-param`) — staged `--max-warnings 0` already ratchets them when those files are committed.

## Import / Bun-native ratchet (done)

| Lever | Change |
|-------|--------|
| `config/eslint/harness/bun-native.ts` | Rollout `no-restricted-imports` / `no-restricted-syntax` → **error** (same as STRICT_INVENTORY) |
| `scripts/pre-commit-harness.ts` | `--max-warnings` **500 → 0** on staged harness files |
| Burn slice | Removed remaining restricted import/syntax sites under harness paths (fs/crypto → Bun) |

## Timing artifact

Gate timings append to [`reports/harness-gate-timing.json`](../../reports/harness-gate-timing.json).
