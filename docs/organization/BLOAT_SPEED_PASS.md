# Bloat & development-speed pass (Jul 2026)

Follow-on to projects inventory + first scripts trim (`e2ba10ae`). Implements the “Next stage: reduce bloat, raise development speed” plan.

## Canonical sources

Path SSOT: [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts). Maps: [`STRUCTURE.md`](../../STRUCTURE.md), [`projects/README.md`](../../projects/README.md). Bun filter: https://bun.com/docs/pm/filter. CLI categories: [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts).

## Metrics

| Metric | Before (plan baseline) | After (r1) | After (r2) |
|--------|------------------------:|-----------:|-----------:|
| `package.json` scripts | 329 (post first trim; 431 original) | **275** | **258** |
| `projects/experimental/` projects | 0 (README-only bucket) | **6** | **7** (+`keyboard-shortcuts-lite`) |
| `packages:list --filter=active` | — | 207 packages | — |
| `bun run help` | — | **~32ms** | **~10–15ms** |
| `bun run cli:docs` | — | **~278ms** | — |
| `discover:bun-native --roots=scripts` | 8 files / 10 hits (earlier) | **4 files / 4 hits** | — |

## What changed

1. **CLI SSOT** — `help` + `cli:docs` share [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts); day-loop docs in README / STRUCTURE / CLI.md (`type-check`, `build:affected`, `test:affected`).
2. **Script trim** — r1 removed 54 zero-ref aliases; r2 dropped 17 more (`rss:*`, `version:*`, dashboard preflight fan-out, `lint:all`, `security:check`, `validate:demo`). Kept `brand:*`, `fix:*`, `security:posture:report`, `dashboard:protocol:check`. Cheatsheets scrubbed.
3. **Tier moves** — r1: `2048`, `cli-dashboard`, `edge-worker`, `my-bun-app`, `zig-self-bun`, `rust-bun-plugin`. r2: `keyboard-shortcuts-lite` → experimental.
4. **Speed** — skip ast-grep `doctor` when husky trigger is only root lockfile/`package.json`. Dropped `node:path` from hot + fix entrypoints: `url-validator`, `validate-workspaces`, `verify-install-cache`, `machine-bun-health`, `evict-root-tilde-cache`, `fix-*`, `brand-cpu-profile`, `playground-dev`.

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
