# Bloat & development-speed pass (Jul 2026)

Follow-on to projects inventory + first scripts trim (`e2ba10ae`). Implements the “Next stage: reduce bloat, raise development speed” plan.

## Canonical sources

Path SSOT: [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts). Maps: [`STRUCTURE.md`](../../STRUCTURE.md), [`projects/README.md`](../../projects/README.md). Bun filter: https://bun.com/docs/pm/filter. CLI categories: [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts).

## Metrics

| Metric | Before (plan baseline) | After |
|--------|------------------------:|------:|
| `package.json` scripts | 329 (post first trim; 431 original) | **275** |
| `projects/experimental/` projects | 0 (README-only bucket) | **6** |
| `packages:list --filter=active` | — | 207 packages |
| `bun run help` | — | **~32ms** |
| `bun run cli:docs` | — | **~278ms** |
| `discover:bun-native --roots=scripts` | 8 files / 10 hits (earlier) | **4 files / 4 hits** (migrate-tooling noise) |

## What changed

1. **CLI SSOT** — `help` + `cli:docs` share [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts); day-loop docs in README / STRUCTURE / CLI.md (`type-check`, `build:affected`, `test:affected`).
2. **Script trim** — removed 54 zero-ref aliases in `search:` / `docs:` / `registry:` / `demo:` / `secrets:` / `wiki:` / `workspaces:` (CI/husky refs preserved). Cheatsheets scrubbed of dead commands.
3. **Tier moves** — `git mv` demos into experimental: `2048`, `cli-dashboard`, `edge-worker`, `my-bun-app`, `zig-self-bun`, `rust-bun-plugin`. Cleared one-shot `scratch/` discovery junk.
4. **Speed** — skip ast-grep `doctor` when husky trigger is only root lockfile/`package.json` (not skill tree). Dropped `node:path` from hot scripts: `url-validator`, `validate-workspaces`, `verify-install-cache`, `machine-bun-health`, `evict-root-tilde-cache`.

## Day loop (prefer)

```bash
bun run help
bun run type-check          # tsconfig.check.json
bun run build:affected      # bun --filter '...'
bun run test:affected
bun run cli:docs            # refresh docs/CLI.md
```

## Out of scope (still later)

- Root-parked nested remotes (`Proton-workspace/`, `toc-ops*`, …)
- `proton-pass` WIP lane
- Lifecycle hook aliases (`pretest` / `prelint` / `prebuild`)
