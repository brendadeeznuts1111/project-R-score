# FactoryWager Enterprise Platform

**Bun-native monorepo** — shared harness in `lib/` and `packages/`; apps under `projects/active/`. Each project may own its own workspace.

**Wiki navigation:** [full index](wiki-index.md) · [docs index](docs/README.md) · [harness JIT](docs/harness/README.md)

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
| Portal foundation | [`docs/portal-foundation.md`](docs/portal-foundation.md) |
| Harness JIT index | [`docs/harness/README.md`](docs/harness/README.md) · `bun run harness:status` |
| Projects triage | [`projects/README.md`](projects/README.md) |
| Docs index | [`docs/README.md`](docs/README.md) |
| Path SSOT (code) | [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts) (`CANONICAL_REPO_DOCS`) |
| Harness thesis | [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) (domain types; prefer **artifact** over **codebase**) |
| Wiki (live) | [wiki.factory-wager.com](https://wiki.factory-wager.com/) — GitHub Pages from this repo |
| Wiki index | [`wiki-index.md`](wiki-index.md) — full tenant + portal navigation |
| Registry index | [`registry-index.md`](registry-index.md) — registry bake + portal consumer map |

**Remotes:** `origin` → [project-R-score](https://github.com/brendadeeznuts1111/project-R-score). `cascade` → `cascade-mover-v3` (private git remote; do not default-push there).

## Live surfaces

| Surface | URL | Role |
|---------|-----|------|
| **Wiki** (this site) | [wiki.factory-wager.com](https://wiki.factory-wager.com/) | GitHub Pages · `README.md` · [`docs/`](docs/) · [`AGENTS.md`](AGENTS.md) |
| **Portal hub** | [score.factory-wager.com/portal/](https://score.factory-wager.com/portal/) | Static boards + baked registry embeds (Cloudflare Pages) |
| **Registry bake** | [score.factory-wager.com/registry/](https://score.factory-wager.com/registry/) | `ops:snapshot` JSON (`ops-summary`, handshake, compliance, …) |
| **Monitoring** | [score.factory-wager.com/monitoring/](https://score.factory-wager.com/monitoring/) | Routing · env · compliance tile · proof status |
| **Portal weave** | [registry/portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json) | Cross-links + operator scripts (machine SSOT) |

Routing: [`docs/platform-routing.md`](docs/platform-routing.md) · edge verify: `bun run verify:pages-edge` · local hot reload: `bun run serve:public:hot`

## Portal boards (operator)

| Board | Pages path | Harness doc |
|-------|------------|-------------|
| Portal home | [`/portal/`](https://score.factory-wager.com/portal/) | [`docs/portal-foundation.md`](docs/portal-foundation.md) |
| Ops (C4/C5 · loop) | [`/portal/ops/`](https://score.factory-wager.com/portal/ops/) | [`docs/harness/tenants/ops-loop-throughput.md`](docs/harness/tenants/ops-loop-throughput.md) |
| TOC Ops | [`/portal/toc/`](https://score.factory-wager.com/portal/toc/) | [`docs/harness/tenants/toc-ops.md`](docs/harness/tenants/toc-ops.md) |
| Compliance (MA/NJ) | [`/portal/compliance/`](https://score.factory-wager.com/portal/compliance/) | [`docs/harness/tenants/compliance-portal.md`](docs/harness/tenants/compliance-portal.md) |
| Partner limits | [`/portal/limits/`](https://score.factory-wager.com/portal/limits/) | `bun run ops:limits:check` · raise context: `ops:limits:capture` |
| Dashboard | [`/portal/dashboard/`](https://score.factory-wager.com/portal/dashboard/) | KPIs · TOC · compliance plane |
| Health / Env | [`/portal/health/`](https://score.factory-wager.com/portal/health/) · [`/portal/env/`](https://score.factory-wager.com/portal/env/) | `/api/health` schema v1 · env checklist |
| DOD queue | [`/portal/dod/`](https://score.factory-wager.com/portal/dod/) | [`docs/harness/tenants/public-plane.md`](docs/harness/tenants/public-plane.md) |
| Skills catalog | [`/portal/skills/`](https://score.factory-wager.com/portal/skills/) | [`docs/harness/tenants/public-plane.md`](docs/harness/tenants/public-plane.md) |
| Seat capital desk | [`registry/seat-capital-desk.json`](https://score.factory-wager.com/registry/seat-capital-desk.json) | [`docs/harness/tenants/seat-capital-desk.md`](docs/harness/tenants/seat-capital-desk.md) |
| Telegram handshake | [`registry/telegram-handshake.json`](https://score.factory-wager.com/registry/telegram-handshake.json) | [`docs/harness/tenants/partner-package-group-handshake.md`](docs/harness/tenants/partner-package-group-handshake.md) |

**Bake:** `bun run ops:snapshot` (full) · `bun run compliance:bake` (compliance only) · **verify:** `bun run verify:portal:static` · `bun run compliance:verify`

## Registry artifacts (baked JSON)

| Artifact | Path | Notes |
|----------|------|-------|
| Ops summary | [`/registry/ops-summary.json`](https://score.factory-wager.com/registry/ops-summary.json) | Liquidity · tree · compliance slice |
| Compliance board | [`/registry/compliance-board.json`](https://score.factory-wager.com/registry/compliance-board.json) | MA/NJ shadow matrix · HMAC |
| Monitoring | [`/registry/monitoring.json`](https://score.factory-wager.com/registry/monitoring.json) | Routing proof · DOD · compliance tile |
| TOC Ops | [`/registry/toc-ops.json`](https://score.factory-wager.com/registry/toc-ops.json) | Fixture board bake |
| Proof taxonomy | [`/registry/proof-taxonomy-audit.json`](https://score.factory-wager.com/registry/proof-taxonomy-audit.json) | Cross-proof contracts |

Full weave list: [`lib/http/portal-weave.ts`](lib/http/portal-weave.ts) · baked at [`public/registry/portal-weave.json`](public/registry/portal-weave.json)

## Operator day loop

```bash
bun run harness:status              # ratchets + proof posture
bun run ops:snapshot --no-seed      # rebake registry + portal embeds
bun run compliance:verify           # compliance board + portal tests
bun run telegram:handshake:readiness --deep   # 23/23 lanes per partner
bun run test:seat-desk              # seat desk + handshake snapshot
bun run verify:portal:static        # public plane gate
PAGES_VERIFY_BASE=https://project-r-score.pages.dev bun run verify:pages-edge
```

Deploy (Pages): `bun run proton:inject:factorywager:reasonix` → `bun run proton:deploy:pages` · vault map: [`docs/harness/tenants/proton-integration.md`](docs/harness/tenants/proton-integration.md)

## Harness tenants (JIT)

When a decision is unresolved, read **one** owner in [`docs/harness/README.md`](docs/harness/README.md) — not the full standards stack.

| Lane | Entry |
|------|-------|
| Identity / auth (Phase 0–2b) | [`lib/identity/README.md`](lib/identity/README.md) · lockout · anomaly · geo · password · JIT |
| Compliance portal (MA/NJ) | [`docs/harness/tenants/compliance-portal.md`](docs/harness/tenants/compliance-portal.md) · `bun run compliance:verify` |
| State regulation / play gate | [`docs/harness/tenants/compliance-portal.md`](docs/harness/tenants/compliance-portal.md) · `bun run test:state-compliance` |
| Factory Telegram | [`docs/harness/tenants/telegram-factory.md`](docs/harness/tenants/telegram-factory.md) · `bun run telegram:verify` |
| Package-group handshake | [`docs/harness/tenants/partner-package-group-handshake.md`](docs/harness/tenants/partner-package-group-handshake.md) · `bun run telegram:handshake:readiness --deep` |
| Seat capital desk | [`docs/harness/tenants/seat-capital-desk.md`](docs/harness/tenants/seat-capital-desk.md) · `bun run test:seat-desk` |
| Partner onboard package | [`docs/harness/tenants/partner-onboarding-package.md`](docs/harness/tenants/partner-onboarding-package.md) · `bun tools/onboard-partner-package.ts` |
| Ops snapshot / registry bake | [`docs/harness/tenants/ops-snapshot.md`](docs/harness/tenants/ops-snapshot.md) · `bun run ops:snapshot` |
| Ops loop / outbox | [`docs/harness/tenants/ops-loop-throughput.md`](docs/harness/tenants/ops-loop-throughput.md) |
| Public plane (portal audit) | [`docs/harness/tenants/public-plane.md`](docs/harness/tenants/public-plane.md) · `bun run public:audit:verify` |
| Proton / vault deploy | [`docs/harness/tenants/proton-integration.md`](docs/harness/tenants/proton-integration.md) · `bun run proton:inject:factorywager:reasonix` |
| Cloudflare Pages | [`docs/harness/tenants/cloudflare-pages.md`](docs/harness/tenants/cloudflare-pages.md) · `bun run cloudflare:env` |
| Branded IDs | [`lib/types/branded/README.md`](lib/types/branded/README.md) · `bun run check:brands:all` |

Agent entry (full table): [`AGENTS.md`](AGENTS.md)

## Quick Start

```bash
bun run install:all      # isolated linker + global store (bun.com/docs/pm/global-store)
bun run install:verify   # sanity-check cache dir, links/, and no ./~ drift
bun run help             # Categorized commands (SSOT; optional: bun run cli:docs)
bun run type-check       # Day-loop check (tsconfig.check.json)
bun run build:affected   # Changed packages only (bun --filter ...)
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
| `bun run help` | Interactive categorized commands (`--verbose` for all) |
| `bun run cli:docs` | Regenerate [`docs/CLI.md`](docs/CLI.md) |
| `bun run type-check` | Day-loop typecheck (`tsconfig.check.json`) |
| `bun run build:affected` / `test:affected` | Changed packages only ([`--filter`](https://bun.com/docs/pm/filter)) |
| `bun run packages:list` | List packages (scaffolds hidden; `--include-scaffolds` / `--paths`) |
| `bun run validate:workspaces` | Validate workspace coverage |
| `bun run lint` | ESLint on `lib/` |
| `bun run lint:harness` | Harness ESLint config (lib, scripts, packages, server, config, tools) |
| `bun run format:core` | Prettier harness format (`format:harness`) |
| `bun run check:brands:all` | Branded ID gates (manifest + smart + types) |
| `bun run fix:console-log` | Bulk replace console.log → console.info |
| `bun run fix:scan-any-types` | Scan for `any` types |
| `bun run dev` | Start platform server |
| `bun run deployment:readiness` | Deployment readiness matrix |
| `bun run ops:snapshot` | Rebake `public/registry/*` + portal embeds |
| `bun run compliance:bake` | Compliance board (MA/NJ shadow matrix) |
| `bun run compliance:verify` | Compliance bake + portal tests |
| `bun run telegram:handshake:readiness` | Package-group handshake gates (`--deep`) |
| `bun run test:seat-desk` | Seat capital desk + handshake snapshot tests |
| `bun run harness:status` | Day-loop ratchets + proof status |
| `bun run ops:limits:check` | Partner limit freshness / CLV alerts |
| `bun run public:audit:verify` | Public plane discovery + portal static gate |
| `bun run proton:deploy:pages` | Cloudflare Pages deploy (after Proton inject) |

See `bun run help --verbose` (regenerate long [`docs/CLI.md`](docs/CLI.md) with `bun run cli:docs` only when needed).

## Code Quality & Fix Tools

Antipattern remediation (after major refactors). Conventions: [`.custom-instructions.md`](.custom-instructions.md).

- `bun run fix:console-log` — `console.log` → `console.info`
- `bun run fix:scan-any-types` — `: any` / `as any` → `unknown` or real types
- `bun run fix:scan-default-exports` — default export candidates
- `bun run fix:scan-non-null-assertions` — `!` assertions to safe access

Implementations: [`scripts/fix-*.ts`](scripts/fix-console-log.ts) (e.g. [`scripts/fix-console-log.ts`](scripts/fix-console-log.ts)).

## Shared Configuration

<!-- markdownlint-disable MD013 -->
- [`config/ports.ts`](config/ports.ts) — Port defaults (DOCS_SERVER=3000, P2P_PROXY=3002, DASHBOARD=3456, …); env-overridable
- [`config/r2-env.ts`](config/r2-env.ts) — Cloudflare/R2/Pages SSOT (`CLOUDFLARE_DEFAULTS`, `requireR2Config`)
- [`.env.example`](.env.example) — identity + secret placeholders + Pages build pins
- Status: `bun run cloudflare:env` · secrets: `CLOUDFLARE_API_TOKEN`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- CORS: `CORS_ALLOWED_ORIGINS` (comma-separated; empty = allow all)
- Bind: `SERVER_HOST` (default `localhost`)
<!-- markdownlint-enable MD013 -->

## Project Policies

- **Standards:** [`.custom-instructions.md`](.custom-instructions.md) · [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md)
- **Wire boundary:** [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) (parse once; no interior `unknown` / `decodeUnknown*`)
- **Import boundaries:** [`docs/IMPORT_BOUNDARIES.md`](docs/IMPORT_BOUNDARIES.md)
- **Layout:** [`STRUCTURE.md`](STRUCTURE.md) · homebase: [`docs/organization/HOMEBASE_DISCOVERY.md`](docs/organization/HOMEBASE_DISCOVERY.md)
- **Workspace hygiene:** `bun run validate:workspaces`
- **Harness:** brands → [`lib/types/branded/README.md`](lib/types/branded/README.md) · console depth → [`lib/console-depth.ts`](lib/console-depth.ts)
- **ESLint conventions:** no `console.log`; no `any`; named exports only; no non-null `!`; no empty `catch`; no hardcoded secrets
- **Monorepo tooling:** `--filter` patterns · `build:affected` / `test:affected`
