# UNIFIED — Bun install policy

> **JIT:** Install/bunfig only. Day loop → `bun run harness:status`.

**Precedence:** CLI flags → `BUN_CONFIG_*` → bunfig shallow merge
(`~/.bunfig.toml` + `./bunfig.toml`). **General** keys: project wins on
conflict. **Install policy keys** (`linker`, `globalStore`,
`[install.cache].dir`, `minimumReleaseAge`, `minimumReleaseAgeExcludes`):
**machine owns** — root project bunfig must not duplicate them (only dev
overrides like `frozenLockfile = false`). Runtime pin: `packageManager`
**bun@1.3.14**. Channel/type policy:
[`config/bun-channels.toml`](../config/bun-channels.toml).

Not wire/brands — see [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md).

## Install matrix

| Key                                                 | Machine `~/.bunfig.toml`                                   | Workspace                  | Notes                                                                                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `linker` / `globalStore`                            | isolated / true                                            | strip if identical         | machine owns; [global store](https://bun.com/docs/pm/global-store) requires [isolated linker](https://bun.com/docs/pm/isolated-installs) |
| `[install.cache].dir`                               | **absolute**                                               | never `~`                  | avoids `./~` ([bun#6237](https://github.com/oven-sh/bun/issues/6237)); store lives under `<cache>/links/`                                |
| `frozenLockfile`                                    | true                                                       | root **`true`** (hardened) | intentional dep edits: temporarily set `false`, then restore; nested workspaces may override                                             |
| `minimumReleaseAge`                                 | 259200                                                     | prefer inherit             | supply-chain floor                                                                                                                       |
| `minimumReleaseAgeExcludes`                         | `["bun-types", "@types/bun", "@types/node", "typescript"]` | prefer inherit             | type-only packages move faster than the age gate; list **replaces** Bun's default `["@types/node", "typescript"]` — keep it a superset   |
| scopes / `[test]` / `[console]` / `[run].noOrphans` | —                                                          | project                    | keep local; orphans → [bunfig run.noOrphans](https://bun.com/docs/runtime/bunfig#run-noorphans-dont-leave-orphan-processes-behind)       |

Legitimate hoisted/local-cache overrides exist under some `projects/active/**` —
review before stripping (`bun run audit:bunfig`).

## Linker + lockfile (`configVersion`)

Root `bun.lock` is **`configVersion: 1`** with workspaces. Per
[isolated installs](https://bun.com/docs/pm/isolated-installs):

| `configVersion` | Workspaces? | Default linker               |
| --------------- | ----------- | ---------------------------- |
| `1`             | yes         | **isolated** (this monorepo) |
| `1`             | no          | hoisted                      |
| `0`             | any         | hoisted (legacy)             |

**Policy:** workspace monorepo stays on `configVersion: 1`. Do not downgrade to
`0` unless intentionally migrating linker strategy. Machine layer supplies
`linker = "isolated"` and `globalStore = true`; project `bunfig.toml` does not
duplicate those keys.

**Global virtual store:** with isolated linker + `globalStore = true`, package
files materialize once under `~/.bun/install/cache/links/`; each project's
`node_modules/.bun/<pkg>@<ver>` symlinks in. Warm reinstall after
`rm -rf node_modules` is symlink-only. See
[global store](https://bun.com/docs/pm/global-store) ·
[bunfig install.globalStore](https://bun.com/docs/runtime/bunfig#install-globalstore).

## Platform-specific dependencies (`--cpu` / `--os`)

Bun normalizes target `cpu` / `os` in the **shared** `bun.lock` and skips
packages disabled for the current platform at install time. Override target for
cross-platform CI / deploy prep:

```bash
bun install --cpu=x64 --os=linux --dry-run --ignore-scripts
```

**Accepted values** (SSOT: `lib/docs/bun-install-platform-docs.ts` →
`BUN_INSTALL_PLATFORM_SUPPORTED`):

| `--cpu`                                                                                 | `--os`                                                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `arm`, `arm64`, `ia32`, `mips`, `mipsel`, `ppc`, `ppc64`, `s390`, `s390x`, `x32`, `x64` | `aix`, `android`, `darwin`, `freebsd`, `linux`, `openbsd`, `sunos`, `win32` |

**Project cross profiles**
(`.agents/skills/ast-grep/bun-install-profiles.json`): `cross-linux-x64`,
`cross-linux-arm64`, `cross-darwin-arm64`. Cross-target `bun install --dry-run`
must not mutate `bun.lock` (platform-agnostic lockfile).

Docs:
[platform-specific dependencies](https://bun.com/docs/pm/cli/install#platform-specific-dependencies)
· [cpu-and-os flags](https://bun.com/docs/pm/cli/install#cpu-and-os-flags).

## Catalogs and workspace protocols

**Operator runbook (FactoryWager hybrid model):**
[harness/tenants/monorepo-workspaces.md](./harness/tenants/monorepo-workspaces.md)
· gate `bun run validate:workspaces` · tag `v5.2.2-monorepo-workspaces-catalog`.

Canonical Bun docs: [workspaces](https://bun.com/docs/pm/workspaces) ·
[catalogs](https://bun.com/docs/pm/catalogs) ·
[filter](https://bun.com/docs/pm/filter) ·
[isolated installs](https://bun.com/docs/pm/isolated-installs) · resolve
offline: `bun tools/bun-docs-catalog.ts get workspaces`.

| Mechanism                     | Where                                 | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `workspaces.packages`         | root `package.json`                   | Only listed paths are monorepo members: `packages/*`, `projects/active/sports-terminal-os`, `lib/*`, `.agents/skills/ast-grep`. The ast-grep tooling package is included because pre-commit executes its tests; root install and lockfile therefore own its dependencies. Nested products under `projects/**` are separate install roots unless promoted. Gate: `bun run validate:workspaces` (homebase-only — does not require experimental/archive trees). Archived packages live under `projects/archive/factorywager-packages/`. |
| `catalog`                     | root `package.json`                   | **Version SSOT** for shared third-party pins (`typescript`, `@types/bun`, `bun-types`, `zod`, React stack). Prefer exact pins (matches `install.exact`).                                                                                                                                                                                                                                                                                                                                                                             |
| `catalog:` / `catalog:<name>` | any **root workspace** `package.json` | Consumers of shared pins **must** use the protocol — do not re-declare floating `^` / `latest` for cataloged names.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `workspace:*`                 | root or packages                      | Link **internal** packages only when the root (or another package) imports them. Workspace membership alone is enough for `--filter` / discovery — do not list unused stubs in root `dependencies`. Apps like sports-terminal-os need not be root deps.                                                                                                                                                                                                                                                                              |
| Named `catalogs`              | root                                  | Only when a second stack needs a separate pin set. Empty/demo named catalogs are not allowed.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `overrides`                   | root only                             | Metadeps / CVE pins — [pm/overrides](https://bun.com/docs/pm/overrides). Nested overrides unsupported.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `patchedDependencies`         | root + `patches/`                     | Only via [bun patch](https://bun.com/docs/pm/cli/patch). Patched pkgs may be global-store ineligible.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `trustedDependencies`         | root                                  | Explicit list **replaces** Bun defaults — do not set a partial list casually.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Root `peerDependencies`       | avoid                                 | Application root is not a library; put toolchain pins in `devDependencies` + `catalog:`.                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### `trustedDependencies` decision

Root `package.json` sets `"trustedDependencies": []`. This is intentional:

- Bun does **not** execute dependency lifecycle scripts by default (supply-chain
  risk).
- Bun auto-optimizes popular native packages (`esbuild`, `sharp`, etc.) without
  requiring trust.
- Project lifecycle scripts (`prepare`, `postinstall`) are owned by the root
  workspace and limited to `husky` + `scripts/evict-root-tilde-cache.ts`.

Because `trustedDependencies` is an **explicit allow-list that replaces Bun
defaults**, adding even one package silently drops all default trusted entries.
If a dependency truly needs its lifecycle scripts:

1. Add the package name to root `trustedDependencies`.
2. Run `bun install` (or `bun pm trust <pkg>`).
3. Verify with `bun pm untrusted`.
4. Document the justification in this section and update
   `scripts/verify-install-cache.ts` if a new allow-list shape is required.

### Scripts vs `--filter`

| Surface              | How to run                                                               | Notes                                                                             |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Root** product/ops | `bun run ops:limits:check` · `bun run portal:snapshot:once`              | Scripts live only on root `package.json` — **never** `bun run --filter '*' ops:…` |
| **Package** scripts  | `bun run --filter <name\|./path> <script>` · `--workspaces --if-present` | Only workspace members; use `--if-present` (most packages lack full script sets)  |
| **Tests (files)**    | `bun test tests/…` or path globs                                         | Not workspace `--filter`                                                          |

Canonical: [pm/filter](https://bun.com/docs/pm/filter) · FactoryWager runbook:
[monorepo-workspaces § bun --filter](./harness/tenants/monorepo-workspaces.md#bun---filter-canonical).

```bash
# Package scripts (workspace members only)
bun run --parallel --filter '*' --if-present test
bun run --filter @factorywager/registry-client build
bun run --filter './packages/*' --if-present test

# Root-only (no --filter)
bun run ops:limits:check
bun test tests/limits-e2e.test.ts
```

**Warning — docs UI `type:toml` is not a filter flag.**  
URLs such as `https://bun.com/docs/pm/filter?search=type%3Atoml` use Mintlify’s
**search facet** (`type:toml` = show TOML code samples on the docs site). That
is **not** a Bun CLI option, not a workspace selector, and not related to
`bun --filter`.

- ❌ Do **not** use `?search=type:toml` as a `--filter` flag. This is a Mintlify
  documentation search parameter, not a Bun CLI argument.
- ❌ Do **not** invent `bun run --filter type:toml …` or
  `bun outdated --filter type:toml`.
- ✅ Use package **name** globs or **`./path`** patterns only —
  [pm/filter](https://bun.com/docs/pm/filter) ·
  [packages README](./packages/README.md#outdated--filter-canonical-patterns).

TOML samples under package-manager docs are almost always **`bunfig.toml`**
(`exact`, `scopes`, `ignoreScripts`) — see
[runtime/bunfig](https://bun.com/docs/runtime/bunfig) and this repo’s root
`bunfig.toml`.

**Types channels:** `@types/bun` follows its configured stable/latest npm
channel, while direct `bun-types` deliberately follows a reviewed vendored Bun
`main` snapshot (`pinned-tip`). They are independent pins and are not required to share a version.
Run `bun run bun:channel:check` plus the TypeScript gates before promotion.
Pages `BUN_VERSION` is a separate deploy pin.

**STO TypeScript 6 (resolved):** `sports-terminal-os` uses
`"typescript": "catalog:"` like other workspace members — see
[monorepo-workspaces — STO TypeScript 6 (resolved)](./harness/tenants/monorepo-workspaces.md#sto-typescript-6-resolved).

## Config SSOT rules

- **Scope→registry mapping: bunfig `[install.scopes]` owns it for Bun** (Bun
  itself recommends migrating `.npmrc` → bunfig —
  [pm/npmrc](https://bun.com/docs/pm/npmrc)). `.npmrc` registry/auth lines
  remain only for non-Bun tooling (vite/npm clients). Both scope spellings exist
  (`@factorywager` ×42, `@factory-wager` ×1). **Registry URL variants:** root
  `bunfig.toml` scopes use `http://localhost:3000/` for local `serve-public`;
  production/apex is `https://registry.factory-wager.com/` — do not assume one
  URL in docs or scripts without naming which lane.
- **`bunfig.toml` does not inherit upward.** A nested workspace root (e.g.
  `projects/active/factorywager/registry/`) reads only its own `./bunfig.toml` +
  `~/.bunfig.toml` — it needs its own `frozenLockfile = false` dev override.
- **`frozenLockfile` has no runtime override** (no `BUN_CONFIG_*` key, no
  negated flag). Root `bunfig.toml` is **`frozenLockfile = true`** (hardened /
  CI-parity). Intentional dep change: temporarily set root to `false`, run
  `bun add`/`bun update`, commit lockfile, restore `true`. Nested workspace
  roots may keep a local `false` override — bunfig does not inherit upward.
  Details: `kimi-toolchain/docs/references/bun-install-config.md`.
  - **Helper:** `bun run add:safe -- <pkg> [--dev]`
    ([`scripts/bun-add-safe.ts`](../scripts/bun-add-safe.ts)) toggles root
    `frozenLockfile`, runs `bun add`, always restores `true`, then
    `install:verify` + Tier-A (`scripts/check-bun-deps-tier-a.ts` — scans
    workspace **`package.json` keys**, not `node_modules`). Prefer Bun natives
    over Tier-A wrappers (`tools/bun-prefer-matrix.ts` `tierAAvoidPackages()`).
    Report-only transitive scan: `bun run inventory:wrappers`
    ([`scripts/inventory-wrappers.ts`](../scripts/inventory-wrappers.ts)) —
    always exit 0; not a CI gate.
  - **`--exact` / `-E` default** (belt-and-suspenders with
    `install.exact = true`): injects long-form `--exact` unless the caller
    already passed `--exact` **or** `-E`, used **`--global` / `-g`** (globals do
    not write `package.json`), or an **open range** after the last `@` (`^`,
    `~`, `*`, `>`, `>=`, `<`, `<=`, `x.x.x - y`, `.x`). Do **not** treat bare
    `@` as a range (breaks `@types/bun`). Pins like `zod@3.20.0` / `zod@latest`
    still get `--exact` so `package.json` stores digits.
  - **Other flags** (`--dev`/`-D`, `--optional`, `--peer`, `--trusted`, etc.)
    pass through unchanged.

    | Input         | Open range? | Skip inject?      | Script injects `--exact`? | Effective `bun add`  |
    | ------------- | ----------- | ----------------- | ------------------------- | -------------------- |
    | `zod`         | no          | no                | yes                       | `zod --exact`        |
    | `zod@latest`  | no          | no                | yes                       | `zod@latest --exact` |
    | `zod@3.20.0`  | no          | no                | yes                       | `zod@3.20.0 --exact` |
    | `zod@^3.0.0`  | yes         | open range        | no                        | `zod@^3.0.0`         |
    | `zod@>=3`     | yes         | open range        | no                        | `zod@>=3`            |
    | `zod --exact` | no          | already `--exact` | no                        | `zod --exact`        |
    | `zod -E`      | no          | already `-E`      | no                        | `zod -E`             |
    | `-g cowsay`   | no          | `--global`/`-g`   | no                        | `-g cowsay`          |
    | `@types/bun`  | no          | no                | yes                       | `@types/bun --exact` |

- **Resolved drift (2026-07-30):** root `.npmrc` contains only non-Bun scope
  mappings and localhost auth; it no longer configures `cache=${HOME}/.npm` or
  creates a shadow store. The machine cache SSOT is `~/.bun/install/cache`.
- **Forbidden in normal shell/IDE env** (see Machine layer):
  `BUN_INSTALL_CACHE_DIR`, `BUN_INSTALL_GLOBAL_STORE` — use `~/.bunfig.toml`
  instead. Exception: ephemeral CI via `bun scripts/with-bun-cache-env.ts ci`
  only.

## Anti-patterns (wrong behaviors)

| Wrong                                                        | Why                                                                                          | Fix                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configVersion: 0` on workspace monorepo                     | hoisted legacy default; fights isolated + global store policy                                | stay on `configVersion: 1`; see `install:verify` lockfile check                                                                                                                                                               |
| `linker = "hoisted"` at **root**                             | breaks phantom-dep isolation + global store eligibility                                      | machine `isolated`; hoisted only in deliberate nested overrides                                                                                                                                                               |
| `globalStore = true` without isolated linker                 | [global store](https://bun.com/docs/pm/global-store) ignores hoisted layout                  | enable both on machine, or neither                                                                                                                                                                                            |
| `BUN_INSTALL_*` cache/store env in shell profile             | bypasses bunfig policy gates (`audit:bunfig`, `install:verify`)                              | machine `~/.bunfig.toml` + absolute `cache.dir`                                                                                                                                                                               |
| `cache.dir = "~/.bun/..."` in project bunfig                 | unexpanded `~` → literal `./~` dirs ([bun#6237](https://github.com/oven-sh/bun/issues/6237)) | absolute path on machine only                                                                                                                                                                                                 |
| Cross `--cpu`/`--os` install that **mutates** `bun.lock`     | lockfile should stay platform-agnostic                                                       | `--dry-run` first; see `lockfile-stable` aspect                                                                                                                                                                               |
| Trusting `.npmrc` for Bun scope URLs                         | Bun reads `[install.scopes]` in bunfig, not `.npmrc`                                         | bunfig SSOT; `.npmrc` for npm/vite clients only                                                                                                                                                                               |
| Leaving root `frozenLockfile = false` long-term              | drift from hardened CI-parity policy                                                         | root stays `true`; flip only for intentional dep edits                                                                                                                                                                        |
| Hardcoding shared versions in every workspace package        | defeats [catalogs](https://bun.com/docs/pm/catalogs); version skew (e.g. TS 5 vs 6)          | root `catalog` + `catalog:` in members                                                                                                                                                                                        |
| `bun-types: "latest"` / wide carets for cataloged names      | fights `install.exact` + frozen lockfile                                                     | pin via catalog                                                                                                                                                                                                               |
| Treating nested `projects/**` as root workspaces in docs     | false install graph; filter/install surprise                                                 | match root `package.json` only                                                                                                                                                                                                |
| Docs URL `?search=type:toml` as a CLI/workspace filter       | Mintlify search facet only; no Bun flag                                                      | use `--filter <name\|./path>` · [pm/filter](https://bun.com/docs/pm/filter) · [runbook](./harness/tenants/monorepo-workspaces.md#bun---filter-canonical)                                                                      |
| `bun run --filter '*' <root-script>`                         | root scripts are not package scripts                                                         | `bun run <root-script>` without `--filter`                                                                                                                                                                                    |
| Spawning bare `'bun'` in verify scripts                      | PATH may resolve a different binary than the runtime interpreter                             | `lib/verification/resolve-bun-binary.ts` — `process.execPath` first, `Bun.which('bun')` fallback                                                                                                                              |
| `BUN_CONFIG_REGISTRY` in project `.env` for default registry | env overrides bunfig unpredictably in dev/CI                                                 | use `[install].registry` in bunfig, scoped `.npmrc`, or `bun publish --registry` ([docs](https://bun.com/docs/pm/cli/publish#registry-configuration)); tool overlay `REGISTRY_URL` is npm API only — not Pages routing probes |

## Legitimate variants (not wrong)

| Variant                                                          | Where                                                             | Notes                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `frozenLockfile = false`                                         | nested workspace roots (dev)                                      | root is `true`; nested may override                                                      |
| `linker = "hoisted"`                                             | e.g. `projects/experimental/keyboard-shortcuts-lite/bunfig.toml`  | legacy/tooling compatibility; audit before expanding                                     |
| `frozenLockfile = true`                                          | e.g. `projects/experimental/codepoint/template/...`               | template/CI-simulation nested roots                                                      |
| Registry `localhost:3000` vs apex                                | root bunfig vs production deploy                                  | same token env; different host                                                           |
| `--cpu` / `--os` CLI **or** `BUN_INSTALL_CPU` / `BUN_INSTALL_OS` | cross profiles · `bun-install-profiles.json`                      | same mechanism; profiles document both                                                   |
| `install.exact = true`                                           | root `bunfig.toml`                                                | semver-exact saves; separate from linker policy                                          |
| Global store **ineligible** entries                              | patches, `trustedDependencies`, `workspace:`/`file:`/`link:` deps | fall back to project-local `.bun/` — not a policy violation                              |
| `verify:install-platform:dry-run`                                | fast gate                                                         | profile SSOT + lockfile/linker reads; skips spawn-heavy aspects                          |
| `verify:install-env`                                             | runtime probes                                                    | six `BUN_CONFIG_*` + `install.scopes` + `registry-read-plane`                            |
| Hoisted / CI profiles                                            | `bun-install-profiles.json`                                       | `hoisted`, `ci`, `ci-isolated`, `secure-isolated`, etc. — use intentionally, not at root |

**Global store tradeoffs** (when eligible): phantom-dep resolution no longer
walks project `.bun/node_modules` from inside global entries — undeclared
imports fail (desired). Opt out per project: `globalStore = false`. See
[global store tradeoffs](https://bun.com/docs/pm/global-store#tradeoffs).

## Machine layer

| Layer   | Path                                                                                   |
| ------- | -------------------------------------------------------------------------------------- |
| bunfig  | `~/.bunfig.toml`                                                                       |
| env     | `~/.config/shell/bun.sh` — **no** `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` |
| PATH    | `~/.config/shell/path.sh`                                                              |
| aliases | `ba` → `audit:bunfig` · `bhealth` / `bmachine`                                         |

**Code SSOT** (machine-owned keys · expected linker/globalStore · age excludes ·
forbidden env · ephemeral CI allowlist · template path):
[`lib/install/machine-bunfig-policy.ts`](../lib/install/machine-bunfig-policy.ts)
— imported by doctor bunfig · `scripts/ensure-machine-bunfig.ts` ·
`scripts/audit-bunfig.ts` · `scripts/verify-install-cache.ts`
(`install:verify`).

## Tilde drift

Symptom: literal `./~` under a repo. Cause: unexpanded `~` in cache dir. Fix:
absolute machine `cache.dir`; never set cache env in IDE; never
`dir = "~/.bun/..."`.

## Workspace template

```toml
[install]
exact = true
frozenLockfile = true
# linker / globalStore / cache.dir / minimumReleaseAge(+Excludes): machine ~/.bunfig.toml only
# Scope mapping SSOT here [install.scopes] — local dev: http://localhost:3000/
# Production apex: https://registry.factory-wager.com/ · token "$FACTORY_WAGER_TOKEN"
# Nested workspace roots may set frozenLockfile = false — bunfig does not inherit upward.
# Intentional root dep edit: temporarily false → bun add/update → restore true.
```

## Tooling

```bash
bun run machine:bunfig:ensure   # ~/.bunfig.toml ← config/machine.bunfig.toml.template
bun run machine:bunfig:check    # SSOT snippets + absolute cache.dir
bun run audit:bunfig
bun run install:verify          # · :strict — cache, global store links, configVersion
bun run portal:doctor --group bunfig   # machine SSOT · project drift · merge · excludes
CI=true bun run portal:doctor:ci       # ensure + offline doctor (harness-gates)
bun run bake:doctor             # ensure + doctor-state.json
bun run bake:doctor:check       # ensure + sha256 fingerprint gate
bun run install:machine:health
bun run install:cache:lifecycle
bun scripts/with-bun-cache-env.ts ci   # GHA / ephemeral
```

**CI runners:** `setup-factory-bun` writes `~/.bunfig.toml` via
`machine:bunfig:ensure --overwrite` so doctor/fingerprint gates are portable.

```bash
# Project-scoped install verification (11 aspects — toolchain + config + platform + linker)
bun run verify:install-platform              # full
bun run verify:install-platform:dry-run      # profile SSOT + lockfile/linker reads only
bun run verify:install-env                   # BUN_CONFIG_* (6) + scoped registry + read plane (8 probes)
bun run verify:install-env:save              # + public/registry/install-env-proof.json
bun run verify:registry-client               # RegistryClient resolve · download · publish (3 probes)
bun run verify:registry-client:save          # + public/registry/registry-client-proof.json
bun run verify:bun-runtime-nits                # Phase 1 nits: inspect · streams · url · file-io (18 probes)
bun run verify:bun-runtime-nits:save           # + public/registry/bun-runtime-nits-proof.json (verify-all step 8)
bun tools/verify-bun-release.ts              # includes install aspects in release proof
bun run check:release-tracker                # tests + release verify
```

| Aspect                         | Scope                            | Proves                                                         |
| ------------------------------ | -------------------------------- | -------------------------------------------------------------- |
| `bun-binary-resolved`          | runtime execPath / `Bun.which`   | spawned `bun` matches interpreter version                      |
| `bun-config-env-ssot`          | `tools/bun-install-env.ts`       | six official `BUN_CONFIG_*` vars match install docs            |
| `forbidden-install-env`        | shell env                        | no `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` in env |
| `install-mechanism-notes-ssot` | `INSTALL_MECHANISM_NOTES`        | cache, backends, eager/lazy resolve catalogued                 |
| `runtime-flags`                | isolated probe dir               | `--cpu` / `--os` accepted; invalid cpu rejected                |
| `profile-ssot`                 | `bun-install-profiles.json`      | cross profiles use supported cpu/os                            |
| `monorepo-cross-dry-run`       | root `package.json` + `bun.lock` | cross profiles resolve (`--dry-run`)                           |
| `lockfile-stable`              | shared `bun.lock`                | cross dry-run does not mutate lockfile hash                    |
| `lockfile-config-version`      | `bun.lock`                       | `configVersion: 1` + workspaces → isolated default             |
| `machine-isolated-linker`      | `~/.bunfig.toml`                 | effective `linker = isolated`                                  |
| `machine-global-store`         | isolated + global store          | effective `globalStore = true`                                 |

`install:verify` (cache dir, tilde drift, global store links, node_modules
layout) complements the seven aspects above — run both for full install health.

**Portal doctor bunfig group** (`tools/lib/portal-cli-doctor-bunfig.ts`) is the
control-plane gate for the same machine/project split:

| Check id                          | Level | Proves                                                                                                                                                   |
| --------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bunfig-machine-ssot`             | fatal | `~/.bunfig.toml` has linker/globalStore/age/excludes/cache.dir                                                                                           |
| `bunfig-machine-frozen-lockfile`  | warn  | machine declares `frozenLockfile`                                                                                                                        |
| `bunfig-project-no-machine-keys`  | fatal | `./bunfig.toml` does not set machine-owned install keys                                                                                                  |
| `bunfig-merge-consistency`        | fatal | effective policy is isolated + globalStore + absolute cache                                                                                              |
| `bunfig-release-age-excludes`     | warn  | excludes include `bun-types`, `@types/bun`, `@types/node`, `typescript`                                                                                  |
| `bunfig-no-install-env-overrides` | fatal | no `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` in **local** env; GHA / `FACTORY_BUN_CI=1` / `CI_ALLOW_BUN_INSTALL_ENV=1` allowed (ephemeral CI) |

Board: `/portal/doctor/` · bake: `bun run bake:doctor` · check:
`bun run bake:doctor --check` · loopback run: `POST /api/doctor/run` · tenant
[`docs/harness/tenants/portal-doctor.md`](harness/tenants/portal-doctor.md).

Install verify spawns resolve `bun` via `lib/verification/resolve-bun-binary.ts`
(runtime `execPath` → `Bun.which('bun')` fallback) — not bare PATH `'bun'`.

### Install-hygiene audit bake

`bun run bake:install-hygiene` writes
`public/registry/install-hygiene-report.json` by combining the install-cache
slice, the npm-install check, and a dry-run of `install:verify`. The same bake
injects an **offline embed** into `public/portal/install-hygiene/index.html`
(`#install-hygiene-embed`) so the board renders without a network fetch
(vault/failures pattern). The report is projected into `monitoring.json` as
`installHygiene` and consumed by `ops:snapshot`. It is informational: a failed
hygiene check bakes the failure into the report rather than blocking the
snapshot.

| Surface          | Path / command                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board            | `/portal/install-hygiene/` · `bun run portal-cli dashboard --view=install-hygiene`                                                                         |
| Registry bake    | `/registry/install-hygiene-report.json`                                                                                                                    |
| Offline embed    | `#install-hygiene-embed` in board HTML (preferred load path)                                                                                               |
| Rebake           | `bun run bake:install-hygiene`                                                                                                                             |
| Live fetch debug | `?portal_fetch_debug=1` (or `?verbose=1`) · on-page log + console · [fetch request options](https://bun.com/docs/runtime/networking/fetch#request-options) |

Live refresh uses portal `fetch-json` (**GET only**, no body,
`Accept: application/json`, timeout). Browser **cannot** pass Bun’s
`verbose: true` (Bun-only extension); the query flag is the stand-in.

```bash
bun run bake:install-hygiene
bun run install:verify --dry-run --json   # JSON used by the bake script
bun run portal-cli dashboard --view=install-hygiene --open
# debug live registry refresh in the browser:
# open http://127.0.0.1:3000/portal/install-hygiene/?portal_fetch_debug=1
```

Server-runtime debugging stays opt-in and uses Bun's WebKit Inspector Protocol:

```bash
bun run dev:portal                  # hot reload + Bun development error page
bun run serve:public:inspect       # run immediately; attach when needed
bun run serve:public:inspect-brk   # pause on the first source line
bun run serve:public:inspect-wait  # do not run until a debugger attaches
bun run serve:public:fetch-debug   # print fetch request/response headers
bun run serve:public:fetch-curl    # also print reproducible curl commands
```

Bun prints the `debug.bun.sh` connection URL when an inspector command starts.
Runtime-transpiled TypeScript uses Bun's automatic sourcemaps; no portal build
flag is required. Browser-side `?portal_fetch_debug=1` remains separate from
server-runtime fetch tracing.

**`BUN_CONFIG_*` (env > bunfig)** — canonical:
[configuring-with-environment-variables](https://bun.com/docs/pm/cli/install#configuring-with-environment-variables).
SSOT: `tools/bun-install-env.ts` · runtime proof: `tools/verify-install-env.ts`
· **8 probe rows** in `public/registry/install-env-proof.json` (6 env vars +
`install.scopes` npm plane + `registry-read-plane` SDK plane).

| Probe                      | Legitimate use                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `BUN_CONFIG_REGISTRY`      | CI override or ephemeral local registry in tools                                                           |
| `BUN_CONFIG_TOKEN`         | CI secrets for private registry only                                                                       |
| `BUN_CONFIG_YARN_LOCKFILE` | migration / dual-lockfile experiments                                                                      |
| `BUN_CONFIG_SKIP_*`        | isolated probes in verification scripts only                                                               |
| `install.scopes`           | `@factorywager` → `http://localhost:3000/` (dev) or `https://registry.factory-wager.com/` (apex) in bunfig |
| `registry-read-plane`      | `RegistryClient.health()` / `fetchIndex()` against `/api/registry/*` (R2-backed read plane)                |

**Registry client SDK** — canonical:
[`docs/registry-client.md`](registry-client.md). SSOT:
`packages/registry-client` · runtime proof: `tools/verify-registry-client.ts` ·
**3 probe rows** in `public/registry/registry-client-proof.json` (`resolve` URL
parity · `download` SHA-256 · `publish` auth gate). Requires `serve-public` on
`:3000` for live resolve/download lanes.

**Bun runtime nits (Phase 1)** — canonical:
[`docs/bun-runtime-nits.md`](bun-runtime-nits.md). SSOT:
`lib/verification/bun-runtime-nits-probes.ts` ·
`tools/verify-bun-runtime-nits.ts` · **16 probe rows** in
`public/registry/bun-runtime-nits-proof.json` (inspect truth table · streams
gzip · URL · Bun.file vs fs). **In `verify-all`** (step 8) and
`check:release-tracker`.

Code SSOT: `lib/verification/install-platform.ts` ·
`lib/verification/install-env-probes.ts` ·
`lib/verification/registry-client-probes.ts` ·
`lib/verification/bun-runtime-nits-probes.ts` ·
`lib/docs/bun-install-platform-docs.ts` · `lib/docs/bun-install-linker-docs.ts`
· `scripts/verify-install-cache.ts`.

CI: `setup-factory-bun` + `ci:core`. Docs:
[Bun bunfig](https://bun.com/docs/runtime/bunfig) ·
[isolated installs](https://bun.com/docs/pm/isolated-installs) ·
[global store](https://bun.com/docs/pm/global-store) ·
[lockfile](https://bun.com/docs/pm/lockfile).

## References and further reading

- Bun package manager: [`bun install`](https://bun.com/docs/cli/install) ·
  [`bunfig.toml`](https://bun.com/docs/runtime/bunfig) ·
  [isolated installs](https://bun.com/docs/pm/isolated-installs) ·
  [global store](https://bun.com/docs/pm/global-store) ·
  [global cache](https://bun.com/docs/pm/global-cache) ·
  [trusted dependencies](https://bun.com/docs/install/lifecycle#trusted-dependencies)
  · [security scanner](https://bun.com/docs/pm/security-scanner-api).
- Supply-chain hardening: [SLSA levels](https://slsa.dev/spec/v1.0/levels) ·
  [npm "scripts build scripts" supply-chain guidance](https://docs.npmjs.com/cli/v10/using-npm/scripts#best-practices)
  ·
  [OWASP Software Dependencies](https://owasp.org/www-project-dependency-check/)
  · [OpenSSF SLSA](https://github.com/slsa-framework/slsa).
- Bun verification tools in this repo:
  `bun tools/bun-doc-refs.ts suggest "<api>"` · `bun run docs:refresh` ·
  `bun run verify-all`.

_Runtime/type policy reconciled 2026-08-05; release probes verified on Bun
1.3.14 and the installed 1.4.0 canary._
