# Projects Workspace Structure

High-level map of the FactoryWager Enterprise Platform monorepo (`factorywager-enterprise`).

**Remotes:** `origin` → [project-R-score](https://github.com/brendadeeznuts1111/project-R-score). `cascade` → cascade-mover-v3 (do not default-push there).

## Root layout (current)

```
Projects/
├── .agents/                 # Agent skills (SKILL.md + allowed skill assets; no node_modules)
├── .claude/                 # Claude commands / agents
├── .github/                 # Workflows, templates
├── AGENTS.md                # Agent entrypoint → docs/AGENTS.md + docs/UNIFIED.md
├── archive/                 # Frozen local experiments (gitignored entire tree)
├── artifacts/               # Releases + local reports (reports/ largely ignored)
├── assets/                  # Logos, charts
├── config/                  # ports.ts, r2-env, registry, ci bunfig
├── dashboard/               # Dashboard servers & UIs
├── docs/                    # Documentation (UNIFIED.md, AGENTS.md, guides)
│   └── packages/            # REGISTRY.md snapshot (regenerate via packages:list tooling)
├── examples/                # Demos & Bun feature showcases (opt-in context)
├── lib/                     # Shared library (brands, console-depth, scan, security)
├── packages/                # @factorywager/* internal packages (8)
├── plannator/               # Local Plannotator extra skills mirror (thin)
├── projects/
│   ├── README.md            # Triage rules + active map + agent scope
│   ├── experimental/        # Tier bucket (+ README); demos not bulk-moved yet
│   ├── archive/             # Tier bucket (+ README); empty until first freeze
│   └── active/              # Populated apps (see projects/README.md)
│       ├── analysis|apps|automation|dashboards|development|enterprise|games|tools|utilities/
│       ├── factorywager/    # registry (+ workspace packages)
│       ├── sports-terminal-os/  # root workspace member
│       ├── kimiremote/      # gitignored — own repo
│       ├── f402-openapi/    # gitignored — own tree
│       └── playwriter-skill/
├── public/                  # Static assets, registry viewer
├── scratch/                 # Bun playground (curated; archive/scratch has older copies)
├── scripts/                 # Automation, CI, fix-* remediations
├── server/ · services/ · src/ · tests/ · tools/ · utils/ · workers/
├── bunfig.toml · package.json · tsconfig*.json
├── registry.config.json5    # → config/ (symlink)
├── ci.bunfig.toml           # → config/ (symlink)
├── STRUCTURE.md             # This file
└── README.md                # Entrypoint
```

### Not monorepo spine (local / nested only)

These may exist on disk under `~/Projects` but are **gitignored** or separate remotes — do not treat as platform source of truth:

| Path | Why |
|------|-----|
| `Proton-workspace/` | Standalone Proton playbook repo |
| `plannotator-upstream/` | Full upstream clone; use `plannator/` for thin skills |
| `toc-ops/`, `toc-ops-repo/`, `toc-ops-repo-wt-*` | Separate TOC-ops product / worktrees |
| `bet-turnin-sheet/`, `bradley-terry/` | Own nested git projects |
| `projects/active/kimiremote/`, `…/enterprise/{cascade-mover-v3,bet-ticker-worker-v1.1}/`, `…/f402-openapi/` | Own remotes, nested under active for path convenience |
| `herdr-worktrees/` | Empty worktree parking |
| Root `test-binary-*`, `**/sports-terminal-{before,after}` | Bun `--compile` dumps — delete if reappear |

`projects/experimental/` and `projects/archive/` exist as **tier buckets** (README only until first `git mv`).

## Key navigation

- **Run something?** Root `package.json` scripts (`bun run <name>`). Prefer named scripts over inventing paths.
- **Workspace:** `bun run validate:workspaces` · `build:affected` / `test:affected` · `install:projects` / `install:packages`
- **CLI:** `tools/cli/`, `tools/bin/`
- **Demos:** `examples/` (optional for product work)
- **Bun install policy:** [`docs/UNIFIED.md`](docs/UNIFIED.md)
- **Project inventory:** [`lib/projects-scan.ts`](lib/projects-scan.ts) · `bun run packages:list`
- **Agent triage:** [`projects/README.md`](projects/README.md)

## Root workspaces (authoritative)

From `package.json` `workspaces.packages`:

- `packages/*`
- `lib/*`
- `projects/active/kimiremote/packages/*`
- `projects/active/factorywager/registry/packages/*`
- `projects/active/sports-terminal-os`

## Organization history (condensed)

- **Phase 1–4 (Feb–May 2026):** Root cleanup, workspace isolation, `@factorywager/*` rename, package registry, antipattern remediations. Historical paths `data/`, `database/`, root `factorywager/`, root `kimiremote/` were **moved or removed** — do not resurrect in maps.
- **Phase 4.4:** Shared [`lib/projects-scan.ts`](lib/projects-scan.ts).
- **Jun 2026:** bet-ticker + cascade under `projects/active/enterprise/` (gitignored nested repos).
- **Jul 2026:** Context-bloat pass — compile dumps removed; root nested products gitignored; STRUCTURE/projects README aligned to disk; skill `node_modules` / utility `dist` cleaned; experimental/archive tier buckets; `packages:list` scaffold filter; local runtime DBs/build-artifacts pruned.

## Future candidates

- Create `projects/experimental/` / `projects/archive/` when first freeze/promote happens; re-tier games/apps demos if desired.
- Regenerate `docs/packages/REGISTRY.md` with template-package filter (`{{name}}`, scaffolds).
- Curate remaining `scratch/bun-v1.3.9-examples/`.
- Optional: physical move of root-parked nested repos out of `~/Projects` entirely.

Maintained by the platform team. Run `bun run dashboard` for live views, or use the active CLIs in `tools/cli/` (integrated-cli.ts, docs-cli.ts, endpoint-status.ts).
