# FactoryWager Enterprise Platform

**Bun-native high-performance workspace** — A comprehensive monorepo for FactoryWager applications, tools, demos, and infrastructure.

## Workspace Overview
This root organizes a large Bun + TypeScript ecosystem including:

- **Core Platforms**: `factorywager/`, `barbershop/`, `kimiremote/`, `peer/`
- **Categorized Projects**: `projects/` (apps, enterprise, games, experimental, etc.)
- **Tooling & Scripts**: `scripts/`, `tools/` (now includes `cli/`, `bin/`, `benchmarks/`)
- **Shared Code**: `lib/`, `src/`, `utils/`, `packages/`
- **Servers & Services**: `server/`, `services/`, `dashboard/`
- **Documentation**: `docs/` (extensive), `public/` (dashboards, badges)
- **Experiments**: `scratch/` (Bun v1.3.9 playgrounds, benchmarks)
- **Artifacts & Data**: `artifacts/`, `database/`, `logs/`, `data/`

See [ROOT_CLEANUP_SUMMARY.md](./ROOT_CLEANUP_SUMMARY.md) for organization history and [public/badges/README.md](./public/badges/README.md) for status badges.

## Base URL Pattern (Legacy TypedArray Docs)
All typed array documentation follows this pattern:
```
https://bun.sh/docs/runtime/binary-data#typedarray
```

## Quick Start
```bash
# Clone and install
git clone <repo>
cd Projects
bun install

# Start the platform server (see package.json scripts)
bun run dev

# Or explore specific areas:
# bun run start:p2p-proxy
# bun run dashboard
# ./tools/cli/fw-cli --help
```

## Fetch Examples (Bun Native Pattern)
```javascript
// Example 1: Basic fetch (from Bun docs)
const response = await fetch("https://bun.sh/docs/runtime/binary-data#typedarray");
console.log(response.status); // => 200
const text = await response.text();

// Example 2: Fetch JSON data
const urlResponse = await fetch("http://example.com/api/typedarray/urls");
const data = await urlResponse.json();
console.log(data.base); // => "https://bun.sh/docs/runtime/binary-data#typedarray"

// Example 3: Fetch RSS feed
const rssResponse = await fetch("http://example.com/feed/rss");
const rssXml = await rssResponse.text();
```

## Key Commands (from package.json)

**Monorepo / Workspace Commands**
- `bun run validate:workspaces` — Validate that every `package.json` is covered by the root workspace globs (`check:workspaces` is the deprecated alias)
- `bun run install:projects` — Install only packages under `projects/*`
- `bun run build:affected` / `test:affected` — Run only on packages changed since last commit (powered by Bun `--filter '...'`)
- `bun run install:all` / `build:all` / `test:workspaces` — Run across the entire workspace

**Platform Commands**
- `bun run dev` — Watch server (server/server-enhanced.ts)
- `bun run start:p2p-proxy` — Various P2P/proxy servers
- `bun run dashboard` — MCP overview dashboard
- `bun run deployment:readiness` — Readiness matrix
- `./tools/cli/fw-cli badges generate all` — Generate status badges (now in public/badges/)
- Many more in `package.json` scripts and `scripts/`

## Legacy TypedArray Endpoints
The original documentation portal endpoints (see history in git). For current services, explore `server/`, `services/`, `dashboard/`, and sub-project READMEs.

## Code Quality & Fix Tools

Antipattern remediation tools (use after major refactors):

- `bun run fix:console-log` — Bulk replace `console.log()` with `console.info()` (project convention bans `console.log`)
- `bun run fix:scan-any-types` — Scan for `: any` and `as any` usages that should be `unknown` or proper types
- `bun run fix:scan-default-exports` — Find `export default` candidates to convert to named exports
- `bun run fix:scan-non-null-assertions` — Find `!` assertions that should use safe access patterns

See `scripts/fix-*.ts` for detail, or `scripts/fix-console-log.ts` for the bulk fix implementation.

## Shared Configuration

<!-- markdownlint-disable MD013 -->
- `config/ports.ts` — Centralized port configuration (defaults for all servers: DOCS_SERVER=3000, P2P_PROXY=3002, DASHBOARD=3456, etc.). All ports overridable via env vars.
- `config/r2-env.ts` — Centralized R2/Cloudflare credential config. Validates required env vars at startup.
- All deploy scripts (`scripts/deploy/*`) require env vars: `CLOUDFLARE_API_TOKEN`, `R2_ACCOUNT_ID`, `WIKI_DEPLOY_PATH`, `R2_BUCKET_NAME`.
- CORS: Set `CORS_ALLOWED_ORIGINS` (comma-separated) to restrict origins. Empty = allow all.
- Server binding: Set `SERVER_HOST` env var (default `localhost`).
<!-- markdownlint-enable MD013 -->

## Project Policies
- Import boundaries and allowed package roots: `docs/IMPORT_BOUNDARIES.md`
- Root organization: see `STRUCTURE.md` and `ROOT_CLEANUP_SUMMARY.md`
- Workspace hygiene: `bun run validate:workspaces` (validates all packages are covered by root workspaces; `check:workspaces` is the deprecated alias)
- **Code conventions** (enforced by eslint):
  - **No `console.log`** — use `console.info`, `console.warn`, or `console.error`
  - **No `any` type** — use `unknown` with type guards, or define proper interfaces
  - **No default exports** — use named exports for better tree-shaking and IDE support
  - **No non-null assertions (`!`)** — use optional chaining with defaults
  - **No empty catch blocks** — always handle or re-throw errors
  - **No hardcoded secrets** — use env vars via `config/ports.ts` or `config/r2-env.ts`
- Monorepo tooling: Use `--filter` patterns and `build:affected` / `test:affected` for efficient development
