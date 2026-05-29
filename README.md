# FactoryWager Enterprise Platform

**Bun-native monorepo** — Core packages live in `packages/` and `lib/`. Large apps (`factorywager`, `kimiremote`) moved to `projects/active/`. Each project in `projects/` is independent with its own workspace.

## Quick Start
```bash
bun install              # 122 packages in ~700ms (root workspace only)
bun run dev              # Watch server
bun run packages:list    # Browse all packages with version/registry/triage
```

## Architecture

```
packages/        @factorywager/* — 8 internal packages consumed by root workspace
projects/active/factorywager/    @factorywager/registry — registry platform
projects/active/kimiremote/        Sports terminal proxy (separate workspace)
lib/             shared — shared utility code
projects/
  active/        Actively developed (analysis, automation, dashboards, enterprise, etc.)
  experimental/  Prototypes and sandboxes
  archive/       Frozen, read-only
```

## Key Commands

| Command | Description |
|---------|-------------|
| `bun run packages:list` | List all 395+ packages with version, registry, triage |
| `bun run packages:outdated` | Check outdated root deps (fast — workspace-isolated) |
| `bun run validate:workspaces` | Validate workspace coverage |
| `bun run lint:core` | ESLint on packages/, server/, config/, tools/ |
| `bun run format:core` | Prettier on core directories |
| `bun run fix:console-log` | Bulk replace console.log → console.info |
| `bun run fix:scan-any-types` | Scan for `any` types |
| `bun run dev` | Start platform server |
| `bun run deployment:readiness` | Deployment readiness matrix |

See `package.json` scripts for the full list.

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
