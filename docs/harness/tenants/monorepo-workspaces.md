# Tenant: monorepo-workspaces (hybrid catalog)

**Tenant** hybrid Bun monorepo install graph  
**Gate** `bun run validate:workspaces` · install policy [`docs/UNIFIED.md`](../../UNIFIED.md)  
**Layout** [`STRUCTURE.md`](../../../STRUCTURE.md) · packages map [`docs/packages/`](../../packages/)  
**Health** sibling [`monorepo-health.md`](./monorepo-health.md) · `bun run monorepo:health`  
**Tag** `v5.2.2-monorepo-workspaces-catalog` (milestone: catalog SSOT + homebase gate + package exports)

## Model (one paragraph)

FactoryWager is a **hybrid monorepo**: product/ops live at the **root** (relative `lib/**` imports + root scripts). A **small** set of `@factorywager/*` packages plus `sports-terminal-os` are Bun workspace members for linking, catalogs, and `--filter`. Nested trees under `projects/**` are **separate install roots** unless listed in root `workspaces.packages`.

```text
factorywager-enterprise (root)
├── lib/**          relative imports — primary product surface
├── tools/, tests/  root scripts (ops:*, harness:*, portal:*)
├── packages/*      @factorywager/* workspace packages
├── lib/shared      @factorywager/shared (lib/* glob)
├── sports-terminal-os   workspace app member
└── projects/**     nested monorepos / archive (not root workspaces)
```

## Bun canonical references

Resolve offline with:

```bash
bun tools/bun-docs-catalog.ts get workspaces
bun tools/bun-doc-refs.ts suggest "workspaces"
bun tools/bun-doc-refs.ts suggest "--filter"
bun tools/bun-doc-refs.ts suggest "overrides"
bun tools/bun-doc-refs.ts suggest "bun patch"
```

| Topic | Canonical URL | Use for |
|-------|---------------|---------|
| Workspaces + `workspace:` | https://bun.com/docs/pm/workspaces | Globs, linking, publish rewrite |
| Catalogs + `catalog:` | https://bun.com/docs/pm/catalogs | Shared version SSOT |
| `--filter` / scripts | https://bun.com/docs/pm/filter | Name vs `./path`, install/outdated/scripts |
| Parallel / sequential | https://bun.com/docs/pm/filter#parallel-and-sequential-mode | `bun run --parallel` ≠ `bun test --parallel` |
| Install CLI | https://bun.com/docs/pm/cli/install | Frozen lockfile, peers, filters |
| Isolated installs | https://bun.com/docs/pm/isolated-installs | `configVersion: 1` default |
| Overrides | https://bun.com/docs/pm/overrides | Root-only metadeps |
| Patch | https://bun.com/docs/pm/cli/patch | `patchedDependencies` |
| bunfig install | https://bun.com/docs/runtime/bunfig | exact · frozen · scopes |
| bun pm | https://bun.com/docs/pm/cli/pm | `ls` · `why` · `pkg` |
| Trusted lifecycle | https://bun.com/docs/pm/lifecycle#trusteddependencies | Allow list **replaces** defaults |

Related catalog pages (from `bun tools/bun-docs-catalog.ts get workspaces`): workspaces · catalogs · install · outdated · update · filter · isolated-installs · bunfig.

## Root workspaces SSOT

From root `package.json` (do not invent globs in prose):

```json
"workspaces": {
  "packages": [
    "packages/*",
    "projects/active/sports-terminal-os",
    "lib/*"
  ]
}
```

| Member class | Examples |
|--------------|----------|
| Root `workspace:*` deps (spine imports) | `docs-tools`, `guards`, `registry-client`, `rip` |
| Workspace-only (filter/discovery) | `business`, `p2p`, `@factorywager/shared`, `sports-terminal-os` |
| Archived (out of install graph) | `projects/archive/factorywager-packages/{ab-testing,versioning}` |

Gate: `scripts/validate-workspaces.ts` — **homebase only** (does not require experimental/archive package.json files to be root members).

## Catalog SSOT

Root `catalog` pins shared third-party versions (exact; matches `install.exact`):

| Key | Role |
|-----|------|
| `typescript` | Toolchain (root + packages via `catalog:`) |
| `@types/bun` / `bun-types` | Types pin (may lag runtime 1.4.0) |
| `zod`, `react`, `react-dom`, `@types/react*` | Shared app stack |

**Consumers must use** `"pkg": "catalog:"` (or `catalog:<name>`). Do not re-float cataloged names with `^` / `latest`.

**Intentional exception:** `sports-terminal-os` pins `typescript` at **5.9.3** until TS 6 typecheck cleanup; zod/react/`bun-types` still use `catalog:`.

Policy table + anti-patterns: [UNIFIED § Catalogs and workspace protocols](../../UNIFIED.md#catalogs-and-workspace-protocols).

## Commands cheatsheet

```bash
# Integrity
bun run validate:workspaces
bun run validate:workspaces --verbose
bun pm ls
bun install --dry-run          # must succeed with frozenLockfile=true

# Package scripts (not root ops)
bun run --parallel --filter '*' --if-present test
bun run --filter @factorywager/registry-client build
bun run --filter sports-terminal-os typecheck
bun run --sequential --workspaces --if-present typecheck

# Root product / ops (never --filter these names)
bun run ops:limits:check
bun run portal:snapshot:once
bun test tests/limits-e2e.test.ts

# Dep edits (UNIFIED)
# 1) frozenLockfile=false temporarily
# 2) bun add / bun update / catalog edit
# 3) frozenLockfile=true + commit bun.lock
```

## Portal snapshot cron (workspace-adjacent)

Scope-aware registry snapshots for portal data-plane:

| Script | Role |
|--------|------|
| `portal:snapshot:once` | One-shot cycle (`lib/operations/portal-snapshot-cron.ts`) |
| `portal:snapshot:cron:register` | OS-level `Bun.cron` |
| `portal:snapshot:cron:preview` | Next fire times |
| `portal:snapshot:cron:remove` | Unregister |

Tests: `tests/portal-snapshot-cron.test.ts` · Bun cron docs: https://bun.com/docs/runtime/cron

## Anti-patterns

| Wrong | Right |
|-------|--------|
| `bun run --filter '*' ops:limits:check` | `bun run ops:limits:check` |
| Docs listing `registry/packages/*` as root workspaces | Nested monorepo under `projects/active/factorywager/registry` |
| `bun-types: "latest"` in a workspace package | `catalog:` after pinning in root catalog |
| Partial `trustedDependencies: ["one-pkg"]` | Full list (replaces Bun defaults) |
| Expecting `--filter` to select test files | Path globs / `bun test` patterns |

## Related harness

| Doc / tool | Role |
|------------|------|
| [`monorepo-health.md`](./monorepo-health.md) | Score · cycles · large files |
| [`IMPORT_BOUNDARIES.md`](../../IMPORT_BOUNDARIES.md) | Package import allowlists |
| `bun run audit:packages` | Packages graph bake |
| `bun run packages:list` | Registry table refresh |

## Milestone commits

| Commit | Note |
|--------|------|
| `205a04d45` | homebase gate · package exports · archive · portal snapshot cron |
| `5245a7aca` | trim root workspace deps · STO typecheck · stable chart snaps |
| `623e7ac44` | catalog SSOT · lockfile ghost · UNIFIED catalog section |

Tag: **`v5.2.2-monorepo-workspaces-catalog`**
