# Projects Workspace Structure

High-level map of the FactoryWager Enterprise Platform monorepo
(`factorywager-enterprise`).

**Remotes:** `origin` →
[project-R-score](https://github.com/brendadeeznuts1111/project-R-score).
`cascade` → `cascade-mover-v3` (private git remote; do not default-push there).

## Canonical docs

| Role                          | Doc                                                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This map                      | [`STRUCTURE.md`](STRUCTURE.md)                                                                                                                                                                           |
| Human hub                     | [`README.md`](README.md)                                                                                                                                                                                 |
| AI agents                     | [`AGENTS.md`](AGENTS.md) (entry) · map [`docs/harness/capability-map.md`](docs/harness/capability-map.md) · routing [`docs/AGENTS.md`](docs/AGENTS.md)                                                   |
| Coding standards              | [`.custom-instructions.md`](.custom-instructions.md)                                                                                                                                                     |
| Bun install policy            | [`docs/UNIFIED.md`](docs/UNIFIED.md)                                                                                                                                                                     |
| Bun channel / type governance | [`config/bun-channels.toml`](config/bun-channels.toml) · [`docs/design/bun-channel-governance.md`](docs/design/bun-channel-governance.md) · `bun run bun:channel:check` |
| Bun token operate             | [`docs/BUN_DOCS_OPERATE.md`](docs/BUN_DOCS_OPERATE.md) (token plane) · [`lib/docs/token-ref.ts`](lib/docs/token-ref.ts) · [`lib/docs/bun-token.ts`](lib/docs/bun-token.ts) · `bun tools/bun-doc-refs.ts` |
| Bun catalog operate           | [`docs/BUN_DOCS_OPERATE.md`](docs/BUN_DOCS_OPERATE.md) (catalog plane) · `bun run docs:refresh` / `docs:catalog:*` · [`tools/bun-docs-catalog.ts`](tools/bun-docs-catalog.ts) |
| Bun blog / RSS helpers        | [`lib/docs/bun-blog-url.ts`](lib/docs/bun-blog-url.ts) · [`lib/docs/bun-rss.ts`](lib/docs/bun-rss.ts) · planes in [`docs/BUN_DOCS_OPERATE.md`](docs/BUN_DOCS_OPERATE.md) |
| Bun bench / profiling         | [`docs/harness/tenants/bun-bench-profiling.md`](docs/harness/tenants/bun-bench-profiling.md) · Observability: `bun test tests/bun-1.4.0-observability-contract.test.ts` |
| Root placement policy         | [`config/repo-root-policy.ts`](config/repo-root-policy.ts) · `bun scripts/repo-hygiene.ts`                                                                                                               |
| Projects triage               | [`projects/README.md`](projects/README.md)                                                                                                                                                               |
| Path SSOT (code)              | [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts)                                                                                                                                                         |
| Wire boundary                 | [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md)                                                                                                                                                         |
| Harness thesis                | [lopopolo/harness-engineering](https://github.com/lopopolo/harness-engineering)                                                                                                                          |

## Root layout (current)

```
Projects/
├── .agents/                 # Agent skills (SKILL.md + allowed skill assets; no node_modules)
├── .claude/                 # Claude commands / agents
├── .github/                 # Workflows, templates
├── _includes/               # Jekyll includes for wiki.factory-wager.com
├── AGENTS.md                # Always-loaded agent policy → docs/AGENTS.md router
├── .custom-instructions.md  # Coding standards SSOT
├── README.md                # Human hub
├── STRUCTURE.md             # This file
├── wiki-index.md            # Wiki full navigation (portal · registry · tenants)
├── registry-index.md        # Registry bake index (portal consumers)
├── archive/                 # Frozen local experiments (gitignored entire tree)
├── artifact-registry/       # Versioned public/ops artifact split (ops never deploys to Pages)
├── artifacts/               # Releases + local reports (reports/ largely ignored)
│   ├── browser/             # Local browser exports (gitignored)
│   └── snapshots/           # Portal data-plane snapshots (gitignored)
├── assets/                  # Logos, charts
├── config/                  # ports.ts, r2-env, registry, ci bunfig
├── dashboard/               # Dashboard servers & UIs
├── docs/                    # Documentation (UNIFIED.md, AGENTS.md, guides)
│   ├── README.md            # Docs index (SSOT navigation)
│   ├── AGENTS.md            # Pointer → root AGENTS.md (routing tables)
│   ├── harness/capability-map.md  # Grounded Bun/Proton capability matrix (bake:capabilities)
│   ├── UNIFIED.md · WIRE_BOUNDARY.md · DEVELOPMENT-WORKFLOW.md
│   ├── BUN_DOCS_OPERATE.md  # Token · catalog · blog · RSS operate planes
│   ├── organization/        # Root cleanup history
│   ├── performance/         # Search pin + pointer to bun-bench-profiling tenant
│   ├── harness/tenants/bun-bench-profiling.md  # Bun bench/profile metric SSOT
│   └── packages/            # REGISTRY.md snapshot (regenerate via packages:list tooling)
├── examples/                # Demos & Bun feature showcases (opt-in context)
├── functions/               # Cloudflare Pages edge Functions (/api/* — edge-safe only, see tests/functions-edge-safety.test.ts)
├── functions-bun-only/      # Bun-runtime API modules (DOD review, telegram, catalog — not deployed to Pages edge)
├── jobs/                    # Operator-scheduled runtime entrypoints
├── Kalshi-bot/              # Nested product submodule (own remote; see .gitmodules)
├── lib/                     # Shared library — README.md inventory + domain/*/README.md indexes
│   └── docs/repo-docs.ts    # CANONICAL_REPO_DOCS path SSOT
├── packages/                # @factorywager/* internal packages (8 live · 2 archived under projects/archive/factorywager-packages)
├── plannator/               # Local Plannotator extra skills mirror (thin)
├── projects/
│   ├── README.md            # Triage SSOT — every product leaf + root contract
│   ├── experimental/        # Demos / PoCs (each top-level has README + package.json)
│   ├── archive/             # Tier bucket (+ README); first freeze: factorywager-packages/
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
├── server/ · tests/ · tools/  # tools/benchmarks = Bun microbench runners (see bun-bench-profiling tenant)
├── migrations/ · warehouse/ # SQL deployment source · image-pipeline source media
├── bunfig.toml · package.json · tsconfig*.json
└── registry.config.json5    # → config/ (symlink)
```

### Root inventory (kind · type · protocol · repo · channel)

Placement: [`config/repo-root-policy.ts`](config/repo-root-policy.ts) ·
`bun scripts/repo-hygiene.ts`. Bun channels:
[`config/bun-channels.toml`](config/bun-channels.toml) ·
`bun run bun:channel:check`.

**Channel** = delivery/governance plane (one primary per row). Bun install pins
three channels on purpose — see pin triple below.

| Channel             | Plane                                    | Separation                                           |
| ------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `bun-runtime`       | Installed Bun binary                     | Production/CI on **stable** only                     |
| `bun-types-wrapper` | `@types/bun`                             | npm **latest**; stable public types                  |
| `bun-types-defs`    | `bun-types`                              | npm **canary**; forward decls without moving runtime |
| `verify-channel`    | Proof suites (`verify:channel:*`)        | Observe a tip; never mutates pins                    |
| `ops-outbox`        | Durable ops events (`lib/channels/`)     | Domain delivery ≠ Bun governance                     |
| `pages`             | Cloudflare Pages `project-r-score`       | `public/` + `functions/` + `wrangler.toml`           |
| `wiki`              | Jekyll `wiki.factory-wager.com`          | `CNAME` + `_config.yml` + wiki markdown              |
| `access`            | Cloudflare Access SSO                    | `.cloudflare-access.yml` (`scoped: true`)            |
| `vault`             | Proton Pass → env                        | `env.template` inject; secrets never committed       |
| `mcp`               | Editor/agent MCP catalog                 | `.mcp.json` (`.cursor/mcp.json` → symlink)           |
| `git-submodule`     | Tracked nested product                   | Own remote; own install graph                        |
| `nested-park`       | Gitignored root clone                    | Own remote; not spine SSOT                           |
| `spine`             | Harness / monorepo interior              | `origin` / `project-R-score`                         |
| `meta`              | Ownership, license, leak scan, app perms | Not a delivery channel                               |

#### Bun channel pin triple (intentional)

| Channel             | Artifact                                                         | Dist-tag / policy | Pin                  | Mutates?           |
| ------------------- | ---------------------------------------------------------------- | ----------------- | -------------------- | ------------------ |
| `bun-runtime`       | `bun` binary · `.bun-version` · `packageManager` · `engines.bun` | stable            | `1.4.0`              | reviewed lane only |
| `bun-types-wrapper` | `@types/bun` (`catalog:`)                                        | latest            | `1.4.0`              | reviewed lane only |
| `bun-types-defs`    | `bun-types` (`catalog:`)                                         | pinned-tip        | `1.4.0-tip.23d233b2` | reviewed lane only |

Doctor reports the wrapper/defs split as **intentional**, not drift.
Same-version lint would erase the experiment boundary. Observation artifact:
`public/registry/bun-channel-status.json` (derived; never edit as policy).

| Operator command                                                         | Channel plane      | Role                                |
| ------------------------------------------------------------------------ | ------------------ | ----------------------------------- |
| `bun run bun:channel:check` / `:report` / `:cron:*`                      | Bun install policy | Read-only drift vs TOML             |
| `bun run verify:channel` / `:runtime` / `:canary` / `:all` / `:meta` / … | `verify-channel`   | Proof suites against a resolved tip |
| `bun run ops:outbox:requeue`                                             | `ops-outbox`       | Drain durable ops events            |

#### Tracked root files

| Kind                | Type                         | Protocol                                                                            | Repo                                            | Channel         | Entries                                                               |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- | --------------- | --------------------------------------------------------------------- |
| Docs hub            | markdown                     | human + agent SSOT                                                                  | `brendadeeznuts1111/project-R-score` (`origin`) | `spine`         | `AGENTS.md`, `README.md`, `STRUCTURE.md`, `.custom-instructions.md`   |
| Wiki index          | markdown + front matter      | Jekyll                                                                              | same                                            | `wiki`          | `wiki-index.md`                                                       |
| Registry index      | markdown + front matter      | Pages consumer map                                                                  | same                                            | `pages`         | `registry-index.md`                                                   |
| Install graph       | json / lockfile / toml / pin | Bun workspaces + `catalog:`                                                         | same                                            | `bun-runtime`   | `package.json`, `bun.lock`, `bunfig.toml`, `.bun-version`, `.bun.env` |
| Env templates       | dotenv / d.ts                | Proton `pass://` inject                                                             | same                                            | `vault`         | `env.template`, `.env.example`, `.env.registry.example`, `env.d.ts`   |
| Typecheck / lint    | typescript                   | TS project refs + ESLint flat                                                       | same                                            | `spine`         | `tsconfig*.json`, `eslint.config.ts`, `eslint.harness.config.ts`      |
| Pages Functions     | toml                         | Wrangler + R2 binding                                                               | same · Pages `project-r-score`                  | `pages`         | `wrangler.toml` (`REGISTRY_BUCKET` → `factory-wager-registry`)        |
| Wiki host           | text / yaml                  | GitHub Pages / Jekyll                                                               | same                                            | `wiki`          | `CNAME`, `_config.yml`                                                |
| Access policy       | yaml                         | Access policy-as-code                                                               | same                                            | `access`        | `.cloudflare-access.yml`                                              |
| Reasonix            | toml                         | project override stub (`config_version` only; remotes in `~/.reasonix/config.toml`) | same                                            | `meta`          | `reasonix.toml`                                                       |
| MCP catalog         | json                         | MCP servers                                                                         | same                                            | `mcp`           | `.mcp.json`                                                           |
| Submodule pin       | gitmodules                   | git submodule (HTTPS)                                                               | same → Kalshi-bot                               | `git-submodule` | `.gitmodules`                                                         |
| Ownership / license | text / toml                  | GitHub / gitleaks                                                                   | same                                            | `meta`          | `CODEOWNERS`, `LICENSE`, `.gitleaks.toml`                             |
| Registry config     | symlink → json5              | path SSOT                                                                           | same                                            | `spine`         | `registry.config.json5` → `config/registry.config.json5`              |

Git remotes on this checkout: `origin` → `project-R-score`; `cascade` →
`cascade-mover-v3` (remote only — not a root dir). Identity SSOT:
`CANONICAL_REMOTES` in [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts).

#### Spine directories (tracked) + policy owners

| Dir                                                | Channel                                    | Owner (policy)      | Role                                                                   |
| -------------------------------------------------- | ------------------------------------------ | ------------------- | ---------------------------------------------------------------------- |
| `lib/`                                             | `spine`                                    | harness             | Shared library; `lib/shared` is workspace `@factorywager/shared`       |
| `packages/`                                        | `spine`                                    | harness             | 8 live `@factorywager/*` (see workspaces below)                        |
| `projects/`                                        | `spine`                                    | triage              | active / experimental / archive; some nested remotes gitignored        |
| `scripts/` · `tools/` · `tests/`                   | `spine`                                    | harness             | Automation, CLI, suites                                                |
| `public/`                                          | `pages`                                    | Cloudflare Pages    | Portal + registry bakes                                                |
| `functions/`                                       | `pages`                                    | platform-routing    | Edge `/api/*` (edge-safe only)                                         |
| `functions-bun-only/`                              | `spine`                                    | platform-routing    | Bun-only APIs — **not** Pages edge                                     |
| `config/`                                          | `spine`                                    | harness             | r2-env, surfaces, bun-channels, repo-root-policy                       |
| `docs/`                                            | `spine`                                    | harness             | UNIFIED, harness tenants, design contracts                             |
| `spine/`                                           | `spine`                                    | harness             | Multi-tenant scheduler / proof tenants                                 |
| `jobs/`                                            | `spine`                                    | operations          | Operator-scheduled entrypoints                                         |
| `artifact-registry/`                               | `pages` (public half) · ops (private half) | bookmakers-registry | Versioned split; ops never deploys to Pages                            |
| `_includes/`                                       | `wiki`                                     | github-pages        | Jekyll includes                                                        |
| `dashboard/` · `server/` · `examples/`             | `spine`                                    | various             | Supporting surfaces                                                    |
| `migrations/`                                      | `spine`                                    | database            | SQL deployment source                                                  |
| `warehouse/`                                       | `spine`                                    | image-pipeline      | Source media for `config/images.toml`                                  |
| `assets/` · `plannator/` · `reports/` · `scratch/` | `spine` / local                            | various             | Thin or curated local                                                  |
| `artifacts/`                                       | `meta` (local store)                       | artifact-store      | Allowlisted dump root; contents mostly gitignored                      |
| `archive/`                                         | `meta`                                     | freeze              | Policy allowlisted; tree mostly gitignored (some legacy tracked paths) |
| `Kalshi-bot/`                                      | `git-submodule`                            | kalshi              | See nested table                                                       |

`ROOT_INTEGRATIONS` in policy (explicit owner + purpose): `_includes`,
`artifact-registry`, `functions-bun-only`, `jobs`, `migrations`, `warehouse`.

**Retired root parking** (not allowlisted — hygiene `unexpected-root-dir` +
route in [`config/repo-root-policy.ts`](config/repo-root-policy.ts)
`ROOT_DIRECTORY_ROUTES`): `database`, `herdr-worktrees`, `logs`, `services`,
`src`, `utils`, `workers`.

#### Delivery wiring (root → host)

| Root inputs                                            | Host / binding                                           | Channel  |
| ------------------------------------------------------ | -------------------------------------------------------- | -------- |
| `CNAME` + `_config.yml` + wiki markdown + `_includes/` | `wiki.factory-wager.com`                                 | `wiki`   |
| `public/` + `functions/` + `wrangler.toml`             | CF Pages `project-r-score` + R2 `factory-wager-registry` | `pages`  |
| `.cloudflare-access.yml`                               | Access apps: ledger, portal, pages.dev                   | `access` |
| `env.template` → `.env` (gitignored)                   | Proton Pass `pass://factorywager/…`                      | `vault`  |
| `.mcp.json`                                            | Local + remote MCP servers                               | `mcp`    |

MCP servers (SSOT `.mcp.json`): `bun-docs`, `dx`, `cascade-mover` (HTTP),
`ast-grep`, `github`, `cloudflare`, `cloudflare-docs`, `cloudflare-bindings`,
`cloudflare-observability`.

#### Not monorepo spine (local / nested only)

On disk under `~/Projects` but **not** platform SSOT — gitignored, excluded, or
a submodule with its own remote:

| Path                                                                                                                      | Type                      | Protocol      | Repo                                                           | Channel         | Notes                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------- | -------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| `Kalshi-bot/`                                                                                                             | git submodule             | HTTPS gitlink | [Kalshi-bot](https://github.com/brendadeeznuts1111/Kalshi-bot) | `git-submodule` | Parent records gitlink; worktree may drift — bump via reviewed lane                                   |
| `Proton-workspace/`                                                                                                       | nested clone              | git SSH       | `…/proton-workspace-playbook`                                  | `nested-park`   | Proton playbook                                                                                       |
| `plannotator-upstream/`                                                                                                   | nested clone              | git HTTPS     | `backnotprop/plannotator`                                      | `nested-park`   | Prefer thin `plannator/`                                                                              |
| `toc-ops-repo/`                                                                                                           | nested clone              | git SSH       | `…/toc-ops`                                                    | `nested-park`   | Live TOC product                                                                                      |
| `toc-ops/`                                                                                                                | docs dir                  | —             | —                                                              | `nested-park`   | Architecture notes only (no `.git`)                                                                   |
| `bet-turnin-sheet/`, `bradley-terry/`                                                                                     | nested clone              | git SSH/HTTPS | own remotes                                                    | `nested-park`   |                                                                                                       |
| `oddsblaze/`, `king-zippy-umbra-acre/`, `king-zippy-umbra-acre-plum-integration/`                                         | nested clone              | git SSH       | own remotes                                                    | `nested-park`   |                                                                                                       |
| `plum-spruce-dawn-dune1/`                                                                                                 | nested clone              | git SSH       | `…/plum-spruce-dawn-dune1`                                     | `nested-park`   | Local exclude; tennis HQ producer                                                                     |
| `stream-deck-neo/`                                                                                                        | nested clone              | git SSH       | `…/stream-deck-neo`                                            | `nested-park`   |                                                                                                       |
| `kimi-toolchain`                                                                                                          | symlink                   | filesystem    | `…/kimi-toolchain` (outside tree)                              | `nested-park`   | → `~/kimi-toolchain`                                                                                  |
| `projects/active/kimiremote/`, `…/enterprise/{cascade-mover-v3,bet-ticker-worker-v1.1}/`, `…/f402-openapi/`               | nested under active       | own remotes   | own                                                            | `nested-park`   | Path convenience only                                                                                 |
| Root `herdr-worktrees/`, `profiles/`, `bun-write-test/`, `test-*-*`, `test-binary-*`, `**/sports-terminal-{before,after}` | local parking             | —             | —                                                              | `meta`          | Delete if reappear                                                                                    |
| `.worktrees/`                                                                                                             | git worktrees (this repo) | filesystem    | `project-R-score` feat lanes                                   | `meta`          | Gitignored; `git worktree list`                                                                       |
| `.codex-worktrees/`                                                                                                       | nested worktrees          | filesystem    | often other remotes                                            | `meta`          | Gitignored; not in this repo's `git worktree list` — checkouts of plum / Kalshi-bot / king-zippy etc. |

Related (not root files): `lib/channels/` → `ops-outbox`;
`tools/verify-channel.ts` → `verify-channel`.

`projects/experimental/` holds relocated demos (see
[`projects/experimental/README.md`](projects/experimental/README.md)).
`projects/archive/` holds the first freeze
([`factorywager-packages/`](projects/archive/factorywager-packages/) —
`ab-testing`, `versioning`).

## Key navigation

- **Day loop?** `bun run help` · `bun run type-check` (`tsconfig.check.json`
  spine) · `bun run build:affected` / `test:affected` (**git-true** via
  [`scripts/affected-workspaces.ts`](scripts/affected-workspaces.ts)). Harness
  JIT: [`docs/harness/README.md`](docs/harness/README.md). CLI: `bun run help`
  (optional regenerate [`docs/CLI.md`](docs/CLI.md) via `cli:docs`).
- **Run something?** Root `package.json` scripts (`bun run <name>`). Prefer
  named scripts over inventing paths.
- **Workspace:** `bun run validate:workspaces` ·
  [monorepo-workspaces.md](docs/harness/tenants/monorepo-workspaces.md) ·
  `build:affected` / `test:affected` · `affected:list`
- **CLI:** [`tools/cli/`](tools/cli/) · `bun run help`
- **Demos:** [`examples/`](examples/INDEX.md) (optional for product work)
- **Bun install policy:** [`docs/UNIFIED.md`](docs/UNIFIED.md)
- **Coding standards:** [`.custom-instructions.md`](.custom-instructions.md)
- **Wire boundary:** [`docs/WIRE_BOUNDARY.md`](docs/WIRE_BOUNDARY.md) · ESLint
  `BOUNDARY_POLICY`
- **Project inventory:** [`lib/projects-scan.ts`](lib/projects-scan.ts) ·
  `bun run packages:list` · `bun run registry:projects`
- **Brands:** [`lib/types/branded/README.md`](lib/types/branded/README.md) ·
  `bun run check:brands:all`
- **Console domain / `bun run -`:** [`lib/console/`](lib/console/README.md)
  (`cliOut` · `tones` · chrome) · facade
  [`lib/console-depth.ts`](lib/console-depth.ts) · note
  [`lib/console-depth.md`](lib/console-depth.md)
- **`bun create` / factory scaffold:**
  [`docs/design/bun-create-alignment.md`](docs/design/bun-create-alignment.md) ·
  [`.bun-create/`](.bun-create/) · [`lib/factory/`](lib/factory/README.md) ·
  `bun run factory:create`
- **Agent triage:** [`projects/README.md`](projects/README.md)
- **Codex threads:** stable `RTH-###` identity, ranking, references, and
  bring-home parity →
  [`docs/harness/tenants/codex-thread-portfolio.md`](docs/harness/tenants/codex-thread-portfolio.md)
  · `bun run threads:portfolio:verify`

## Root workspaces (authoritative)

From root `package.json` `workspaces.packages` (SSOT — do not invent extra
globs):

- `packages/*` — `@factorywager/*` library packages
- `projects/active/sports-terminal-os` — Sports Terminal OS (workspace member,
  not a nested install root)
- `lib/*` — currently only `lib/shared` (`name: shared`); product code under
  other `lib/**` paths is imported relatively, not as workspace packages
- `.agents/skills/ast-grep` — private hook tooling; root install + shared
  lockfile own dependencies required by pre-commit

**Live `@factorywager/*` under `packages/`:** `business`,
`bun-release-contracts`, `docs-tools`, `guards`, `p2p`, `partners`,
`registry-client`, `rip`.  
**Root `workspace:*` deps (imported from spine):** `docs-tools`, `guards`,
`registry-client`, `rip`.  
**Workspace-only (not root deps):** `business`, `bun-release-contracts`, `p2p`,
`partners`, `@factorywager/shared` (`lib/shared`), `sports-terminal-os`,
`@projects/ast-grep-skill`.  
**Archived (out of root install graph):**
`projects/archive/factorywager-packages/{ab-testing,versioning}` — revive only
with a real consumer.

**Not root workspaces:** nested monorepos under `projects/**` (e.g.
`projects/active/factorywager/registry`) keep their **own** `workspaces` /
`catalog` and own `bun install`. Shared third-party pins for root members use
root `catalog` + `catalog:` — see
[`docs/UNIFIED.md`](docs/UNIFIED.md#catalogs-and-workspace-protocols).

## Organization history (condensed)

- **Phase 1–4 (Feb–May 2026):** Root cleanup, workspace isolation,
  `@factorywager/*` rename, package registry, antipattern remediations.
  Historical paths `data/`, `database/`, root `factorywager/`, root
  `kimiremote/` were **moved or removed** — do not resurrect in maps.
- **Phase 4.4:** Shared [`lib/projects-scan.ts`](lib/projects-scan.ts).
- **Jun 2026:** bet-ticker + cascade under `projects/active/enterprise/`
  (gitignored nested repos).
- **Jul 2026:** Context-bloat pass — compile dumps removed; root nested products
  gitignored; STRUCTURE/projects README aligned to disk; skill `node_modules` /
  utility `dist` cleaned; experimental/archive tier buckets; `packages:list`
  scaffold filter; local runtime DBs/build-artifacts pruned.
- **Jul 2026 (docs):** Root standards rewrite;
  [`lib/docs/repo-docs.ts`](lib/docs/repo-docs.ts) as path SSOT; cleanup summary
  under [`docs/organization/`](docs/organization/HOMEBASE_DISCOVERY.md).
- **Jul 2026 (projects triage):** Dropped ghost inventory
  (`barbershop`/`peer`/empty experimental+archive paths);
  `bun run registry:projects` regenerates
  [`public/registry/projects-registry.json`](public/registry/projects-registry.json);
  `packages:list --write` refreshes
  [`docs/packages/REGISTRY.md`](docs/packages/REGISTRY.md).
- **Jul 2026 (scripts trim):** Collapsed ~100 duplicate/unused `package.json`
  scripts; removed `scratch` passthrough, `deploy-production.sh`,
  `url-validator-focused.ts`; migrate phase aliases → `bun-migrate` direct.
- **Jul 2026 (bloat/speed):** CLI category SSOT; scripts **329 → 275 → 258 → 193
  → 176 → 173** at the trim pass; demos + utility sandboxes →
  `projects/experimental/`; Bun-native `fs-bun`/`cli-args`/`Bun.argv`; skip
  ast-grep doctor on lockfile-only staged sets; day-loop docs. Notes:
  [`docs/organization/BLOAT_SPEED_PASS.md`](docs/organization/BLOAT_SPEED_PASS.md).
- **Aug 2026 (surface growth):** Portal/registry bakes, doctor groups, and proof
  scripts expanded the root script surface again — inventory via `bun run help`
  / `bun run help --verbose` (not the Jul trim count).

Detail:
[`docs/organization/HOMEBASE_DISCOVERY.md`](docs/organization/HOMEBASE_DISCOVERY.md)
·
[`docs/organization/BLOAT_SPEED_PASS.md`](docs/organization/BLOAT_SPEED_PASS.md).

## Future candidates

- Further freezes under `projects/archive/` as packages leave the install graph.
- Curate remaining `scratch/bun-v1.3.9-examples/`.
- Optional: physical move of root-parked nested repos out of `~/Projects`
  entirely.
- Prune idle `.codex-worktrees/*` checkouts when their product remotes no longer
  need a local lane (they are not FactoryWager `git worktree` entries). Session
  archive map:
  [`docs/organization/session-organization.md`](docs/organization/session-organization.md)
  · naming grammar:
  [`docs/organization/naming-grammar.md`](docs/organization/naming-grammar.md) ·
  lane crosswalk:
  [`docs/harness/tenants/workspace-lane-cross-map.md`](docs/harness/tenants/workspace-lane-cross-map.md)
  · `/portal/lanes/`.

Maintained by the platform team. Run `bun run dashboard` for live views, or use
active CLIs under [`tools/cli/`](tools/cli/) (e.g. `endpoint-status.ts`).
