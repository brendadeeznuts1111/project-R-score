# UNIFIED — Bun install policy

> **JIT:** Install/bunfig only. Day loop → `bun run harness:status`.

**Precedence:** CLI flags → `BUN_CONFIG_*` → bunfig merge (`~/.bunfig.toml` + `./bunfig.toml`; **project wins**). Pin: `packageManager` **bun@1.4.0**.

### Official install docs (bun.com)

SSOT [`tools/bun-install-env.ts`](../tools/bun-install-env.ts) · `bun tools/bun-doc-refs.ts install-env [--section=mechanism|strategies|age|config]`.

| Section | Command / token | Notes |
|---------|-----------------|-------|
| `BUN_CONFIG_*` | `install-env --section=env` | Env > bunfig; registry/token/lockfile skips |
| Mechanism | `suggest "cache-layout"` · `node-modules-check` · `eager-resolve` · `lazy-resolve` · `--backend` | Text fragments under env/cache |
| Strategies | `isolated-installs` / `hoisted-installs` | Machine: **isolated** + `globalStore` |
| Age gate | `minimum-release-age` | Machine: `minimumReleaseAge = 259200` |
| CI | `bun ci` · `frozenLockfile` | No `BUN_CONFIG_*` for frozen |

**Cache layout:** `~/.bun/install/cache/${name}@${version}` (pre/build → hash) — [text fragment](https://bun.com/docs/pm/cli/install#:~:text=~/.bun/install/cache/%24%7Bname%7D%40%24%7Bversion%7D.%20If%20the%20semver%20version%20has%20a%20build%20or%20a%20pre%20tag%2C%20Bun%20replaces%20it%20with%20a%20hash%20of%20that%20value.%20This%20reduces%20the%20chances%20of%20errors%20from%20long%20file%20paths%2C%20but%20complicates%20figuring%20out%20where%20a%20package%20was%20installed%20on%20disk.) · `suggest "cache-layout"`. Machine absolute `[install.cache].dir`, not shell. **node_modules check:** early-exit `"name"`+`"version"` parse.

Not wire/brands — see [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md).

## Install matrix

| Key | Machine `~/.bunfig.toml` | Workspace | Notes |
|-----|--------------------------|-----------|-------|
| `linker` / `globalStore` | isolated / true | strip if identical | machine owns |
| `[install.cache].dir` | **absolute** | never `~` | avoids `./~` ([bun#6237](https://github.com/oven-sh/bun/issues/6237)) |
| `frozenLockfile` | true | root `false` for local | CI locked by default |
| `minimumReleaseAge` | 259200 | prefer inherit | supply-chain floor |
| scopes / `[test]` / `[console]` / `[run].noOrphans` | — | project | keep local; orphans → [bunfig run.noOrphans](https://bun.com/docs/runtime/bunfig#run-noorphans-dont-leave-orphan-processes-behind) |

Legitimate hoisted/local-cache overrides exist under some `projects/active/**` — review before stripping (`bun run audit:bunfig`).

## Config SSOT rules

- **Scope→registry mapping: bunfig `[install.scopes]` owns it for Bun** (Bun itself recommends migrating `.npmrc` → bunfig — [pm/npmrc](https://bun.com/docs/pm/npmrc)). `.npmrc` registry/auth lines remain only for non-Bun tooling (vite/npm clients). Both scope spellings exist (`@factorywager` ×42, `@factory-wager` ×1); canonical URL `https://registry.factory-wager.com/`, token `$FACTORY_WAGER_TOKEN`.
- **`bunfig.toml` does not inherit upward.** A nested workspace root (e.g. `projects/active/factorywager/registry/`) reads only its own `./bunfig.toml` + `~/.bunfig.toml` — it needs its own `frozenLockfile = false` dev override.
- **`frozenLockfile` has no runtime override** (no `BUN_CONFIG_*` key, no negated flag). Intentional dep change: flip repo bunfig to `false` → `bun install` → restore `true` and verify `git diff bunfig.toml` is empty. Details: `kimi-toolchain/docs/references/bun-install-config.md`.
- **Known drift (pending removal):** root `.npmrc` `cache=${HOME}/.npm` splits the global virtual store into a shadow store at `~/.npm/links`; machine SSOT is `~/.bun/install/cache`. Single cache root is the target state.

## Machine layer

| Layer | Path |
|-------|------|
| bunfig | `~/.bunfig.toml` |
| env | `~/.config/shell/bun.sh` — **no** `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` |
| PATH | `~/.config/shell/path.sh` |
| aliases | `ba` → `audit:bunfig` · `bhealth` / `bmachine` |

## Tilde drift

Symptom: literal `./~` under a repo. Cause: unexpanded `~` in cache dir. Fix: absolute machine `cache.dir`; never set cache env in IDE; never `dir = "~/.bun/..."`.

## Workspace template

```toml
[install]
frozenLockfile = false
# Scope mapping is SSOT'd in the ROOT bunfig.toml [install.scopes]
# (canonical: https://registry.factory-wager.com/, token "$FACTORY_WAGER_TOKEN").
# Nested workspace roots need their own frozenLockfile override — bunfig does not inherit upward.
```

## Tooling

```bash
bun run audit:bunfig
bun run install:verify          # · :strict
bun run install:machine:health
bun run install:cache:lifecycle
bun scripts/with-bun-cache-env.ts ci   # GHA / ephemeral
```

CI: `setup-factory-bun` + `ci:core`. Docs: [Bun bunfig](https://bun.com/docs/runtime/bunfig) · [global store](https://bun.com/docs/pm/global-store).
