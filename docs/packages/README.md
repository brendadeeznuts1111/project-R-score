# Packages registry docs

Traceability map: internal docs · Bun canonical pages · generated artifacts · root tooling.  
**Capability map (grounded APIs):** [AGENTS.md § Grounded capability map](../../AGENTS.md#grounded-capability-map) · install/filter policy: [UNIFIED § catalogs](../UNIFIED.md#catalogs-and-workspace-protocols).

Decision tables below are **generated** from [`docs-index.json`](./docs-index.json) — edit the JSON, then `bun run packages:docs-index`. Do not hand-edit rows inside the HTML comment markers.

<!-- packages-docs-index:start -->
## Documentation index (decision table)

**Purpose:** route readers to the right doc, show trustworthiness, and link each row to the [Grounded capability map](../../AGENTS.md#grounded-capability-map).  
**Machine SSOT:** [`docs-index.json`](./docs-index.json) (edit JSON → `bun run packages:docs-index`).  
**Last catalog pass:** `2026-07-28`.

### Identity & trust

| Doc | Role | Type | Status | Audience | Last verified | Format |
|-----|------|------|--------|----------|---------------|--------|
| [REGISTRY.md](./REGISTRY.md) | Generated package table — refresh with bun run packages:list --write | generated | active | developers | 2026-07-28 | markdown (generated) |
| [monorepo-workspaces.md](../harness/tenants/monorepo-workspaces.md) | Hybrid workspace graph · catalog · filter runbook · Bun canonical refs | internal | active | devops · contributors | 2026-07-28 | markdown |
| [monorepo-workspaces § bun --filter](../harness/tenants/monorepo-workspaces.md#bun---filter-canonical) | Name vs ./path · install · outdated · parallel · type:toml pitfall | internal | active | all operators | 2026-07-28 | markdown (section) |
| [UNIFIED.md § catalogs](../UNIFIED.md#catalogs-and-workspace-protocols) | Install + catalog policy · scripts vs filter · type:toml warning | policy | active | all | 2026-07-28 | markdown |
| [UNIFIED § Scripts vs --filter](../UNIFIED.md#scripts-vs---filter) | Root scripts vs package --filter · docs UI facet warning | policy | active | all | 2026-07-28 | markdown (section) |
| [pm/filter](https://bun.com/docs/pm/filter) | Canonical workspace package selector | canonical | active | all | 2026-07-28 | external HTML |
| [pm/cli/outdated](https://bun.com/docs/pm/cli/outdated) | Outdated deps; supports --filter | canonical | active | all | 2026-07-28 | external HTML |
| [pm/workspaces](https://bun.com/docs/pm/workspaces) | Workspace globs · workspace: protocol | canonical | active | all | 2026-07-28 | external HTML |
| [pm/catalogs](https://bun.com/docs/pm/catalogs) | Shared version SSOT · catalog: | canonical | active | all | 2026-07-28 | external HTML |

### Ownership, capabilities & actions

| Doc | Grounded capabilities | Maintainer | Triggers | Related commands |
|-----|----------------------|------------|----------|------------------|
| [REGISTRY.md](./REGISTRY.md) | `Bun.Glob (scanFilesSync)` · `Bun.file` / `readJson` · `Bun.write` | docs / packages tooling | new workspace member · version bump · triage change | `bun run packages:list` · `bun run packages:list --write` |
| [monorepo-workspaces.md](../harness/tenants/monorepo-workspaces.md) | `workspace globs` · `catalog:` · `bun run --filter` · `bun outdated --filter` | platform | Bun PM upgrade · workspace membership change | `bun run validate:workspaces` · `bun run --filter '*'` · `bun outdated --filter` |
| [§ bun --filter](../harness/tenants/monorepo-workspaces.md#bun---filter-canonical) | `--filter` · `--if-present` · `--parallel` · `--sequential` · `--workspaces` | platform | Bun filter semantics change | `bun run --parallel --filter '*'` · `bun install --filter` · `bun outdated --filter` |
| [UNIFIED catalogs](../UNIFIED.md#catalogs-and-workspace-protocols) | `catalog:` · `workspace:*` · `frozenLockfile` · `install.exact` | platform | install policy change · catalog pin bump | `bun install` · `bun run validate:workspaces` |
| [UNIFIED Scripts vs --filter](../UNIFIED.md#scripts-vs---filter) | `root bun run` · `package --filter` | platform | new root ops scripts | `bun run ops:*` · `bun run --filter <pkg>` |
| [pm/filter](https://bun.com/docs/pm/filter) | `bun run --filter` · `bun install --filter` · `bun outdated --filter` | Bun OSS | — | `bun run --filter` · `bun outdated --filter` · `bun install --filter` |
| [pm/cli/outdated](https://bun.com/docs/pm/cli/outdated) | `bun outdated --filter` | Bun OSS | — | `bun outdated` · `bun outdated --filter` |
| [pm/workspaces](https://bun.com/docs/pm/workspaces) | `workspaces` · `workspace:*` | Bun OSS | — | `bun install` · `bun pm ls` |
| [pm/catalogs](https://bun.com/docs/pm/catalogs) | `catalog` · `catalog:` | Bun OSS | — | `bun install` · `bun outdated` |

**Type legend:** `canonical` = bun.com · `policy` = FactoryWager install SSOT · `internal` = harness runbook · `generated` = machine-written artifact.

**Status legend:** `active` = maintained and trustworthy · `stale` = re-verify before relying · `planned` = incomplete · `archived` = historical only.

**How to use this table**

| Question | Column |
|----------|--------|
| Can I trust it today? | **Status** + **Last verified** |
| Is this for me? | **Audience** |
| Which APIs does it depend on? | **Grounded capabilities** → [capability map](../../AGENTS.md#grounded-capability-map) |
| Who owns fixes? | **Maintainer** |
| When must I refresh it? | **Triggers** |
| What do I type in the terminal? | **Related commands** |

```bash
bun run packages:docs-index          # regenerate tables from docs-index.json
bun run packages:docs-index:check    # CI: fail if README out of sync
bun run packages:docs-index --bump-verified              # all rows → today
bun run packages:docs-index --bump-verified=2026-07-20   # all rows → date
bun run packages:docs-index --bump-verified=2026-07-20:registry-md,pm-filter
```
<!-- packages-docs-index:end -->

## Workspace packages (status-ordered)

### Active (spine or shipped tooling surface)

| Package / tool | Role | Status | Notes |
|----------------|------|--------|--------|
| `@factorywager/registry-client` | Publishable SDK · build/test | active | Root `workspace:*` dep · real exports |
| `@factorywager/guards` | Bun-first compliance | active | Root `workspace:*` · eslint harness |
| `@factorywager/rip` | Analysis tooling | active | Root `workspace:*` · `scripts/bun-rules.ts` |
| `@factorywager/docs-tools` | Doc validators (coupled to `lib/docs`) | active | Root `workspace:*` |
| `@factorywager/shared` | Entry-guard / URL helpers under `lib/shared` | active | Workspace via `lib/*` glob |
| `sports-terminal-os` | App workspace member | active | Path: `projects/active/sports-terminal-os` |

### Root tooling (not a workspace package)

| Tool | Role | Status | Notes |
|------|------|--------|--------|
| **portal-cli** (`tools/portal-cli.ts`) | Snapshot · probe · secret · vault health · pm · dashboard launcher | active | Root `bin.portal-cli` · `bun run portal-cli` · compile: `bun run build:portal-cli` → `dist/portal` · boards: `/portal/tools/` |

portal-cli is **not** `@factorywager/portal-cli` and is **not** listed under root `workspaces.packages`. It is monorepo root tooling: workspace graph (snapshots, probes, `pm graph`), vault (`secret`, `vault health`), and portal launcher (`dashboard --view=…`).

### Planned / dormant workspace members

| Package | Role | Status |
|---------|------|--------|
| `@factorywager/business` · `@factorywager/p2p` | Workspace members; no spine importers yet | planned |

### Archived (out of install graph)

| Location | Packages |
|----------|----------|
| `projects/archive/factorywager-packages/` | `ab-testing`, `versioning` — revive only with a real consumer |

---

## Day-to-day commands

**Capability map:** Commands below use APIs and CLIs from the [Grounded capability map](../../AGENTS.md#grounded-capability-map) where applicable (`Bun.spawn`, `Bun.write`, `Bun.file`, `Bun.Glob` / glob scan, `Bun.color`, `Bun.main` for CLI entry, pass-cli for secrets) plus workspace **`--filter`** as documented in [pm/filter](https://bun.com/docs/pm/filter).

**PM surface:** `bun run portal-cli pm …` (pack · ls · version · pkg · trust · cache · hash) — rows in the [Grounded capability map](../../AGENTS.md#grounded-capability-map); do not invent flags beyond [bun.com/docs/pm/cli/pm](https://bun.com/docs/pm/cli/pm).

```bash
# Workspace integrity
bun run validate:workspaces
bun run validate:workspaces --verbose
bun pm ls

# Package scripts (workspace members only — always --if-present on fan-out)
bun run --parallel --filter '*' --if-present test
bun run --filter @factorywager/registry-client build
bun run --filter './packages/*' --if-present test
bun run --filter sports-terminal-os typecheck

# Outdated (workspace packages only — not test files)
bun outdated --filter '@factorywager/*'
bun outdated --filter './packages/*'
bun outdated --filter './'                       # root package.json only
bun outdated --filter sports-terminal-os
bun outdated --filter '!./' --filter './packages/*'

# Portal CLI (root tooling — snapshot · probe · secret · vault · pm · dashboard)
bun run portal-cli snapshot run --scope prediction
bun run portal-cli snapshot list
bun run portal-cli probe lockfile
# bun pm surface (canonical: https://bun.com/docs/pm/cli/pm — no invented flags)
bun run portal-cli pm ls
bun run portal-cli pm pack --dry-run
bun run portal-cli pm pkg get name
bun run portal-cli pm hash
# FactoryWager extension: offline packages graph bake (not bun pm)
bun run portal-cli pm graph
bun run audit:packages -- --bake              # rebake packages-graph-map.json
# Vault health gate (offline snapshots · Harness Gates) + live bake
bun run portal-cli vault health
bun run vault:health:bake                     # needs agent session → /portal/vault/
# Inject secrets from Proton Pass and run a command (real pass-cli)
bun run portal-cli secret autofill --vault factorywager -- ./start-agent.sh
# Open real boards (no phantom routes)
bun run portal-cli dashboard --view=packages --open
bun run portal-cli dashboard --view=tools
# Compiled binary (optional)
bun run build:portal-cli                         # → dist/portal

# REGISTRY.md generation
bun run packages:list
bun run packages:list --write

# Canonical Bun refs (offline)
bun tools/bun-docs-catalog.ts get workspaces
bun tools/bun-doc-refs.ts suggest "--filter"     # → https://bun.com/docs/pm/filter
```

---

## Outdated & filter (canonical patterns)

`bun outdated` lists outdated dependencies; **`--filter`** narrows to workspace packages by **name** or **`./path`** (same selector rules as install/scripts).

**Canonical docs:** [pm/filter](https://bun.com/docs/pm/filter) · [pm/cli/outdated](https://bun.com/docs/pm/cli/outdated)

| Pattern | Result |
|---------|--------|
| `@factorywager/*` | Named `@factorywager/*` workspace members |
| `./packages/*` | All packages under `packages/` |
| `./` | Root `package.json` only |
| `sports-terminal-os` | Single app member |
| `'!./' --filter './packages/*'` | Packages only, skip root |

**Deep-dive** (matching, install, parallel, scripts, dependency order):  
[monorepo-workspaces § bun --filter](../harness/tenants/monorepo-workspaces.md#bun---filter-canonical)

### Mintlify `type:toml` is not a filter

URLs such as `https://bun.com/docs/pm/filter?search=type%3Atoml` use a **documentation search facet** (`type:toml` = show TOML samples on the docs site).

- ❌ Do **not** use `?search=type:toml` as a `--filter` flag. This is a Mintlify parameter, not a Bun CLI argument.  
- ❌ Do **not** invent `bun outdated --filter type:toml` or `bun run --filter type:toml …`.  
- ✅ Real filters: package **name** globs or **`./path`** patterns only.  
- TOML samples in PM docs are almost always **`bunfig.toml`** — see [runtime/bunfig](https://bun.com/docs/runtime/bunfig) and [UNIFIED § Scripts vs --filter](../UNIFIED.md#scripts-vs---filter).

---

## REGISTRY.md generation

Do **not** hand-edit [REGISTRY.md](./REGISTRY.md) for triage.

```bash
bun run packages:list            # print table
bun run packages:list --write    # rewrite docs/packages/REGISTRY.md
```

**Implementation** (`scripts/packages-list.ts`):

| Step | Grounded API | Map row |
|------|--------------|---------|
| Scan `**/package.json` | `Bun.Glob` via `scanFilesSync` ([fs-bun](../../scripts/lib/fs-bun.ts)) | Glob scanning |
| Read manifests | `Bun.file` / readJson | File existence & read |
| Write table | `Bun.write` | Streaming file write |

Both `Bun.write` and glob/file I/O are on the [Grounded capability map](../../AGENTS.md#grounded-capability-map). Optional triage flags: `--filter=core|active|…`, `--include-scaffolds`, `--paths`.

---

## See also

| Link | Why |
|------|-----|
| [AGENTS.md § Grounded capability map](../../AGENTS.md#grounded-capability-map) | Verifiable Bun / pass-cli surface |
| [STRUCTURE.md § Root workspaces](../../STRUCTURE.md#root-workspaces-authoritative) | Workspace globs SSOT |
| `bun run validate:workspaces` | Homebase membership gate |
| Tag `v5.2.2-monorepo-workspaces-catalog` | Monorepo hybrid milestone |
