# FactoryWager Enterprise Platform

**Bun-native operations and sports-intelligence monorepo.** Shared domain and
verification logic lives in `lib/`; six `packages/*` workspaces join
`lib/shared` and Sports Terminal OS in the eight-package root graph. Product
applications live under `projects/active/`. The static operator plane is shipped
from `public/` and `functions/`, with machine-readable proofs baked under
`public/registry/`.

**Wiki navigation:** [full index](wiki-index.md) · [registry index](registry-index.md) ·
[docs index](docs/) · [harness JIT](docs/harness/)

**Quick jump:** [Canonical docs](#canonical-docs) · [At a glance](#platform-at-a-glance) ·
[Live surfaces](#live-surfaces) · [Portal boards](#portal-boards-operator) ·
[Registry](#registry-artifacts-baked-json) · [Day loop](#operator-day-loop) ·
[Tenants](#harness-tenants-jit) · [Quick start](#quick-start) · [Commands](#key-commands)

## Canonical docs

| Role | Doc |
|------|-----|
| This hub | [Home](/) · [wiki.factory-wager.com](https://wiki.factory-wager.com/) |
| AI agents | [`AGENTS.md`](AGENTS.md) (entry) · [`docs/harness/capability-map.md`](docs/harness/capability-map.md) · routing [`docs/AGENTS.md`](docs/AGENTS.md) |
| Wiki full index | [`wiki-index.md`](wiki-index.md) — portal · registry · tenants · proof loop |
| Registry index | [`registry-index.md`](registry-index.md) — bake map + portal consumers |
| Workspace map | [`STRUCTURE.md`](STRUCTURE.md) |
| Coding standards | [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md) · [`.custom-instructions.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/.custom-instructions.md) |
| Bun install policy | [`docs/UNIFIED.md`](docs/UNIFIED.md) |
| Bun native capabilities | [`docs/BUN_NATIVE_CAPABILITIES.md`](docs/BUN_NATIVE_CAPABILITIES.md) · [utilities map](docs/BUN_NATIVE_CAPABILITIES.md#utilities-guides-map) |
| Bun runtime conventions | [`lib/bun-runtime.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/bun-runtime.md) — process, TTY, paths, Markdown, cron, networking |
| Import boundaries | [`docs/IMPORT_BOUNDARIES.md`](docs/IMPORT_BOUNDARIES.md) |
| Wire boundary (parse once) | [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) |
| Portal foundation | [`docs/portal-foundation.md`](docs/portal-foundation.md) |
| Portal operator command map | [`docs/portal-ops-board-map.md`](docs/portal-ops-board-map.md) — generated from Portal weave v2 |
| Harness JIT | [`docs/harness/`](docs/harness/) · `bun run harness:status` |
| Codex thread portfolio | [`docs/harness/tenants/codex-thread-portfolio.md`](docs/harness/tenants/codex-thread-portfolio.md) · `bun run threads:portfolio:verify` |
| Local merge + Pages delivery | [`docs/harness/AUTHORITY.md`](docs/harness/AUTHORITY.md) · [`cloudflare-pages.md`](docs/harness/tenants/cloudflare-pages.md) · `bun run bun:ci` |
| Projects triage | [`projects/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/projects/README.md) |
| Path SSOT (code) | [`lib/docs/repo-docs.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/docs/repo-docs.ts) (`CANONICAL_REPO_DOCS`) |
| Harness thesis | [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering) (domain types; prefer **artifact** over **codebase**) |

**Remotes:** `origin` →
[project-R-score](https://github.com/brendadeeznuts1111/project-R-score).
`cascade` → `cascade-mover-v3` (private git remote; do not default-push there).

## Platform at a glance

| Plane                | Source                                    | Delivered / proved as                                              |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| Domain + harness     | `lib/`, `packages/`, `tools/`, `scripts/` | branded values, parse-once boundaries, ratchets, local merge proof |
| Product applications | `projects/active/`                        | independent apps plus selected root workspace members              |
| Operator portal      | `public/portal/`                          | static Cloudflare Pages boards with shared chrome and theme v1.3   |
| Edge API             | `functions/`                              | Pages-safe `/api/*`, `/health`, and discovery contracts            |
| Runtime-only modules | `functions-bun-only/`, `jobs/`, `server/` | Bun-only operators that are never bundled into Pages Functions     |
| Registry / evidence  | `public/registry/`                        | committed JSON bakes consumed by portal boards and verification    |

The portal’s route, chrome, theme, glossary, and command surfaces are governed
in source: [`portal-route-manifest.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/http/portal-route-manifest.ts),
[`chrome-catalog.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/portal/chrome-catalog.ts),
[`theme.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/portal/theme.ts), and
[`portal-weave.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/http/portal-weave.ts). Additions must update those
owners and pass the static portal gates.

## Live surfaces

| Surface              | URL                                                                                      | Role                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Wiki** (this site) | [wiki.factory-wager.com](https://wiki.factory-wager.com/)                                | GitHub Pages · `README.md` · [`docs/`](docs/) · [`AGENTS.md`](AGENTS.md) |
| **Portal hub**       | [score.factory-wager.com/portal/](https://score.factory-wager.com/portal/)               | Static boards + baked registry embeds (Cloudflare Pages)                 |
| **Registry bake**    | [score.factory-wager.com/registry/](https://score.factory-wager.com/registry/)           | `ops:snapshot` JSON (`ops-summary`, handshake, compliance, …)            |
| **Tennis HQ runtime** | [tennis.factory-wager.com](https://tennis.factory-wager.com/)                           | Operator-owned Worker · public identity/glossary · authenticated v1       |
| **Monitoring**       | [score.factory-wager.com/monitoring/](https://score.factory-wager.com/monitoring/)       | Routing · env · compliance tile · proof status                           |
| **Portal weave**     | [registry/portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json) | Cross-links + operator scripts (machine SSOT)                            |

Routing: [`docs/platform-routing.md`](docs/platform-routing.md) · edge verify:
`bun run verify:pages-edge` · local hot reload: `bun run serve:public:hot`

## Portal boards (operator)

| Board                     | Pages path                                                                                                                                                    | Harness doc                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portal home               | [`/portal/`](https://score.factory-wager.com/portal/)                                                                                                         | [`docs/portal-foundation.md`](docs/portal-foundation.md)                                                                                             |
| Ops (Portal weave v2)     | [`/portal/ops/`](https://score.factory-wager.com/portal/ops/)                                                                                                 | [`docs/portal-ops-board-map.md`](docs/portal-ops-board-map.md) · [`ops-loop-throughput.md`](docs/harness/tenants/ops-loop-throughput.md)             |
| TOC Ops                   | [`/portal/toc/`](https://score.factory-wager.com/portal/toc/)                                                                                                 | [`docs/harness/tenants/toc-ops.md`](docs/harness/tenants/toc-ops.md)                                                                                 |
| Compliance (MA/NJ)        | [`/portal/compliance/`](https://score.factory-wager.com/portal/compliance/)                                                                                   | [`docs/harness/tenants/compliance-portal.md`](docs/harness/tenants/compliance-portal.md)                                                             |
| Partner limits            | [`/portal/limits/`](https://score.factory-wager.com/portal/limits/)                                                                                           | [`docs/harness/tenants/partner-limits.md`](docs/harness/tenants/partner-limits.md) · `ops:limits:demo` · `ops:limits:capture` · `ops:limits:predict` |
| Partner history           | [`/portal/partner-history/`](https://score.factory-wager.com/portal/partner-history/)                                                                         | glossary-governed limit history and account dossier links                                                                                            |
| Domain glossary           | [`/portal/glossary/`](https://score.factory-wager.com/portal/glossary/)                                                                                       | schema v3 concepts, typed section titles, `URLPattern.hash` deep links                                                                               |
| Brands                    | [`/portal/brands/`](https://score.factory-wager.com/portal/brands/)                                                                                           | branded-value keymap and Bun × brand cross-map                                                                                                       |
| Dashboard                 | [`/portal/dashboard/`](https://score.factory-wager.com/portal/dashboard/)                                                                                     | KPIs · TOC · compliance plane                                                                                                                        |
| Health / Env              | [`/portal/health/`](https://score.factory-wager.com/portal/health/) · [`/portal/env/`](https://score.factory-wager.com/portal/env/)                           | `/api/health` schema v1 · env checklist                                                                                                              |
| Doctor                    | [`/portal/doctor/`](https://score.factory-wager.com/portal/doctor/)                                                                                           | `bun run portal:doctor` · `bake:doctor` · bunfig/catalog/linker groups · [`docs/UNIFIED.md`](docs/UNIFIED.md)                                        |
| Tools                     | [`/portal/tools/`](https://score.factory-wager.com/portal/tools/)                                                                                             | copyable commands grouped by Portal weave v2                                                                                                         |
| Failures / Console format | [`/portal/failures/`](https://score.factory-wager.com/portal/failures/) · [`/portal/console-format/`](https://score.factory-wager.com/portal/console-format/) | JUnit replay queue · output-policy ratchet                                                                                                           |
| Vault                     | [`/portal/vault/`](https://score.factory-wager.com/portal/vault/)                                                                                             | value-free Proton health bake                                                                                                                        |
| DOD queue                 | [`/portal/dod/`](https://score.factory-wager.com/portal/dod/)                                                                                                 | [`docs/harness/tenants/public-plane.md`](docs/harness/tenants/public-plane.md)                                                                       |
| Skills catalog            | [`/portal/skills/`](https://score.factory-wager.com/portal/skills/)                                                                                           | [`docs/harness/tenants/public-plane.md`](docs/harness/tenants/public-plane.md)                                                                       |
| Bookmakers                | [`/portal/bookmakers/`](https://score.factory-wager.com/portal/bookmakers/)                                                                                   | [`bookmakers-registry.md`](docs/harness/tenants/bookmakers-registry.md) · `bookmakers:bake`                                                          |
| Tennis HQ                 | [`/portal/tennis/`](https://score.factory-wager.com/portal/tennis/)                                                                                           | [`tennis-hq-registry.md`](docs/harness/tenants/tennis-hq-registry.md) · runtime [tennis.factory-wager.com](https://tennis.factory-wager.com/)       |

Full board index: [`wiki-index.md`](wiki-index.md#portal-boards). Local
launcher: `bun run dev:portal`. Bake: `bun run ops:snapshot` (full) ·
`bun run compliance:bake` (compliance only). Verify:
`bun run verify:portal:static` · `bun run public:audit:verify` ·
`bun run compliance:verify`.

## Registry artifacts (baked JSON)

| Artifact                   | Path                                                                                                                                                                                                                                                              | Notes                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Ops summary                | [`/registry/ops-summary.json`](https://score.factory-wager.com/registry/ops-summary.json)                                                                                                                                                                         | Liquidity · tree · compliance slice                               |
| Compliance board           | [`/registry/compliance-board.json`](https://score.factory-wager.com/registry/compliance-board.json)                                                                                                                                                               | MA/NJ shadow matrix · HMAC                                        |
| Monitoring                 | [`/registry/monitoring.json`](https://score.factory-wager.com/registry/monitoring.json)                                                                                                                                                                           | Routing proof · DOD · compliance tile                             |
| TOC Ops                    | [`/registry/toc-ops.json`](https://score.factory-wager.com/registry/toc-ops.json)                                                                                                                                                                                 | Fixture board bake                                                |
| Domain glossary            | [`/registry/domain-glossary.json`](https://score.factory-wager.com/registry/domain-glossary.json)                                                                                                                                                                 | Schema v3 concepts, surface sections, titles, and deep-link IDs   |
| Brand keymap               | [`/registry/brand-keymap.json`](https://score.factory-wager.com/registry/brand-keymap.json)                                                                                                                                                                       | Branded value constructors and domain-color adoption              |
| Portal chrome / weave      | [`/registry/portal-chrome.json`](https://score.factory-wager.com/registry/portal-chrome.json) · [`/registry/portal-weave.json`](https://score.factory-wager.com/registry/portal-weave.json)                                                                       | Navigation, components, surfaces, artifacts, and operator scripts |
| Harness health             | [`/registry/doctor-state.json`](https://score.factory-wager.com/registry/doctor-state.json) · [`/registry/monorepo-health.json`](https://score.factory-wager.com/registry/monorepo-health.json)                                                                   | Doctor groups and repository health score                         |
| Failures / console / vault | [`failures.json`](https://score.factory-wager.com/registry/failures.json) · [`console-format-state.json`](https://score.factory-wager.com/registry/console-format-state.json) · [`vault-health.json`](https://score.factory-wager.com/registry/vault-health.json) | Operator control-plane bakes                                      |
| Proof taxonomy             | [`/registry/proof-taxonomy-audit.json`](https://score.factory-wager.com/registry/proof-taxonomy-audit.json)                                                                                                                                                       | Cross-proof contracts                                             |

Full map: [`registry-index.md`](registry-index.md). Weave source:
[`lib/http/portal-weave.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/http/portal-weave.ts) · baked at
[portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json).

## Operator day loop

```bash
bun run lane:status                 # branch/worktree ownership + dirty/bake drift
bun run harness:status              # ratchets + proof posture
bun run dev:portal                  # hot local portal with exact board routes
bun run portal:doctor               # unified health gate (linker · bakes · catalog · bunfig · runtime)
bun run ops:snapshot --no-seed      # rebake registry + portal embeds
bun run docs:native:check           # keep Bun-native capability evidence synchronized
bun run test:colors                 # theme aliases + component color-kernel proof
bun run sweep:domain:fast           # live surfaces/routes/registry/API parity
bun run verify:portal:static        # route/chrome/static public-plane gate
bun run bun:ci                      # canonical local merge proof
```

The full sweep (`bun run sweep:domain`) adds Pages edge, color, glossary,
Telegram, snapshot, and native-doc gates; `bun run sweep:domain:cron` runs a
15-minute no-overlap loop with full gates hourly. Deploy (Pages):
`bun run proton:inject:factorywager:reasonix` → `bun run proton:deploy:pages`;
verify the immutable production deployment with `bun run verify:pages-edge`.
Vault map:
[`docs/harness/tenants/proton-integration.md`](docs/harness/tenants/proton-integration.md).

**Merge proof** is local only: `bun run bun:ci`. Hosted GitHub Actions is
disabled and is never a merge dependency.

## Harness tenants (JIT)

When a decision is unresolved, read **one** owner in
[`docs/harness/README.md`](docs/harness/) — not the full standards stack.

| Lane                         | Entry                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity / auth (Phase 0–2b) | [`lib/identity/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/identity/README.md) · lockout · anomaly · geo · password · JIT |
| Compliance portal (MA/NJ)    | [`compliance-portal.md`](docs/harness/tenants/compliance-portal.md) · `bun run compliance:verify` |
| Partner limit raises         | [`partner-limits.md`](docs/harness/tenants/partner-limits.md) · `ops:limits:demo` / `predict` |
| Factory Telegram             | [`telegram-factory.md`](docs/harness/tenants/telegram-factory.md) · `bun run telegram:verify` |
| Package-group handshake      | [`partner-package-group-handshake.md`](docs/harness/tenants/partner-package-group-handshake.md) · `telegram:handshake:readiness --deep` |
| Seat capital desk            | [`seat-capital-desk.md`](docs/harness/tenants/seat-capital-desk.md) · `bun run test:seat-desk` |
| Tennis HQ registry auth      | [`tennis-hq-registry.md`](docs/harness/tenants/tennis-hq-registry.md) · `/registry/tennis/agent-auth.json` |
| Bookmaker registry           | [`bookmakers-registry.md`](docs/harness/tenants/bookmakers-registry.md) · `bun run bookmakers:bake` |
| Ops snapshot / registry bake | [`ops-snapshot.md`](docs/harness/tenants/ops-snapshot.md) · `bun run ops:snapshot` |
| Public plane (portal audit)  | [`public-plane.md`](docs/harness/tenants/public-plane.md) · `bun run public:audit:verify` |
| Proton / vault deploy        | [`proton-integration.md`](docs/harness/tenants/proton-integration.md) · `proton:inject:factorywager:reasonix` |
| Cloudflare Pages             | [`cloudflare-pages.md`](docs/harness/tenants/cloudflare-pages.md) · `bun run cloudflare:env` |
| Monorepo health              | [`monorepo-health.md`](docs/harness/tenants/monorepo-health.md) · `bun run check:monorepo-health` |
| Branded IDs                  | [`lib/types/branded/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/types/branded/README.md) · `bun run check:brands:all` |

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
packages/                        Six live @factorywager/* workspaces (8 total in root graph)
lib/                             Shared harness (domains, brands, portal, verification)
public/portal/                   Static operator boards + shared browser chrome
public/registry/                 Committed machine-readable bakes and proofs
functions/                       Cloudflare Pages edge contracts (/api/*, /health)
functions-bun-only/              Bun-runtime modules excluded from Pages bundles
projects/active/factorywager/    Registry platform (+ workspace packages)
projects/active/sports-terminal-os/  Sports Terminal OS (root workspace member)
projects/active/kimiremote/      Sports proxy — own repo (gitignored here)
projects/active/enterprise/      Nested products (cascade/bet-ticker own repos, gitignored)
projects/active/*                Independent apps by category — see projects/README.md
```

Triage tiers `active/`, `experimental/`, and `archive/` are documented under
`projects/`. Full map: [`STRUCTURE.md`](STRUCTURE.md). Agent scope (what not to
load): [`projects/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/projects/README.md).

## Key Commands

| Command                                    | Description                                                           |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `bun run help`                             | Interactive categorized commands (`--verbose` for all)                |
| `bun run cli:docs`                         | Regenerate [`docs/CLI.md`](docs/CLI.md)                               |
| `bun run type-check`                       | Day-loop typecheck (`tsconfig.check.json`)                            |
| `bun run build:affected` / `test:affected` | Changed packages only ([`--filter`](https://bun.com/docs/pm/filter))  |
| `bun run packages:list`                    | List packages (scaffolds hidden; `--include-scaffolds` / `--paths`)   |
| `bun run validate:workspaces`              | Validate workspace coverage                                           |
| `bun run lint`                             | ESLint on `lib/`                                                      |
| `bun run lint:harness`                     | Harness ESLint config (lib, scripts, packages, server, config, tools) |
| `bun run format:harness`                   | Prettier harness format (`format:core` is an alias)                   |
| `bun run check:brands:all`                 | Branded ID gates (manifest + smart + types)                           |
| `bun run fix:console-log`                  | Bulk replace console.log → console.info                               |
| `bun run fix:scan-any-types`               | Scan for `any` types                                                  |
| `bun run dev`                              | Start platform server                                                 |
| `bun run deployment:readiness`             | Deployment readiness matrix                                           |
| `bun run dev:portal`                       | Hot local static portal with exact board routes                       |
| `bun run lane:status`                      | Primary/worktree drift, dirty areas, stale lanes, and bake drift      |
| `bun run ops:snapshot`                     | Rebake `public/registry/*` + portal embeds                            |
| `bun run compliance:bake`                  | Compliance board (MA/NJ shadow matrix)                                |
| `bun run compliance:verify`                | Compliance bake + portal tests                                        |
| `bun run telegram:handshake:readiness`     | Package-group handshake gates (`--deep`)                              |
| `bun run test:seat-desk`                   | Seat capital desk + handshake snapshot tests                          |
| `bun run harness:status`                   | Day-loop ratchets + proof status                                      |
| `bun run ops:limits:check`                 | Partner limit freshness / CLV alerts                                  |
| `bun run public:audit:verify`              | Public plane discovery + portal static gate                           |
| `bun run docs:native:check`                | Verify native-capability documentation evidence is synchronized       |
| `bun run test:colors`                      | Validate theme aliases and component color-kernel alignment           |
| `bun run sweep:domain`                     | Full cross-plane live sweep (`:fast`, `:cron`)                        |
| `bun run bun:ci`                           | Canonical local merge proof                                           |
| `bun run proton:deploy:pages`              | Cloudflare Pages deploy (after Proton inject)                         |

**Delivery loop** (`main` is PR-only, squash-merged):

```bash
gh pr create --fill
bun run bun:ci
gh pr merge --squash --delete-branch
git sync-main   # not git pull --ff-only (fails after squash by design)
```

Configure once:

```bash
git config --global alias.sync-main '!git fetch origin main && git reset --soft origin/main'
git config --global merge.conflictstyle zdiff3
```

After `git sync-main`, just-merged files may appear staged (`--soft` leaves
index/worktree at pre-merge content). They match `HEAD`; clear per file with
`git show origin/main:<path> > <path> && git add <path>`.

See `bun run help --verbose` (regenerate long [`docs/CLI.md`](docs/CLI.md) with
`bun run cli:docs` only when needed).

## Code Quality & Fix Tools

Antipattern remediation (after major refactors). Conventions:
[`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md).

| Command | Purpose |
|---------|---------|
| `bun run fix:console-log` | `console.log` → `console.info` |
| `bun run fix:scan-any-types` | `: any` / `as any` → `unknown` or real types |
| `bun run fix:scan-default-exports` | Default export candidates |
| `bun run fix:scan-non-null-assertions` | `!` assertions → safe access |

Implementations: [`scripts/fix-*.ts`](scripts/) (e.g.
[`scripts/fix-console-log.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/scripts/fix-console-log.ts)).

## Shared Configuration

<!-- markdownlint-disable MD013 -->
- [`config/ports.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/config/ports.ts) — Port defaults (DOCS_SERVER=3000, P2P_PROXY=3002, DASHBOARD=3456, …); env-overridable
- [`config/r2-env.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/config/r2-env.ts) — Cloudflare/R2/Pages SSOT (`CLOUDFLARE_DEFAULTS`, `requireR2Config`)
- [`.env.example`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/.env.example) — identity + secret placeholders + Pages build pins
- Status: `bun run cloudflare:env` · secrets via Proton inject (never paste into shell history)
- CORS: `CORS_ALLOWED_ORIGINS` (comma-separated; empty = allow all)
- Bind: `SERVER_HOST` (default `localhost`)
<!-- markdownlint-enable MD013 -->

## Project Policies

- **Standards:** [`docs/DEVELOPMENT-STANDARDS.md`](docs/DEVELOPMENT-STANDARDS.md) · [`.custom-instructions.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/.custom-instructions.md)
- **Wire boundary:** [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) — parse once; no interior `unknown` / `decodeUnknown*`
- **Import boundaries:** [`docs/IMPORT_BOUNDARIES.md`](docs/IMPORT_BOUNDARIES.md)
- **Layout:** [`STRUCTURE.md`](STRUCTURE.md) · homebase: [`docs/organization/HOMEBASE_DISCOVERY.md`](docs/organization/HOMEBASE_DISCOVERY.md)
- **Portal:** routes → [`portal-route-manifest.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/http/portal-route-manifest.ts) · chrome → [`chrome-catalog.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/portal/chrome-catalog.ts) · theme/colors → [`theme.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/portal/theme.ts) + `bun run test:colors`
- **Workspace hygiene:** `bun run validate:workspaces`
- **Harness:** brands → [`lib/types/branded/README.md`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/types/branded/README.md) · console depth → [`lib/console-depth.ts`](https://github.com/brendadeeznuts1111/project-R-score/blob/main/lib/console-depth.ts)
- **Merge authority:** local `bun run bun:ci` — never a hosted check as merge dependency
- **ESLint conventions:** no `console.log`; no `any`; named exports only; no non-null `!`; no empty `catch`; no hardcoded secrets
- **Monorepo tooling:** `--filter` patterns · `build:affected` / `test:affected`
