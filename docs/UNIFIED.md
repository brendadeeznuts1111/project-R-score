# UNIFIED — Bun install policy

> **JIT:** Install/bunfig only. Day loop → `bun run harness:status`.

**Precedence:** CLI flags → `BUN_CONFIG_*` → bunfig merge (`~/.bunfig.toml` + `./bunfig.toml`; **project wins**). Pin: `packageManager` **bun@1.4.0**.

Not wire/brands — see [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md).

## Install matrix

| Key | Machine `~/.bunfig.toml` | Workspace | Notes |
|-----|--------------------------|-----------|-------|
| `linker` / `globalStore` | isolated / true | strip if identical | machine owns |
| `[install.cache].dir` | **absolute** | never `~` | avoids `./~` ([bun#6237](https://github.com/oven-sh/bun/issues/6237)) |
| `frozenLockfile` | true | root `false` for local | CI locked by default |
| `minimumReleaseAge` | 259200 | prefer inherit | supply-chain floor |
| scopes / `[test]` / `[console]` | — | project | keep local |

Legitimate hoisted/local-cache overrides exist under some `projects/active/**` — review before stripping (`bun run audit:bunfig`).

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
# [install.scopes."@factorywager"]
# url = "<private registry>"  # see root bunfig.toml
# token = "$FACTORYWAGER_REGISTRY_TOKEN"
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
