# AGENTS.md

AI agent entrypoint for the FactoryWager monorepo (`~/Projects`).

**Git remotes:** `origin` → [project-R-score](https://github.com/brendadeeznuts1111/project-R-score) (this monorepo). `cascade` → [cascade-mover-v3](https://github.com/brendadeeznuts1111/cascade-mover-v3) (separate project — do not use as default push target).

**Full agent guide:** [`docs/AGENTS.md`](docs/AGENTS.md)

**Bun install policy (machine + workspace):** [`docs/UNIFIED.md`](docs/UNIFIED.md)

## Machine Bun policy

| Component | File | Purpose |
| --- | --- | --- |
| Config SSOT | `~/.bunfig.toml` | `linker = "isolated"`, `globalStore = true`, `frozenLockfile = true`, `minimumReleaseAge = 259200`, absolute `[install.cache].dir` |
| Env | `~/.config/shell/bun.sh` | `BUN_INSTALL`, `NO_PROXY`. Commented `BUN_CONFIG_*` only. **No** `BUN_INSTALL_GLOBAL_STORE` (bunfig owns it) |
| PATH | `~/.config/shell/path.sh` | PATH ownership (`zshenv` + `zprofile` + `zshrc`) |
| Interactive | `~/.config/shell/interactive.zsh` | Completions, `health` → `root-health` |
| Aliases | `~/.config/shell/aliases.sh` | `ba`, `bhealth`, `bverify`, `bci`, `bmachine`, `bun-install-*`, etc. |
| Verification | `bun_verify` / `bmachine` / `machine-bun.ts` | Runtime + `~/.bunfig.toml` policy; `health` → `root-health`, `shell-health` → layout + agent-env |

### Config hierarchy

Doc: [Configuring bun install with bunfig.toml](https://bun.com/docs/pm/cli/install#configuring-bun-install-with-bunfig-toml)

1. `$HOME/.bunfig.toml` or `$XDG_CONFIG_HOME/.bunfig.toml` (machine)
2. `./bunfig.toml` (project) — shallow merge; project keys override machine
3. `BUN_CONFIG_*` env — highest priority; emergency override only

### Workspace rules

- Do **not** duplicate `linker`, `globalStore`, or `cache.dir` in project `bunfig.toml` unless intentionally overriding
- Legitimate overrides: `linker = "hoisted"` (legacy), `dir = ".bun-cache"` (sandbox), `frozenLockfile = false` (active dev when machine default is `true`)
- Verify: `bun run install:verify` · `bun run audit:bunfig` · `kimi-doctor --gate bunfig-policy` · `bhealth` / `bmachine`

## Quick rules

- Machine defaults live in `~/.bunfig.toml` (`linker`, `globalStore`, `frozenLockfile`, absolute `cache.dir`).
- Workspace `bunfig.toml` files hold **project-specific** overrides only (`frozenLockfile`, scopes, `[test]`, etc.).
- Do **not** add `linker`, `globalStore`, or `cache.dir = "~/.bun/..."` to workspace configs unless intentionally overriding machine defaults.
- Do **not** set `BUN_INSTALL_CACHE_DIR` or `BUN_INSTALL_GLOBAL_STORE` in shell or IDE — fails `bunfig-policy` / `bun_verify`.