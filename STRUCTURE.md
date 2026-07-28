# Projects Workspace Structure

High-level map of the FactoryWager Enterprise Platform monorepo (`factorywager-enterprise`).

**Remotes:** `origin` → [project-R-score](https://github.com/brendadeeznuts1111/project-R-score). `cascade` → `cascade-mover-v3` (private git remote; do not default-push there).

## Canonical docs

| Role | Doc |
|------|-----|
| This map | [`STRUCTURE.md`](STRUCTURE.md) |
| Human hub | [`README.md`](README.md) |
| AI agents | [`AGENTS.md`](AGENTS.md) → [`docs/AGENTS.md`](docs/AGENTS.md) |
| Coding standards | [`.custom-instructions.md`](.custom-instructions.md) · [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md) |
| Bun install policy | [`docs/UNIFIED.md`](docs/UNIFIED.md) |
| Bun token/catalog operate | [`docs/BUN_DOCS_OPERATE.md`](docs/BUN_DOCS_OPERATE.md) (`bun run docs:refresh`) |
| Projects triage | [`projects/README.md`](projects/README.md) |
| Path SSOT (code) | [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts) |
| Wire boundary | [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) |
| Harness thesis | [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) |

## Root layout (current)

```
Projects/
├── .agents/                 # Agent skills (SKILL.md + allowed skill assets; no node_modules)
├── .claude/                 # Claude commands / agents
├── .github/                 # Workflows, templates
├── AGENTS.md                # Agent entrypoint → docs/AGENTS.md + docs/UNIFIED.md
├── .custom-instructions.md  # Coding standards SSOT → docs/DEVELOPMENT-STANDARDS.md
├── README.md                # Human hub
├── STRUCTURE.md             # This file
├── archive/                 # Frozen local experiments (gitignored entire tree)
├── artifacts/               # Releases + local reports (reports/ largely ignored)
├── assets/                  # Logos, charts
├── config/                  # ports.ts, r2-env, registry, ci bunfig
├── dashboard/               # Dashboard servers & UIs
├── docs/                    # Documentation (UNIFIED.md, AGENTS.md, guides)
│   ├── README.md            # Docs index (SSOT navigation)
│   ├── AGENTS.md            # Full agent guide (root AGENTS.md is thin entry)
│   ├── UNIFIED.md · WIRE_BOUNDARY.md · DEVELOPMENT-STANDARDS.md
│   ├── BUN_DOCS_OPERATE.md  # Token/catalog operate (RSS → scrape → catalog)
│   ├── organization/        # Root cleanup history
│   └── packages/            # REGISTRY.md snapshot (regenerate via packages:list tooling)
├── examples/                # Demos & Bun feature showcases (opt-in context)
├── functions/               # Cloudflare Pages edge Functions (/api/* — edge-safe only, see tests/functions-edge-safety.test.ts)
├── functions-bun-only/      # Bun-runtime API modules (DOD review, telegram, catalog — not deployed to Pages edge)
├── Kalshi-bot/              # Nested product submodule (own remote; see .gitmodules)
├── lib/                     # Shared library — README.md inventory + domain/*/README.md indexes
│   └── docs/repo-docs.ts    # CANONICAL_REPO_DOCS path SSOT
├── packages/                # @factorywager/* internal packages (8)
├── plannator/               # Local Plannotator extra skills mirror (thin)
├── projects/
│   ├── README.md            # Triage SSOT — every product leaf + root contract
│   ├── experimental/        # Demos / PoCs (each top-level has README + package.json)
│   ├── archive/             # Tier bucket (+ README); empty until first freeze
│   └── active/              # README.md tier index; categories keep indexes (no flatten)
│       ├── analysis|automation|dashboards|development|enterprise|tools|utilities/
│       │     └── each category README.md lists product leaves (each leaf = install root)
│       ├── factorywager/    # registry umbrella (+ workspace packages)
│       ├── sports-terminal-os/  # root workspace member
│       ├── kimiremote/      # gitignored — own repo
│       ├── f402-openapi/    # gitignored — own tree
│       └── playwriter-skill/
├── public/                  # Static assets + Cloudflare Pages output (project-r-score; SSOT config/r2-env)
├── scratch/                 # Bun playground (curated; archive/scratch has older copies)
├── scripts/                 # Automation, CI, fix-* remediations
├── server/ · tests/ · tools/
├── bunfig.toml · package.json · tsconfig*.json
├── registry.config.json5    # → config/ (symlink)
└── ci.bunfig.toml           # → config/ (symlink)
```

### Not monorepo spine (local / nested only)

These may exist on disk under `~/Projects` but are **gitignored** or separate remotes — do not treat as platform source of truth:

| Path | Why |
|------|-----|
| `Kalshi-bot/` | **Tracked submodule** → [Kalshi-bot](https://github.com/brendadeeznuts1111/Kalshi-bot) (not spine; own package.json / tests) |
| `Proton-workspace/` | Standalone Proton playbook repo |
| `plannotator-upstream/` | Full upstream clone; use `plannator/` for thin skills |
| `toc-ops/`, `toc-ops-repo/`, `toc-ops-repo-wt-*` | Separate TOC-ops product / worktrees |
| `bet-turnin-sheet/`, `bradley-terry/` | Own nested git projects |
| `projects/active/kimiremote/`, `…/enterprise/{cascade-mover-v3,bet-ticker-worker-v1.1}/`, `…/f402-openapi/` | Own remotes, nested under active for path convenience |
| `herdr-worktrees/` | Empty worktree parking |
| Root `test-binary-*`, `**/sports-terminal-{before,after}` | Bun `--compile` dumps — delete if reappear |

`projects/experimental/` holds relocated demos (see [`projects/experimental/README.md`](projects/experimental/README.md)). `projects/archive/` remains a tier bucket until first freeze.

## Key navigation

- **Day loop?** `bun run help` · `bun run type-check` (`tsconfig.check.json` spine) · `bun run build:affected` / `test:affected` (**git-true** via [`scripts/affected-workspaces.ts`](scripts/affected-workspaces.ts)). Harness JIT: [`docs/harness/README.md`](docs/harness/README.md). CLI: `bun run help` (optional regenerate [`docs/CLI.md`](docs/CLI.md) via `cli:docs`).
- **Run something?** Root `package.json` scripts (`bun run <name>`). Prefer named scripts over inventing paths.
- **Workspace:** `bun run validate:workspaces` · `build:affected` / `test:affected` · `affected:list`
- **CLI:** [`tools/cli/`](tools/cli/) · `bun run help`
- **Demos:** [`examples/`](examples/INDEX.md) (optional for product work)
- **Bun install policy:** [`docs/UNIFIED.md`](docs/UNIFIED.md)
- **Coding standards:** [`.custom-instructions.md`](.custom-instructions.md) · [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md)
- **Wire boundary:** [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) · ESLint `BOUNDARY_POLICY`
- **Project inventory:** [`lib/projects-scan.ts`](lib/projects-scan.ts) · `bun run packages:list` · `bun run registry:projects`
- **Brands:** [`lib/types/branded/README.md`](lib/types/branded/README.md) · `bun run check:brands:all`
- **Console depth:** [`lib/console-depth.ts`](lib/console-depth.ts)
- **Agent triage:** [`projects/README.md`](projects/README.md)

## Root workspaces (authoritative)

From root `package.json` `workspaces.packages` (SSOT — do not invent extra globs):

- `packages/*` — `@factorywager/*` library packages
- `projects/active/sports-terminal-os` — Sports Terminal OS (workspace member, not a nested install root)
- `lib/*` — currently only `lib/shared` (`name: shared`); product code under other `lib/**` paths is imported relatively, not as workspace packages

**Root `workspace:*` deps (imported from spine):** `docs-tools`, `guards`, `registry-client`, `rip`.  
**Workspace-only (not root deps):** `business`, `p2p`, `@factorywager/shared` (`lib/shared`), `sports-terminal-os`.  
**Archived (out of root install graph):** `projects/archive/factorywager-packages/{ab-testing,versioning}` — revive only with a real consumer.

**Not root workspaces:** nested monorepos under `projects/**` (e.g. `projects/active/factorywager/registry`) keep their **own** `workspaces` / `catalog` and own `bun install`. Shared third-party pins for root members use root `catalog` + `catalog:` — see [`docs/UNIFIED.md`](docs/UNIFIED.md#catalogs-and-workspace-protocols).

## Organization history (condensed)

- **Phase 1–4 (Feb–May 2026):** Root cleanup, workspace isolation, `@factorywager/*` rename, package registry, antipattern remediations. Historical paths `data/`, `database/`, root `factorywager/`, root `kimiremote/` were **moved or removed** — do not resurrect in maps.
- **Phase 4.4:** Shared [`lib/projects-scan.ts`](lib/projects-scan.ts).
- **Jun 2026:** bet-ticker + cascade under `projects/active/enterprise/` (gitignored nested repos).
- **Jul 2026:** Context-bloat pass — compile dumps removed; root nested products gitignored; STRUCTURE/projects README aligned to disk; skill `node_modules` / utility `dist` cleaned; experimental/archive tier buckets; `packages:list` scaffold filter; local runtime DBs/build-artifacts pruned.
- **Jul 2026 (docs):** Root standards rewrite; [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts) as path SSOT; cleanup summary under [`docs/organization/`](docs/organization/HOMEBASE_DISCOVERY.md).
- **Jul 2026 (projects triage):** Dropped ghost inventory (`barbershop`/`peer`/empty experimental+archive paths); `bun run registry:projects` regenerates [`public/registry/projects-registry.json`](public/registry/projects-registry.json); `packages:list --write` refreshes [`docs/packages/REGISTRY.md`](docs/packages/REGISTRY.md).
- **Jul 2026 (scripts trim):** Collapsed ~100 duplicate/unused `package.json` scripts; removed `scratch` passthrough, `deploy-production.sh`, `url-validator-focused.ts`; migrate phase aliases → `bun-migrate` direct.
- **Jul 2026 (bloat/speed):** CLI category SSOT; scripts **329 → 275 → 258 → 193 → 176 → 173**; demos + utility sandboxes → `projects/experimental/`; Bun-native `fs-bun`/`cli-args`/`Bun.argv`; skip ast-grep doctor on lockfile-only staged sets; day-loop docs. Notes: [`docs/organization/BLOAT_SPEED_PASS.md`](docs/organization/BLOAT_SPEED_PASS.md).

Detail: [`docs/organization/HOMEBASE_DISCOVERY.md`](docs/organization/HOMEBASE_DISCOVERY.md) · [`docs/organization/BLOAT_SPEED_PASS.md`](docs/organization/BLOAT_SPEED_PASS.md).

## Future candidates

- Populate `projects/archive/` on first freeze.
- Curate remaining `scratch/bun-v1.3.9-examples/`.
- Optional: physical move of root-parked nested repos out of `~/Projects` entirely.

Maintained by the platform team. Run `bun run dashboard` for live views, or use active CLIs under [`tools/cli/`](tools/cli/) (e.g. `endpoint-status.ts`).
