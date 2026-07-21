# Bloat & development-speed pass (Jul 2026)

Follow-on to projects inventory + first scripts trim (`e2ba10ae`). Implements the “Next stage: reduce bloat, raise development speed” plan.

## Canonical sources

Path SSOT: [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts). Maps: [`STRUCTURE.md`](../../STRUCTURE.md), [`projects/README.md`](../../projects/README.md). Bun filter: https://bun.com/docs/pm/filter. CLI categories: [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts).

## Metrics

| Metric | Baseline | r1 | r2 | r3 | r4 (review+) |
|--------|---------:|---:|---:|---:|-------------:|
| `package.json` scripts | 329 (431 original) | **275** | **258** | **193** | **176** |
| `projects/experimental/` | 0 | 6 | 7 | 9 | **11** (+`codepoint`, `api-plive-setup-discovery`) |
| Active utilities (spine) | many | — | — | 7 | **5** (analyzer, toml-secrets, proton-pass, shortcut-registry, toml-cli) |

## What changed

1. **CLI SSOT** — `help` + `cli:docs` share [`scripts/lib/cli-categories.ts`](../../scripts/lib/cli-categories.ts); day-loop docs in README / STRUCTURE / CLI.md.
2. **Script trim** — r1–r3 removed aliases / protocol fan-outs / niche demos; **r4** dropped `bunx:*`, scoped `install:*` filters, and docs-cli convenience aliases (`docs:open` / `search` / `cache` / `index` / `install` / `docs:sync`). Kept operate loop (`docs:refresh`, catalog, release-*), `install:verify*`, `install:all`, `install:machine:health`, `install:cache:lifecycle|prune`, `audit:bunfig*`.
3. **Tier moves** — demos + utility sandboxes → experimental (11 on disk).
4. **Speed** — skip ast-grep `doctor` on lockfile-only triggers; drop `node:path` from validators, fixers, demo contracts, `bun-migrate`, `search-loop-status`, `gate-report-monorepo`, `protocol-baseline-promote`.

## Review findings (r4)

| Finding | Fix |
|---------|-----|
| [`scripts/protocol-baseline-promote.ts`](../../scripts/protocol-baseline-promote.ts) still spawned removed `test:protocol:parallel:compare` | Spawn `scripts/test-protocol-parallel.ts` with the former compare flags |
| Root README still listed `packages:outdated` | Removed; use `packages:list` / direct `bun outdated` |
| `active/utilities/` still held one-shot sandboxes | Moved `codepoint`, `api-plive-setup-discovery` |

## Day loop (prefer)

```bash
bun run help
bun run type-check          # tsconfig.check.json
bun run build:affected      # bun --filter '...'
bun run test:affected
bun run cli:docs            # refresh docs/CLI.md
```

Protocol: `bun run dashboard:protocol:check` or `bun run scripts/dashboard-protocol-check.ts --protocol=…`. Promote baseline: `bun run scripts/protocol-baseline-promote.ts` (compare gate inlined).

## Out of scope (still later)

- Root-parked nested remotes (`Proton-workspace/`, `toc-ops*`, …)
- `proton-pass` WIP lane
- Lifecycle hook aliases (`pretest` / `prelint` / `prebuild`)
- Heavy `node:path` in `search-smart.ts` / search-benchmark family / `verify-package-import-boundaries.ts`
- Optional archive of long-stale experimental demos
