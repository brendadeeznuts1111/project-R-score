# Velocity baseline (discovery)

Measured 2026-07-21 during harness-engineering velocity transform. Thesis: [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering).

## Commit-loop tax

| Condition | Wall time | Notes |
|-----------|----------:|-------|
| No staged harness files | **~0.04s** | Fast path exit |
| Typical staged `scripts/*.ts` (pre-transform, serial) | estimated multi-second serial eslint → prettier → doc-refs → brands×3 | brands types always ran |
| Typical staged `scripts/*.ts` (post-transform) | **~2.1–2.7s** gate sum (`reports/harness-gate-timing.json`) | annotate-on-write; brands staged‖smart; brand-types deferred; path-bun / bun-env parallel when lib\|scripts staged |

Dominant cost was full-tree ESLint. Default `ci:harness` now uses `lint:bun-native:changed` (~0.5s on dirty harness files); full rollout only with `HARNESS_FULL_LINT=1` (main push). Cache: `.cache/eslint-bun-native` (GHA-restored). Warm full rollout ~0.5–3.5s vs cold ~7s.

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
| Bun pin / dead workspace glob | **Done** — `packageManager` `bun@1.4.0`; removed `kimiremote` workspace glob ([HOMEBASE_DISCOVERY](HOMEBASE_DISCOVERY.md)) |

Day-loop `type-check` now also includes `lib/docs/smart-symbol-index.ts`, `lib/docs/ripgrep-spawn.ts`, and `lib/utils/safe-file-operations.ts` (Wave 2 clean subset). Remaining broad `lib/docs/**` debt still isolated.

Bun test (1.3.13+ / live on 1.4.0): day-loop adds `test:changed` (import graph), `test:parallel` / `test:isolate`, `test:shard` (`SHARD=M/N`). Distinct from `test:affected` (workspace package scripts).

## Import / Bun-native ratchet (done)

| Lever | Change |
|-------|--------|
| `config/eslint/harness/bun-native.ts` | Rollout `no-restricted-imports` / `no-restricted-syntax` → **error** (same as STRICT_INVENTORY) |
| `scripts/pre-commit-harness.ts` | `--max-warnings` **500 → 0** on staged harness files |
| Burn slice | Removed remaining restricted import/syntax sites under harness paths (fs/crypto → Bun) |
| `bun/prefer-bun-env` + `bun/prefer-import-meta-main` | Burned under harness paths → **error** in `config/eslint/plugin-bun` |
| `harness/no-unknown-function-param` | Burned under harness paths → **error** in `config/eslint/plugin-harness` (parse*/\*FromUnknown allowlist) |

## Timing artifact

Gate timings append to [`reports/harness-gate-timing.json`](../../reports/harness-gate-timing.json). Discover: `bun run harness:status`.

## Polish (harness-engineering mapping)

2026-07-21 follow-on: map all twelve upstream theses → local owners in [`docs/harness/README.md`](../harness/README.md); add [`AUTHORITY.md`](../harness/AUTHORITY.md); expand proof paths; retain velocity lessons in FEEDBACK.md; tool-legibility via `harness:status`.
