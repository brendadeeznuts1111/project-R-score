# Packages registry docs

Traceability map: internal docs · Bun canonical pages · generated artifacts · root tooling.  
**Capability map (grounded APIs):** [AGENTS.md § Grounded capability map](../../AGENTS.md#grounded-capability-map) · install/filter policy: [UNIFIED § catalogs](../UNIFIED.md#catalogs-and-workspace-protocols).

## Documentation index

| Doc | Role | Type | Status | Audience | Grounded capabilities | Maintainer | Triggers |
|-----|------|------|--------|----------|----------------------|------------|----------|
| [REGISTRY.md](./REGISTRY.md) | Generated package table — refresh with `bun run packages:list --write` | generated | active | developers | `Bun.Glob` (via `scanFilesSync`) · `Bun.file` / readJson · `Bun.write` | docs / packages tooling | new workspace member · version bump · triage change |
| [monorepo-workspaces.md](../harness/tenants/monorepo-workspaces.md) | Hybrid workspace graph · catalog · filter runbook · Bun canonical refs | internal | active | devops · contributors | workspace globs · `catalog:` · `bun run --filter` | platform | Bun PM upgrade · workspace membership change |
| [monorepo-workspaces § bun --filter](../harness/tenants/monorepo-workspaces.md#bun---filter-canonical) | Name vs `./path` · install · outdated · parallel · `type:toml` pitfall | internal | active | all operators | `--filter` · `--if-present` · `--parallel` / `--sequential` | platform | Bun filter semantics change |
| [UNIFIED.md § catalogs](../UNIFIED.md#catalogs-and-workspace-protocols) | Install + catalog policy · scripts vs filter · `type:toml` warning | policy | active | all | `catalog:` · `workspace:*` · frozenLockfile · exact | platform | install policy change |
| [UNIFIED § Scripts vs --filter](../UNIFIED.md#scripts-vs---filter) | Root scripts vs package `--filter` · docs UI facet warning | policy | active | all | root `bun run` · package `--filter` | platform | new root ops scripts |
| [pm/filter](https://bun.com/docs/pm/filter) | Canonical workspace package selector | canonical | active | all | `bun run --filter` · `bun install --filter` · `bun outdated --filter` | Bun OSS | — |
| [pm/cli/outdated](https://bun.com/docs/pm/cli/outdated) | Outdated deps; supports `--filter` | canonical | active | all | `bun outdated --filter` | Bun OSS | — |
| [pm/workspaces](https://bun.com/docs/pm/workspaces) | Workspace globs · `workspace:` protocol | canonical | active | all | workspaces · `workspace:*` | Bun OSS | — |
| [pm/catalogs](https://bun.com/docs/pm/catalogs) | Shared version SSOT · `catalog:` | canonical | active | all | `catalog` · `catalog:` | Bun OSS | — |

**Type legend:** `canonical` = bun.com · `policy` = FactoryWager install SSOT · `internal` = harness runbook · `generated` = machine-written artifact.

**Status legend:** `active` = maintained · `planned` = stub / no spine importers yet · `archived` = out of root install graph.

---

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
| **portal-cli** (`tools/portal-cli.ts`) | Snapshot · probe · secrets (pass-cli wrapper) | active | Root `bin.portal-cli` · `bun run portal-cli` · compile: `bun run build:portal-cli` → `dist/portal` |

portal-cli is **not** `@factorywager/portal-cli` and is **not** listed under root `workspaces.packages`. It is monorepo root tooling that operates on the workspace graph (snapshots, probes) and vault (secret autofill).

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

# Portal CLI (root tooling — snapshot + secrets)
bun run portal-cli snapshot run --scope prediction
bun run portal-cli snapshot list
bun run portal-cli probe lockfile
# Inject secrets from Proton Pass and run a command (real pass-cli)
bun run portal-cli secret autofill --vault factorywager -- ./start-agent.sh
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
