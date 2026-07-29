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

Pre-transform `include` covered only a thin slice. Day-loop now covers spine agent surfaces: `lib/types/**`, `lib/path-bun`, `lib/harness/**`, `lib/docs/**`, `lib/utils/**`, `lib/core/**`, `lib/security/**`, `spine/**`, key `scripts/*` / `scripts/lib/*`. Ghost includes removed. Remaining type debt: other uncovered `lib/*` islands. `projects/**` stays product-owned (`typecheck` / `projects:roots:check`).

### `build:affected` / `test:affected`

Were `bun run --filter '...' build|test` — Bun dependents filter, **not** git-changed packages.

```text
$ bun run build:affected
error: No packages matched the filter
```

Replaced by [`scripts/affected-workspaces.ts`](../../scripts/affected-workspaces.ts) (git → workspace filter).

## Context fan-out (cold start)

Measured with `wc -l` on 2026-07-29 (do not hand-edit without re-measuring). Historical 2026-07-21 snapshot was AGENTS 173 / docs/AGENTS 22 / total 522 — capability map growth moved root AGENTS to ~300 lines.

| File | Lines |
|------|------:|
| AGENTS.md | 300 |
| docs/AGENTS.md | 50 (pointer → root AGENTS + tables) |
| .custom-instructions.md | 271 |
| docs/WIRE_BOUNDARY.md | 56 |
| **Total** | **677** |

Mitigation: JIT index at [`docs/harness/README.md`](../harness/README.md). Re-measure: `wc -l AGENTS.md docs/AGENTS.md .custom-instructions.md docs/WIRE_BOUNDARY.md`.

## Competing precedents (Phase D)

| Era | Spine status |
|-----|----------------|
| `path` / `node:path` in `lib/` + `tools/` | **Done** — [`lib/path-bun.ts`](../../lib/path-bun.ts) + `bun run check:path-bun` (pre-commit when `lib/` or `tools/` staged) |
| `Bun.env` vs `process.env` | **Done** — spine clean + `bun run check:bun-env` (pre-commit when lib\|scripts staged; migrator/catalog allowlist) |
| Bun pin / dead workspace glob | **Done** — `packageManager` `bun@1.4.0`; removed `kimiremote` workspace glob ([HOMEBASE_DISCOVERY](HOMEBASE_DISCOVERY.md)) |

Day-loop `type-check` includes full `lib/docs/**`, `lib/utils/**`, `lib/core/**`, and `lib/security/**` (claims `lib-docs-typecheck`, `lib-utils-typecheck`, `lib-core-typecheck`, `lib-security-typecheck`).

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

Gate timings append to [`reports/harness-gate-timing.json`](../../reports/harness-gate-timing.json) · [`reports/ci-harness-timing.json`](../../reports/ci-harness-timing.json) · [`reports/ci-core-timing.json`](../../reports/ci-core-timing.json). Discover: `bun run harness:status`.

## CI install tax (2026-07-21 deepen)

| Era | Installs per PR (root) |
|-----|------------------------:|
| Pre | harness-gates + repo-hygiene + pr-claim + typescript matrix×2 + search/brand/demo/url/har on every PR |
| Post | **Always on PR:** harness-gates (`ci:core`) · typescript (one job). **Path-filtered:** search-governance · brand-bench. **Off PR:** url-validation · har-performance (schedule/main). Shared [`setup-factory-bun`](../../.github/actions/setup-factory-bun/action.yml). |

Local parity: `bun run ci:core` · `bun run ci:harness:fast`. Required check: Harness Gates only ([AUTHORITY.md](../harness/AUTHORITY.md)).

## Polish (harness-engineering mapping)

2026-07-21 follow-on: map all twelve upstream theses → local owners in [`docs/harness/README.md`](../harness/README.md); add [`AUTHORITY.md`](../harness/AUTHORITY.md); expand proof paths; retain velocity lessons in FEEDBACK.md; tool-legibility via `harness:status`.

## Ops loop throughput (2026-07-24)

Post-audit hardening closes dispatch → settle → durable delivery with automated callers (`ops:settle`, `runOpsSyncCycle`, `runOpsSettleCycle` in snapshot-cron).

| Artifact | Path |
|----------|------|
| Baseline (live) | [`reports/ops-loop-baseline.json`](../../reports/ops-loop-baseline.json) |
| Post (fixture) | [`reports/ops-loop-post.json`](../../reports/ops-loop-post.json) |
| Post (live) | [`reports/ops-loop-post-live.json`](../../reports/ops-loop-post-live.json) |
| Tenant runbook | [`docs/harness/tenants/ops-loop-throughput.md`](../harness/tenants/ops-loop-throughput.md) |
| Live proof | `bun tools/ops-loop-live-proof.ts` |
| Capture | `bun run ops:loop:baseline` · `bun run ops:loop:post` |
| Proof test | `bun test tests/ops-loop-hardening.test.ts` |

North-star metric: **`loopCompletionRate`** = `settledViaFullLoop / dispatched`.

| Slice | `loopCompletionRate` | `settledViaFullLoop` | `manualStepsPerCycle` | ≥60% claim |
|-------|---------------------:|---------------------:|----------------------:|------------|
| Live baseline (`reports/ops-loop-baseline.json`) | **24%** | **6 / 25** | **64** | — |
| Live post (row-aligned + backfill + outbox drain) | **100%** | **29 / 29** | **0** | **Yes** |
| Fixture post | ≥60% | 1 / 1 | 0 | **Yes** |

Live bake also surfaces `projectorBackend: r2` / `projectorDurable: true` on the ops-summary loop slice. Manual steps can rise again when TOC `r2` projectors fail (e.g. missing bucket) — attribution complete ≠ every outbox topic healthy.
