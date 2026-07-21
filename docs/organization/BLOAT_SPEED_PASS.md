# Bloat & development-speed pass (Jul 2026)

Follow-on to projects inventory + first scripts trim (`e2ba10ae`). Implements the “Next stage: reduce bloat, raise development speed” plan.

## Canonical sources

Path SSOT: [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts). Maps: [`STRUCTURE.md`](../../STRUCTURE.md), [`projects/README.md`](../../projects/README.md). Bun filter: https://bun.com/docs/pm/filter. CLI categories: [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts).

## Metrics

| Metric | Before (plan baseline) | r1 | r2 | r3 (deeper) |
|--------|------------------------:|---:|---:|------------:|
| `package.json` scripts | 329 (post first trim; 431 original) | **275** | **258** | **193** |
| `projects/experimental/` projects | 0 (README-only bucket) | **6** | **7** | **9** (+`tan-bun`, `testing`) |
| `bun run help` | — | ~32ms | ~10–15ms | — |
| `bun run cli:docs` | — | ~278ms | — | — |

## What changed

1. **CLI SSOT** — `help` + `cli:docs` share [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts); day-loop docs in README / STRUCTURE / CLI.md.
2. **Script trim** — r1: 54 aliases; r2: 17 more; **r3: 65** (protocol/dashboard/P2P fan-outs, `workspaces:*`, `ci:parallel*`, niche demos/`dataview`/`markdown:options`/`bunx` entry, pure aliases). Kept CI/husky + day-loop + `brand:*` / `fix:*` / `search:*` / `install:*`.
3. **Tier moves** — demos + `keyboard-shortcuts-lite` + **`tan-bun`**, **`testing`** → experimental.
4. **Speed** — skip ast-grep `doctor` on lockfile-only triggers. Dropped `node:path` from more entrypoints: validators, install health, `fix-*`, `brand-cpu-profile`, `playground-dev`, `ci-r2-version-check`, `security-dependency-guard`, `sitemap-refresh`, `secrets-scan-local`, demo contract scripts.

## Day loop (prefer)

```bash
bun run help
bun run type-check          # tsconfig.check.json
bun run build:affected      # bun --filter '...'
bun run test:affected
bun run cli:docs            # refresh docs/CLI.md
```

Protocol checks (after r3): `bun run dashboard:protocol:check` or `bun run scripts/dashboard-protocol-check.ts --protocol=…`.

## Out of scope (still later)

- Root-parked nested remotes (`Proton-workspace/`, `toc-ops*`, …)
- `proton-pass` WIP lane
- Lifecycle hook aliases (`pretest` / `prelint` / `prebuild`)
- Remaining `node:path` in large search/benchmark scripts
- Optional: move `codepoint` / `api-plive-setup-discovery` to experimental
