# Projects Workspace Structure

This document gives a high-level map of the FactoryWager Enterprise Platform monorepo.

## Root Layout (After Organization)

```
Projects/
├── .agents/                 # Agent skills & domain orchestrators (MCP)
├── .claude/                 # Claude commands, agents, custom instructions
├── .github/                 # GitHub workflows, templates
├── archive/                 # Old/parked experiments (factory-wager v38, freshcuts, omega, etc.)
├── artifacts/               # Releases, snapshots, alerts
├── assets/                  # Logos, charts, static images
├── badges/                  # (moved) → now at public/badges/
├── barbershop/              # Bun-native barbershop demo app (real-time dashboard, WS, R2)
├── config/                  # Domain branding, shared config + per-feature (cookie-crc32, etc.)
├── dashboard/               # Various dashboard servers & UIs (MCP overview, p2p, profile, etc.)
├── data/                    # Exports, health checks, search results, conditional data
├── database/                # SQLite telemetry, sessions, unified DBs
├── docs/                    # Massive documentation tree (bun-analysis, wiki, error-handling, etc.)
├── examples/                # Runnable demos & Bun feature showcases
│   ├── demos/               # Bulk of one-off demos (organized Phase 3)
│   ├── bun-v139-features/   # Bun 1.3.9 deep feature experiments + runner
│   ├── bun-file/, cookie-crc32/, native-plugin/
│   └── (root only)          # ~16 files exposed as `bun run <name>` scripts
├── factorywager/            # Core FactoryWager platform (largest active area)
├── kimiremote/              # Full-stack remote/proxy/sports terminal app (frontend + backend)
├── lib/                     # Shared library code (375+ TS files)
├── logs/                    # Demo logs, cookie security logs, etc.
├── packages/                # Internal npm-style packages / workspaces
├── peer/                    # Peer / sports-betting terminal (TS + Python)
├── projects/                # Categorized sub-projects (games, enterprise, experimental, apps, ...)
├── public/                  # Static assets served by the platform
│   ├── dashboards/          # 20+ monitoring & registry dashboards
│   ├── registry/            # projects.html + projects-registry.json (moved Phase 3)
│   └── badges/              # Status badge gallery + generated SVGs (moved Phase 3)
├── scratch/                 # Experimental / throwaway work (Bun v1.3.9 playgrounds; heavily curated in Phase 4 — many subfolders archived)
├── scripts/                 # 200+ automation, CI, generation, and analysis scripts (heart of ops)
├── server/                  # Platform server implementations (p2p-proxy, payment webhooks, etc.)
├── services/                # Core services (fetch, monitoring, ab-testing, rss)
├── src/                     # Core platform source (build tools, protocol, fetch wrappers, etc.)
├── tests/                   # Top-level test suites
├── tools/                   # 70+ developer tools (cli/, bin/, benchmarks/ now consolidated here — Phase 4)
├── utils/                   # Shared utilities
├── workers/                 # Cloudflare / background workers
├── bunfig*.toml             # Bun configuration (multiple for different environments)
├── package.json             # Root package + monorepo scripts (install:*, build:affected, validate:workspaces, etc.)
├── tsconfig*.json           # Monorepo TypeScript configs (base, lint, ci, check)
├── wrangler.toml            # Cloudflare Workers config
├── ROOT_CLEANUP_SUMMARY.md  # History of Phase 1 & 2 organization
├── STRUCTURE.md             # This file
└── README.md                # Workspace entrypoint (updated Phase 2)
```

## Key Navigation Rules

- **Want to run something?** Look in `package.json` scripts first (`bun run <name>`).
- **Monorepo / Workspace commands?** Use:
  - `bun run validate:workspaces` — Validate workspace coverage (`check:workspaces` is the deprecated alias)
  - `bun run build:affected` / `test:affected` — Only changed packages (`--filter '...'`)
  - `bun run install:projects` / `install:packages` — Scoped installs
  - See root `package.json` scripts for the full list (powered by Bun `--filter`).
- **Need a CLI?** `tools/cli/` (fw-cli is the main one) or `tools/bin/`. The `codesearch-cli.ts` now supports `--audit-paths --from <old> --to <new>` for safe refactoring.
- **Looking for demos?** Start in `examples/`. Most live in `examples/demos/`.
- **Scripts & automation?** `scripts/` is the central nervous system.
- **Deep Bun internals / experiments?** `scratch/bun-v1.3.9-examples/`.
- **Documentation?** `docs/` (huge) + per-project READMEs.
- **Static web UI?** `public/` (dashboards, badges, registry viewer).
- **Project registry data + viewer** → `public/registry/`

## Organization History

- **Phase 1 (Feb 2026)**: 175+ loose files moved into `archive/`, `docs/*`, `examples/demos/`, `public/dashboards/`, `scripts/`, `data/`, etc.
- **Phase 2 (May 2026)**: `badges/` → `public/badges/`, `build/`+`dist/` cleaned, root `README.md` modernized, `STRUCTURE.md` created.
- **Phase 3**: `examples/` root cleaned (50+ demos moved into `demos/`), `projects.html` + `projects-registry.json` → `public/registry/`.
- **Phase 4 (current)**: 
  - Consolidated `cli/`, `bin/`, and `benchmarks/` under `tools/`.
  - Aggressively curated `scratch/bun-v1.3.9-examples/` (archived `esm-bytecode/`, `playground-web/`, and 10 subfolders from `advanced/`).
  - Removed `configs/`, `deployment/`, `security/`, `types/` from root.
  - Expanded root `workspaces` (pilot) + added Bun Catalogs.
  - Added root monorepo scripts (`install:*`, `build:affected`, `test:affected`, etc.).
  - Created `validate:workspaces` validator (with `check:workspaces` as deprecated alias) + enhanced `codesearch-cli.ts` with `--audit-paths`.
  - Root non-dot directories reduced to 26.

## Future Candidates

- Complete aggressive curation of `scratch/bun-v1.3.9-examples/` (remaining: `playground/`, `parallel-scripts/`, `benchmarks/`, `advanced/`).
- Expand root workspaces pilot (`projects/games/*`, `projects/tools/*`) to more categories in `projects/`.
- Full Turborepo integration for caching and task orchestration across workspaces.
- Adopt Bun Catalogs more broadly + Renovate/Dependabot automation.
- Add `validate:workspaces` (or the alias `check:workspaces`) to CI as a permanent guardrail.
- Evaluate long-term strategy for `kimiremote/` and `factorywager/` (nested workspaces vs root-managed).
- Final cleanup of `archive/` (many packages still have `package.json`).

Maintained by the platform team. Run `./tools/cli/fw-cli` or `bun run dashboard` for live views.
