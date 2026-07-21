# FactoryWager Enterprise Platform

**Bun-native monorepo** — shared harness in `lib/` and `packages/`; apps under `projects/active/`. Each project may own its own workspace.

## Canonical docs

| Role | Doc |
|------|-----|
| This hub | [`README.md`](README.md) |
| AI agents | [`AGENTS.md`](AGENTS.md) → [`docs/AGENTS.md`](docs/AGENTS.md) |
| Workspace map | [`STRUCTURE.md`](STRUCTURE.md) |
| Coding standards | [`.custom-instructions.md`](.custom-instructions.md) · quick: [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md) |
| Bun install policy | [`docs/UNIFIED.md`](docs/UNIFIED.md) |
| Import boundaries | [`docs/IMPORT_BOUNDARIES.md`](docs/IMPORT_BOUNDARIES.md) |
| Wire boundary (parse once) | [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) |
| Projects triage | [`projects/README.md`](projects/README.md) |
| Docs index | [`docs/README.md`](docs/README.md) |
| Path SSOT (code) | [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts) (`CANONICAL_REPO_DOCS`) |
| Harness thesis | [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) (domain types; prefer **artifact** over **codebase**) |

**Remotes:** `origin` → [project-R-score](https://github.com/brendadeeznuts1111/project-R-score). `cascade` → [cascade-mover-v3](https://github.com/brendadeeznuts1111/cascade-mover-v3) (do not default-push there).

## Quick Start

```bash
bun run install:all      # isolated linker + global store (bun.sh/docs/pm/global-store)
bun run install:verify   # sanity-check cache dir, links/, and no ./~ drift
bun run dev              # Watch server
bun run packages:list    # Browse all packages with version/registry/triage
```

Install policy detail: [`docs/UNIFIED.md`](docs/UNIFIED.md).

## Architecture

```
packages/                        @factorywager/* — 8 internal packages (root workspace)
lib/                             Shared harness (brands, security, scan, console-depth)
projects/active/factorywager/    Registry platform (+ workspace packages)
projects/active/sports-terminal-os/  Sports Terminal OS (root workspace member)
projects/active/kimiremote/      Sports proxy — own repo (gitignored here)
projects/active/enterprise/      Nested products (cascade/bet-ticker own repos, gitignored)
projects/active/*                Independent apps by category — see projects/README.md
```

Triage tiers `experimental/` / `archive/` are documented under `projects/`; only `active/` is populated today. Full map: [`STRUCTURE.md`](STRUCTURE.md). Agent scope (what not to load): [`projects/README.md`](projects/README.md).

## Key Commands

| Command | Description |
|---------|-------------|
| `bun run packages:list` | List packages (scaffolds hidden; `--include-scaffolds` / `--paths`) |
| `bun run packages:outdated` | Check outdated root deps (fast — workspace-isolated) |
| `bun run validate:workspaces` | Validate workspace coverage |
| `bun run lint` | ESLint on `lib/` |
| `bun run lint:harness` | Harness ESLint config (lib, scripts, packages, server, config, tools) |
| `bun run format:core` | Prettier harness format (`format:harness`) |
| `bun run check:brands:all` | Branded ID gates (manifest + smart + types) |
| `bun run fix:console-log` | Bulk replace console.log → console.info |
| `bun run fix:scan-any-types` | Scan for `any` types |
| `bun run dev` | Start platform server |
| `bun run deployment:readiness` | Deployment readiness matrix |

See root `package.json` `scripts` for the full list.

## Code Quality & Fix Tools

Antipattern remediation (after major refactors). Conventions: [`.custom-instructions.md`](.custom-instructions.md).

- `bun run fix:console-log` — `console.log` → `console.info`
- `bun run fix:scan-any-types` — `: any` / `as any` → `unknown` or real types
- `bun run fix:scan-default-exports` — default export candidates
- `bun run fix:scan-non-null-assertions` — `!` assertions to safe access

Implementations: [`scripts/fix-*.ts`](scripts/) (e.g. [`scripts/fix-console-log.ts`](scripts/fix-console-log.ts)).

## Shared Configuration

<!-- markdownlint-disable MD013 -->
- [`config/ports.ts`](config/ports.ts) — Port defaults (DOCS_SERVER=3000, P2P_PROXY=3002, DASHBOARD=3456, …); env-overridable
- [`config/r2-env.ts`](config/r2-env.ts) — R2/Cloudflare credentials; validates required env at startup
- Deploy scripts under `scripts/deploy/*` need: `CLOUDFLARE_API_TOKEN`, `R2_ACCOUNT_ID`, `WIKI_DEPLOY_PATH`, `R2_BUCKET_NAME`
- CORS: `CORS_ALLOWED_ORIGINS` (comma-separated; empty = allow all)
- Bind: `SERVER_HOST` (default `localhost`)
<!-- markdownlint-enable MD013 -->

## Project Policies

- **Standards:** [`.custom-instructions.md`](.custom-instructions.md) · [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md)
- **Wire boundary:** [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) (parse once; no interior `unknown` / `decodeUnknown*`)
- **Import boundaries:** [`docs/IMPORT_BOUNDARIES.md`](docs/IMPORT_BOUNDARIES.md)
- **Layout:** [`STRUCTURE.md`](STRUCTURE.md) · history: [`docs/organization/ROOT_CLEANUP_SUMMARY.md`](docs/organization/ROOT_CLEANUP_SUMMARY.md)
- **Workspace hygiene:** `bun run validate:workspaces`
- **Harness:** brands → [`lib/types/branded/README.md`](lib/types/branded/README.md) · console depth → [`lib/console-depth.ts`](lib/console-depth.ts)
- **ESLint conventions:** no `console.log`; no `any`; named exports only; no non-null `!`; no empty `catch`; no hardcoded secrets
- **Monorepo tooling:** `--filter` patterns · `build:affected` / `test:affected`
