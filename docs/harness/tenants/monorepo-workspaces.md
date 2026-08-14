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
├── .agents/skills/ast-grep   private hook tooling workspace
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
| `--filter` / scripts | https://bun.com/docs/pm/filter | Name vs `./path`, install/outdated/scripts — see [§ bun --filter](#bun---filter-canonical) |
| Parallel / sequential | https://bun.com/docs/pm/filter#parallel-and-sequential-mode | `bun run --parallel` ≠ `bun test --parallel` |
| Dependency order | https://bun.com/docs/pm/filter#dependency-order | Filtered scripts wait on workspace deps |
| Install CLI | https://bun.com/docs/pm/cli/install | Frozen lockfile, peers, filters |
| Outdated | https://bun.com/docs/pm/cli/outdated | `--filter` restricts packages |
| Isolated installs | https://bun.com/docs/pm/isolated-installs | `configVersion: 1` default |
| Overrides | https://bun.com/docs/pm/overrides | Root-only metadeps |
| Patch | https://bun.com/docs/pm/cli/patch | `patchedDependencies` |
| bunfig install | https://bun.com/docs/runtime/bunfig | exact · frozen · scopes (TOML) |
| bun pm | https://bun.com/docs/pm/cli/pm | `ls` · `why` · `pkg` |
| Trusted lifecycle | https://bun.com/docs/pm/lifecycle#trusteddependencies | Allow list **replaces** defaults |

Related catalog pages (from `bun tools/bun-docs-catalog.ts get workspaces`): workspaces · catalogs · install · outdated · update · filter · isolated-installs · bunfig.

## bun --filter (canonical)

