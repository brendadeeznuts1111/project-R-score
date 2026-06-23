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
├── config/                  # Centralized config (ports.ts, r2-env.ts)
├── dashboard/               # Dashboard servers & UIs (MCP overview, p2p, profile)
├── data/                    # Exports, health checks, search results
├── database/                # SQLite telemetry, sessions, unified DBs
├── docs/                    # Documentation tree (bun-analysis, wiki, error-handling)
│   └── packages/            # Auto-generated REGISTRY.md (395 packages)
├── examples/                # Runnable demos & Bun feature showcases
│   ├── demos/               # One-off demos
│   └── bun-v139-features/   # Bun 1.3.9 experiments
├── projects/active/enterprise/  # bet-ticker-worker-v1.1, cascade-mover-v3 (gitignored, own repos)
├── factorywager/            # → projects/active/factorywager/ (moved)
├── kimiremote/              # → projects/active/kimiremote/ (moved)
├── lib/                     # Shared library code (shared utils)
├── packages/                # @factorywager/* internal packages (8)
├── projects/
│   ├── active/              # Actively developed (9 categories)
│   ├── experimental/        # Prototypes and sandboxes
│   └── archive/             # Frozen, read-only
├── public/                  # Static assets (dashboards, badges, registry viewer)
├── scratch/                 # Experimental / throwaway work
├── scripts/                 # 200+ automation, CI, analysis scripts
│   └── fix-*.ts             # Antipattern remediation tools
├── server/                  # Platform servers (p2p-proxy, payment webhooks)
├── services/                # Core services (fetch, monitoring, ab-testing, rss)
├── src/                     # Core platform source (build tools, protocol)
├── tests/                   # Top-level test suites
├── tools/                   # 70+ developer tools (cli, bin, benchmarks)
├── utils/                   # Shared utilities
├── workers/                 # Cloudflare / background workers
├── bunfig.toml              # exact = true (all deps pinned)
├── package.json             # Root workspace (122 deps, <1s install)
├── tsconfig*.json           # TypeScript configs (base, lint, ci, check)
├── wrangler.toml            # Cloudflare Workers config
├── ROOT_CLEANUP_SUMMARY.md  # Cleanup history
├── STRUCTURE.md             # This file
└── README.md                # Entrypoint
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
- **Phase 4**: Consolidated `cli/`/`bin/`/`benchmarks/` under `tools/`, curated `scratch/`, removed root cruft, added monorepo scripts.
- **Phase 4.2**: Antipattern remediation (250K console.log → console.info, CORS hardening, SQL injection fixes, shared config, analyzer scripts).
- **Phase 4.3 (May 2026) — Workspace Isolation & Naming**:
  - Workspace restricted to `packages/*`, `projects/active/factorywager/registry/packages/*`, `projects/active/kimiremote/packages/*`, `lib/*`.
  - `bun install` at root: **122 packages in <1s** (was timing out at 120s).
  - Projects triaged into `active/` / `experimental/` / `archive/` with `projects/README.md`.
  - fantasy42-fire22-registry deduplicated: 3 copies → 1, all `@fire22/*` names restored.
  - Core packages renamed: `@fw/*` → `@factorywager/*` (8 packages, 13 import files updated).
  - 1,542 dependency versions pinned to exact in 267 `package.json` files.
  - Registry manifest created: `docs/packages/REGISTRY.md` (395 packages).
  - `packages:list` / `packages:outdated` root scripts added.
  - Leaked Cloudflare token removed from git (`bun.secrets`, `.fw-config.json`).

## Future Candidates

- Curate `scratch/bun-v1.3.9-examples/` (remaining: `playground/`, `parallel-scripts/`, `benchmarks/`, `advanced/`).
- Registry consolidation: migrate minor registries (`fire22.workers.dev`, `npm.internal.yourcompany.com`, etc.) to `registry.factory-wager.com`.
- Add Dependabot/Renovate for automated version bumps (since deps are pinned, PRs would be intentional).
- Add `packages:outdated` to CI reporting.
- Evaluate `projects/active/kimiremote/` and `projects/active/factorywager/` as standalone repos vs monorepo members.
- **Phase 4.4 (May 2026) — Scan consolidation**: Shared [`lib/projects-scan.ts`](lib/projects-scan.ts) for project inventory; dx-mcp debug-gated scan errors.
- ~~Move `bet-ticker-worker-v1.1/` and `cascade-mover-v3/` under `projects/active/`~~ **Done (Jun 2026)** → `projects/active/enterprise/`.
- **Antipattern remediation (manual)**: `export default` → named exports, `: any` → `: unknown`, non-null assertions, empty catches.

Maintained by the platform team. Run `./tools/cli/fw-cli` or `bun run dashboard` for live views.
