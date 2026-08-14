# Harness day-loop scripts

FactoryWager’s **day loop** is the local (and CI-adjacent) cycle that keeps the spine healthy: type-check, affected builds/tests, import-graph `bun test --changed`, optional isolate/parallel/shard, then fast harness before push.

This is **not** Bun upstream’s CI. It lives in this repo under [`docs/harness/`](./README.md).

## Table of Contents

- [What it does](#what-it-does)
- [Run locally](#run-locally)
- [Scripts map](#scripts-map)
- [Artifacts / logs](#artifacts--logs)
- [Upstream Bun flags](#upstream-bun-flags)
- [Suggest](#suggest)

## What it does

1. **Discover** — `harness:status` (local ratchets + timings).
2. **Type-check** — `type-check` over `tsconfig.check.json` spine surfaces.
3. **Affected** — `build:affected` / `test:affected` via git-true workspaces.
4. **Changed tests** — `test:changed` / `test:changed:main` (Bun `--changed` import graph).
5. **Optional speed / isolation** — `test:isolate`, `test:parallel`, `test:shard`.
6. **Pre-push fast lane** — `ci:harness:fast`.

## Run locally

```bash
# Status + day-loop index
bun run harness:status
bun run docs:harness                 # this tree → bun ./file.md

# Core day loop
bun run type-check
bun run test:changed                 # dirty working tree
bun run test:changed:main            # vs origin/main|main
bun run ci:harness:fast              # before push (quiet)

# Optional Bun 1.3.13+ runners
bun run test:isolate
bun run test:parallel
SHARD=1/3 bun run test:shard
```

## Scripts map

| Script | Underlying | Role |
|--------|------------|------|
| `test:changed` | `scripts/bun-test-changed.ts` → `bun test --changed` | Import-graph affected tests (dirty) |
| `test:changed:main` | same + `--main-head` | Affected since main |
| `test:changed:watch` | `--watch` | Re-filter on edits |
| `test:isolate` | `bun test --isolate` | Fresh global per file |
| `test:parallel` | `bun test --parallel` | Worker processes (auto `--isolate`) |
| `test:shard` | `bun test --shard=${SHARD:-1/1}` | CI matrix shard |
| `ci:harness:fast` | `scripts/ci-harness.ts --fast` | Cheap local gate before push |
| `harness:status` | `scripts/harness-status.ts` | Ratchet + timing dashboard |

≠ `bun run --parallel` (workspace Foreman). That is [pm/filter#parallel-and-sequential-mode](https://bun.com/docs/pm/filter#parallel-and-sequential-mode).

## Artifacts / logs

| Path | Contents |
|------|----------|
| `reports/harness-gate-timing.json` | Pre-commit / gate timings (gitignored `reports/`) |
| `reports/ci-harness-timing.json` | `ci:harness` timings |
| `reports/ci-core-timing.json` | `ci:core` timings |
| `reports/doc-integrity.jsonl` | Docs integrity schedule log |
| Terminal | Fresh-rerun paste for PRs — see [`FRESH-RERUN.md`](./FRESH-RERUN.md) |

`reports/` is gitignored; regenerate anytime by running the scripts above.

## Upstream Bun flags

Ship: [v1.3.13](https://bun.com/blog/bun-v1.3.13) · flags matrix: [`tenants/bun-test-flags.md`](tenants/bun-test-flags.md) · Platform: [`BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md)

FactoryWager script × flag matrix (CLI vs bunfig; JUnit vs Inspector):
[`tenants/bun-test-flags.md`](tenants/bun-test-flags.md). Live Inspector stream:
[`tenants/bun-test-inspect.md`](tenants/bun-test-inspect.md) ·
`bun run test:inspect`.

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest "harness day-loop"
bun tools/bun-doc-refs.ts suggest "bun test --parallel"
bun tools/bun-doc-refs.ts suggest "bun run --parallel"
```