**SSOT page:** [pm/filter](https://bun.com/docs/pm/filter) · offline: `bun tools/bun-doc-refs.ts suggest "--filter"` →  
`https://bun.com/docs/pm/filter#package-name-filter-pattern`

`--filter` / `-F` selects **workspace packages** by pattern. It is supported by:

1. **`bun install`** — install deps for a subset of workspaces  
2. **`bun outdated`** — report outdated deps for a subset  
3. **Script runs** — `bun run --filter <pattern> <script>` (or `bun --filter …`)

Filters **respect root `workspaces`**: only listed members match. Nested monorepos under `projects/**` are invisible to root `--filter`.

### Matching

| Kind | Pattern | Selects |
|------|---------|---------|
| Package **name** | `--filter '@factorywager/*'` · `--filter sports-terminal-os` · `--filter '*'` | `package.json` `"name"` (glob) |
| Package **path** | `--filter './packages/*'` · `--filter './packages/guards'` | Dirs under workspace root; **must** start with `./` |
| Negation | `--filter '!pkg-c'` · `--filter '!./'` | Exclude name or path (e.g. exclude root package) |
| Root only | `--filter './'` | Root `package.json` only (useful for `outdated`) |

### install / outdated

```bash
# All homebase packages under packages/ (not STO unless path matches)
bun install --filter './packages/*'

# Exclude root package.json from install selection
bun install --filter '!./' --filter './packages/*'

# Outdated pins for @factorywager scope names
bun outdated --filter '@factorywager/*'

# Root package.json only
bun outdated --filter './'
```

With root `frozenLockfile = true`, intentional filtered installs still need the usual unlock → install → freeze cycle when the lockfile would change ([UNIFIED](../../UNIFIED.md)).

### Scripts (parallel / sequential / if-present)

```bash
# Concurrent package scripts (Foreman-style prefixes: pkg:script | …)
bun run --parallel --filter '*' --if-present test
bun run --parallel --filter '*' "build:*"
bun run --parallel --no-exit-on-error --filter '*' test

# All workspace packages, one after another
bun run --sequential --workspaces --if-present typecheck

# Named package from anywhere in the monorepo (no cd)
bun run --filter @factorywager/registry-client build
bun run --filter sports-terminal-os typecheck

# Multiple scripts per package where present
bun run --parallel --filter '*' --if-present build test
```

<!-- REF:ID 1.1.parallel -->
<a id="1.1.parallel"></a>
<!-- REF:ID 1.1.sequential -->
<a id="1.1.sequential"></a>
<!-- REF:ID 1.1.workspaces -->
<a id="1.1.workspaces"></a>
<!-- REF:ID 1.1.if-present -->
<a id="1.1.if-present"></a>
<!-- REF:ID 1.1.no-exit-on-error -->
<a id="1.1.no-exit-on-error"></a>

| Script | REF:ID | href | --flag | Role |
| --- | --- | --- | --- | --- |
| `bun --filter` | `1.1.parallel` | [`#1.1.parallel`](#1.1.parallel) | `--parallel` | Concurrent package scripts (≠ `bun test --parallel`) |
| `bun --filter` | `1.1.sequential` | [`#1.1.sequential`](#1.1.sequential) | `--sequential` | One package at a time |
| `bun --filter` | `1.1.workspaces` | [`#1.1.workspaces`](#1.1.workspaces) | `--workspaces` | All workspace packages |
| `bun --filter` | `1.1.if-present` | [`#1.1.if-present`](#1.1.if-present) | `--if-present` | Skip packages missing the script (almost always required here — most packages have few scripts) |
| `bun --filter` | `1.1.no-exit-on-error` | [`#1.1.no-exit-on-error`](#1.1.no-exit-on-error) | `--no-exit-on-error` | Keep fan-out running after a package fails |

**Dependency order:** if workspace package `foo` depends on `bar` and both have `build`, `bun --filter '*' build` starts `foo` only after `bar` finishes ([dependency order](https://bun.com/docs/pm/filter#dependency-order)).

### Docs UI pitfall: `?search=type:toml`

URLs like  
https://bun.com/docs/pm/filter?search=type%3Atoml  
append a **Mintlify docs-site search facet** (`type:toml` = “show TOML code samples”). That is **not** a Bun CLI filter and **not** a workspace selector.

- On the filter page itself there is no `type:toml` flag.  
- TOML hits in package-manager docs are almost always **`bunfig.toml`** snippets (exact, scopes, ignoreScripts) — see [runtime/bunfig](https://bun.com/docs/runtime/bunfig) and our root `bunfig.toml`.  
- Do **not** invent `bun --filter type:toml` or confuse docs search with package selection.

### FactoryWager cheatsheet

```bash
# Package tests / typecheck
bun run --parallel --filter '*' --if-present test
bun run --filter @factorywager/registry-client build
bun run --filter sports-terminal-os typecheck
bun run --filter './packages/*' --if-present test

# Root product (never --filter these script names)
bun run ops:limits:check
bun run portal:snapshot:once
bun test tests/limits-e2e.test.ts
bun test tests/portal-snapshot-cron.test.ts
```

## Root workspaces SSOT

From root `package.json` (do not invent globs in prose):

```json
"workspaces": {
  "packages": [
    "packages/*",
    "projects/active/sports-terminal-os",
    "lib/*",
    ".agents/skills/ast-grep"
  ]
}
```

| Member class | Examples |
|--------------|----------|
| Root `workspace:*` deps (spine imports) | `docs-tools`, `guards`, `registry-client`, `rip` |
| Workspace-only (filter/discovery/install) | `business`, `p2p`, `@factorywager/shared`, `sports-terminal-os`, private `@projects/ast-grep-skill` hook tooling |
| Archived (out of install graph) | `projects/archive/factorywager-packages/{ab-testing,versioning}` |

Gate: `scripts/validate-workspaces.ts` — **homebase only** (does not require experimental/archive package.json files to be root members).

The ast-grep tooling package is deliberately a workspace member because the root pre-commit hook runs its semver tests. This keeps dependency hydration in the ordinary root `bun install` and shared `bun.lock`, rather than performing an implicit install during `git commit`.

## Catalog SSOT

Root `catalog` pins shared third-party versions (exact; matches `install.exact`):

| Key | Role |
|-----|------|
| `typescript` | Toolchain (root + packages via `catalog:`) |
| `@types/bun` / `bun-types` | Independent wrapper-stable and declaration-pinned-tip pins; policy in `config/bun-channels.toml` |
| `zod`, `react`, `react-dom`, `@types/react*` | Shared app stack |

**Consumers must use** `"pkg": "catalog:"` (or `catalog:<name>`). Do not re-float cataloged names with `^` / `latest`.

Policy table + anti-patterns: [UNIFIED § Catalogs and workspace protocols](../../UNIFIED.md#catalogs-and-workspace-protocols).

### STO TypeScript 6 (resolved)

Resolved **2026-07-28**: `sports-terminal-os` uses `"typescript": "catalog:"` (root catalog **6.0.3**). No catalog exception remains for STO.

## TypeScript 6+ types discovery

TS 6 defaults `compilerOptions.types` to `[]` (no auto `@types/*`). Monorepo apps/scripts need `"types": ["bun"]` so editors and `tsc` see Bun globals. Public packages that emit clean `.d.ts` may keep `"types": []` intentionally (e.g. `packages/registry-client`).

| Surface | Role |
|---------|------|
| `tsconfig.base.json` | SSOT `"types": ["bun"]` for extenders |
| `bun run check:tsconfig-types` | Walk all `tsconfig*.json`; JSONC-aware extends resolution |
| `--strict` / `CI` / `GITHUB_ACTIONS` | Exit 1 when **monorepo-owned** configs omit bun after extends walk |
| Pre-commit | Staged spine tsconfigs / audit tool → `check:tsconfig-types --strict` (`SKIP_TSCONFIG_TYPES=1`) |
| CI | `typescript-checks.yml` step before type-check scopes |

```bash
bun run check:tsconfig-types
bun run check:tsconfig-types -- --strict
bun test tests/tsconfig-bun-types.test.ts
```

@see https://bun.com/docs/typescript-6 · tool [`tools/tsconfig-types-audit.ts`](../../../tools/tsconfig-types-audit.ts)

## Bun PM surface (operator cookbook)

**Install policy SSOT:** [`docs/UNIFIED.md`](../../UNIFIED.md).  
**Dual plane:** Bun PM owns the install graph / lockfile; Proton vault owns secrets
([`proton-integration.md`](./proton-integration.md) · `@factorywager/proton-pass`).
Never substitute `pass-cli` / inject for `bun install` / `bun pm` / `bun audit`.

### Core commands

| Command | Recipe | Proof |
| ------- | ------ | ----- |
| `bun install` | Frozen OK for day loop. Worktrees: `bun run install:all` (explicit `--cwd`). | `bun run install:verify` · `:strict` |
| `bun add` | Prefer `bun run add:safe -- <pkg> [--dev]` (unlock → `--exact` → restore freeze). | `install:verify` + Tier-A |
| `bun remove` | Unlock root `frozenLockfile` → `bun remove <pkg>` → restore `true` → commit lockfile. | `install:verify` |
| `bun update` | Unlock → update → restore. Bump shared pins in root **`catalog`**, not N copies. | `bun outdated --filter './'` |
| `bunx` | **`bunx --bun <bin> …`** (space-separated flags). Workspace bins after `workspace:*` link. | `bunx --bun proton-pass version` |

### Publishing & analysis

| Command | Recipe | Notes |
| ------- | ------ | ----- |
| `bun publish` | Only intentional public packages. Factory path often `bun pm pack` → `factory:publish`. | `proton-pass` stays **`private: true`**. |
| `bun outdated` | `bun outdated --filter '@factorywager/*'` · `--filter './packages/*'` · `--filter './'` | Catalog-aware. |
| `bun why` / `bun pm why` | `bun pm why <pkg>` — who requires a dep. | e.g. `bun pm why @factorywager/proton-pass` |
| `bun audit` | Supply-chain report; complements Socket scanner. | Install-time scanner **OFF** by default (quota). |
| `bun info` | Registry metadata before add. | Scoped registry needs token + bunfig scopes. |

### Workspace management

| Surface | Recipe |
| ------- | ------ |
| Workspaces | Only root `workspaces.packages` globs. Nested `projects/**` / Kalshi = separate roots. |
| Catalogs | Root `catalog` SSOT; members use `catalog:`. No empty named catalogs. |
| `workspace:*` | Link when root/another package **imports** the member. Membership alone enables `--filter`. |
| `bun link` | Prefer `workspace:*` inside monorepo. Link only for out-of-tree hosts (e.g. interim Kalshi). |
| `bun pm` | Daily: `ls` · `why` · `untrusted` · `pkg get/set`. Trust: `bun pm trust` + UNIFIED justification. |

### Advanced configuration

| Surface | Policy |
| ------- | ------ |
| Isolated installs | Root monorepo default (`configVersion: 1`). Machine `linker = "isolated"`. |
| Global virtual store | Machine `globalStore = true` (requires isolated). |
| Global cache | Machine absolute `[install.cache].dir` — never `~` or shell `BUN_INSTALL_*`. |
| Lockfile | Text `bun.lock`; freeze at root; platform-agnostic (cross `--cpu`/`--os` use `--dry-run`). |
| Lifecycle | `trustedDependencies: []` intentional; dep scripts off unless allow-listed. |
| Scopes / registries | bunfig `[install.scopes]` SSOT. `.npmrc` residual for non-Bun only. |
| Overrides | Root-only for CVE/metadeps. |
| `bun patch` | Only via CLI → `patches/` + `patchedDependencies` (may be global-store ineligible). |
| `--filter` | Name or `./path`; never Mintlify `type:toml`. Root scripts **without** filter. |
| Security Scanner API | Package present; install-time **OFF**. On-demand: `portal-cli scanner scan --oneshot`. |
| `.npmrc` | No cache/store keys; scope lines for vite/npm clients only. |

```bash
# Proton package (vault plane — not PM)
bun run --filter @factorywager/proton-pass test
bunx --bun proton-pass check --env-file .env.protonpass --agent factorywager --json
bunx --bun proton-pass health --env-file env.template
```

### Commands cheatsheet

```bash
# Integrity
bun run validate:workspaces
bun run validate:workspaces --verbose
bun pm ls
bun install --dry-run          # must succeed with frozenLockfile=true
bun run check:tsconfig-types -- --strict   # TS6 types: monorepo_risk=0

# Package scripts — full filter semantics: § bun --filter above
bun run --parallel --filter '*' --if-present test
bun run --filter @factorywager/registry-client build
bun run --filter @factorywager/proton-pass test
bun run --filter sports-terminal-os typecheck
bun run --sequential --workspaces --if-present typecheck

# Analysis
bun outdated --filter '@factorywager/*'
bun pm why @factorywager/proton-pass
bun audit
bun pm untrusted

# Root product / ops (never --filter these names)
bun run ops:limits:check
bun run portal:snapshot:once
bun test tests/limits-e2e.test.ts

# Dep edits (UNIFIED)
# Prefer: bun run add:safe -- <pkg> [--dev]
# Manual: frozenLockfile=false → bun add/remove/update → true + commit bun.lock
```

## Portal snapshot cron (workspace-adjacent)

Scope-aware **data-plane** captures (not registry bake). Operator SSOT:
[`portal-snapshot-cron.md`](portal-snapshot-cron.md) · `bun run docs:tenant-portal-snapshot`.

## Anti-patterns

| Wrong | Right |
|-------|--------|
| `bun run --filter '*' ops:limits:check` | `bun run ops:limits:check` |
| Docs listing `registry/packages/*` as root workspaces | Nested monorepo under `projects/active/factorywager/registry` |
| `bun-types: "latest"` in a workspace package | `catalog:` after pinning in root catalog |
| Partial `trustedDependencies: ["one-pkg"]` | Full list (replaces Bun defaults) |
| Expecting `--filter` to select test files | Path globs / `bun test` patterns |
| Treating docs `?search=type:toml` as a CLI flag | Docs UI facet only; real filter is name/`./path` ([pm/filter](https://bun.com/docs/pm/filter)) |
| `bun run --parallel` vs `bun test --parallel` confusion | Foreman workspace scripts vs test workers ([day-loop](../day-loop.md)) |
| `bun run --workspaces test` without `--if-present` | Most packages lack `test` — always pair `--if-present` here |

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
