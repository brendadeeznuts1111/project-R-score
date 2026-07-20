# UNIFIED — Bun install policy (machine + monorepo)

Canonical reference for FactoryWager monorepo install configuration: machine-level defaults, workspace overrides, drift prevention, and verification tooling.

**Precedence:** CLI flags (`--config`, `--linker`, …) > `BUN_CONFIG_*` env > shallow-merged bunfig (`~/.bunfig.toml` + `./bunfig.toml`; project wins on conflict)

Last updated: 2026-06-23

---

## Install matrix

| Key | `~/.bunfig.toml` (machine) | Workspace `bunfig.toml` | Action |
| --- | --- | --- | --- |
| `linker = "isolated"` | Set | Strip if identical — inherited | Machine owns default linker |
| `globalStore = true` | Set | Strip if identical — inherited | Machine owns global virtual store |
| `[install.cache].dir` (absolute) | Set | Strip — never use `~` in project files | Prevents `./~` drift ([oven-sh/bun#6237](https://github.com/oven-sh/bun/issues/6237)) |
| `frozenLockfile` | `true` (CI safety) | Override `false` for active dev | Machine locks lockfile updates; projects opt out locally |
| `minimumReleaseAge` | Set (259200) | Keep in root monorepo for explicit supply-chain docs | Optional strip if you want zero duplication |
| `packageManager` / `engines.bun` | Not set | Keep in `package.json` | Project pin |
| `[install.scopes."@scope"]` | Not set (npm default registry only) | Keep | Private registry tokens are project-specific |
| `[test]` / `[run]` / `[build]` | Not set | Keep | Runtime behavior is project-specific |

### Legitimate workspace overrides (do not strip)

| Project | Override | Why |
| --- | --- | --- |
| `projects/active/analysis/matrix-analysis` | `linker = "hoisted"`, `dir = ".cache/bun/install"` | Matrix tooling dep resolution |
| `projects/active/utilities/keyboard-shortcuts-lite` | `linker = "hoisted"` | Small lib / legacy compat |
| `projects/active/automation/duo-automation` | `dir = ".bun-cache"` | Sandboxed local cache |
| `projects/experimental/windsurf-cascade-2` | `dir = ".bun-cache"` | Isolated experimental cache |

---

## Machine layer (locked Jun 2026)

| Layer | File | Role |
| --- | --- | --- |
| **Config SSOT** | `~/.bunfig.toml` | `linker = "isolated"`, `globalStore = true`, `frozenLockfile = true`, `minimumReleaseAge = 259200`, absolute `cache.dir` |
| **Env** | `~/.config/shell/bun.sh` | `BUN_INSTALL`, `NO_PROXY`. Commented `BUN_CONFIG_*` only. No `BUN_INSTALL_GLOBAL_STORE` |
| **PATH** | `~/.config/shell/path.sh` | PATH ownership (`zshenv`, `zprofile`, `zshrc`) |
| **Interactive** | `~/.config/shell/interactive.zsh` | Completions, `health` → `root-health` |
| **Aliases** | `~/.config/shell/aliases.sh` | Audit, PM, `bverify`, `bci`, `bmachine`, cross-platform install |
| **Verification** | `~/.config/shell/machine-bun.ts`, `bun_verify` | Policy audit (8 checks) + runtime verify (18 checks, TOML parse) |

### `~/.bunfig.toml` (machine SSOT)

```toml
[install]
optional = true
dev = true
peer = true
production = false
saveTextLockfile = false
frozenLockfile = true
dryRun = false
concurrentScripts = 16
linker = "isolated"
minimumReleaseAge = 259200
minimumReleaseAgeExcludes = ["@types/node", "typescript"]
globalStore = true

[install.cache]
dir = "/Users/<you>/.bun/install/cache"

[install.registry]
url = "https://registry.npmjs.org"
```

Doc: [Configuring bun install with bunfig.toml](https://bun.com/docs/pm/cli/install#configuring-bun-install-with-bunfig-toml)

### Shell (`~/.config/shell/`)

- `bun.sh`: `BUN_INSTALL`, `NO_PROXY`, `bun_verify()` — **not** `PATH`, **not** `BUN_INSTALL_GLOBAL_STORE`
- `path.sh`: `PATH` with `$BUN_INSTALL/bin` ahead of Homebrew
- `interactive.zsh`: completions + aliases + `alias health='root-health'`
- Commented `BUN_CONFIG_*` in `bun.sh` for emergency override only (higher priority than bunfig)

**Never** set `BUN_INSTALL_CACHE_DIR`, `BUN_INSTALL_GLOBAL_STORE`, or `BUN_RUNTIME_TRANSPILER_CACHE_PATH` in shell or IDE — fails `bunfig-policy` and `bun_verify`.

### Shell aliases

| Alias | Command |
| --- | --- |
| `ba` | `bun run audit:all` |
| `bac` | `bun run audit:changed` |
| `bap` | `bun run audit:profile` |
| `baf` | `bun run audit:fast` |
| `bdoc` | `bun run build:doctor && ./doctor` |
| `bhealth` / `bverify` | `bun_verify` |
| `bmachine` / `health` | `root-health` |
| `bbin` | `bun pm bin` |
| `bcache` | `bun pm cache` |
| `buntrust` | `bun pm untrusted` |
| `btrust` | `bun pm ls --trusted` |
| `bpkg` | `bun pm pkg get name version private` |
| `bhash` | `bun pm hash && bun pm hash-print` |
| `bi` | `bun install` |
| `bci` | `bun ci` |
| `br` | `bun run` |
| `bt` | `bun test` |
| `bts` | `bun test --watch` |
| `bbuild` | `bun run build` |
| `bdev` | `bun run dev` |
| `bun-install-linux` | `bun install --cpu=x64 --os=linux` |
| `bun-install-darwin` | `bun install --cpu=arm64 --os=darwin` |
| `bun-install-win` | `bun install --cpu=x64 --os=win32` |

---

## The `./~` drift bug

**Symptom:** Literal directory `./~` appears under repo roots or nested workspaces.

**Cause:** Bun 1.4.x treats `~` literally in `[install.cache].dir` and `BUN_INSTALL_CACHE_DIR` when not expanded by the shell — especially in nested workspaces.

**Fix stack:**

1. **Machine:** absolute path in `~/.bunfig.toml` `[install.cache].dir`
2. **Never** set `BUN_INSTALL_CACHE_DIR` in `~/.zshrc` or IDE terminal env
3. **Never** use `dir = "~/.bun/install/cache"` in project `bunfig.toml`
4. **CI/subprocess safety:** `scripts/with-bun-cache-env.ts` wraps `bun install` with `applyBunInstallEnv()` from `scripts/lib/bun-install-env.ts`
5. **Hygiene:** `scripts/verify-install-cache.ts` (`bun run install:verify`) scans for `./~` dirs; pre-commit blocks staged tilde-cache paths

---

## Workspace `bunfig.toml` template

```toml
# <project>/bunfig.toml
# Install defaults (linker, globalStore, cache.dir) inherited from ~/.bunfig.toml
# Machine frozenLockfile=true — set false here for active local dev

[install]
frozenLockfile = false
minimumReleaseAge = 259200

# [install.scopes."@factorywager"]
# url = "https://factory-wager.com/registry"
# token = "$FACTORYWAGER_REGISTRY_TOKEN"

[test]
# project-specific
```

---

## Tooling registry

| Tool | Command | Purpose |
| --- | --- | --- |
| **audit-bunfig** | `bun run audit:bunfig` | Scan all workspace `bunfig.toml` for redundant install key assignments |
| **audit-bunfig (strict)** | `bun run audit:bunfig:strict` | Exit 1 if any `linker`/`globalStore`/`dir` assignments found (includes intentional overrides — use human review) |
| **audit-bunfig (doctor)** | `bash scripts/audit-bunfig.sh --doctor` | Delegate to `kimi-doctor --gate bunfig-policy` when on PATH |
| **install:verify** | `bun run install:verify` | Cache dir, global store `links/`, lockfile `configVersion`, tilde drift, `node_modules` layout |
| **install:verify (strict)** | `bun run install:verify:strict` | Same checks, non-zero exit on failure |
| **with-bun-cache-env** | `bun scripts/with-bun-cache-env.ts ci` | CI-safe env wrapper + frozen lockfile (`BUN_INSTALL_CACHE_DIR` absolute + `BUN_INSTALL_GLOBAL_STORE=1`) |
| **bun-install-env** | `scripts/lib/bun-install-env.ts` | Shared `applyBunInstallEnv()`, `findTildeCacheDirs()`, `resolveBunInstallCacheDir()` |
| **bun_verify** | `bverify` / `bhealth` | 18-check runtime + machine policy (`~/.config/shell/bun.sh`) |
| **machine-bun** | `bun run machine:bun` (kimi-toolchain) · `~/.config/shell/machine-bun.ts` (delegate) | Machine `~/.bunfig.toml` policy — canonical: `src/lib/machine-bun-policy.ts` |
| **root-health** | `health` / `bmachine` | `shell-health` + `machine-bun.ts` |
| **kimi-doctor bunfig-policy** | `kimi-doctor --gate bunfig-policy` | Hardened install policy + root `bunfig.toml` redundancy vs `~/.bunfig.toml` |
| **kimi-doctor config** | `cd ~/kimi-toolchain && bun run config:status` | Configuration layer gates (includes `bun-install-runtime`) |
| **install:cache:lifecycle** | `bun run install:cache:lifecycle` | CI-safe cache metrics dry-run (no `bun pm cache rm`) |
| **install:cache:prune** | `BUN_CACHE_PRUNE=1 bun run install:cache:prune` | Self-hosted: prune when cache &gt; `BUN_CACHE_PRUNE_MAX_MB` (default 2048) |
| **harness:report --json** | `bun run harness:report --json` | Harness lint report + `installCache` size/links metrics |

### Precise audit grep (preferred over broad patterns)

Broad `grep 'globalStore = true\|linker = "isolated"\|cache\.dir'` matches **comments**. Use key-assignment matching:

```bash
find . -name "bunfig.toml" -not -path "*/node_modules/*" -not -path "*/herdr-worktrees/*" \
  -exec grep -lE '^(linker|globalStore)[[:space:]]*=|^[[:space:]]*dir[[:space:]]*=' {} \;
```

Or run `./scripts/audit-bunfig.sh`.

---

## `bun pm` command matrix (active tracks)

| Command | Active track | Notes |
| --- | --- | --- |
| `bun pm cache` | CI cache lifecycle | Resolve effective cache path |
| `bun pm cache rm` | Self-hosted prune | **No safe `--dry-run` on Bun 1.4** — use `install:cache:lifecycle --dry-run` |
| `bun pm hash` | Lockfile integrity | Current lockfile hash (`bun-cache-lifecycle.ts`) |
| `bun pm hash-print` | Lockfile integrity | Stored hash; zero placeholder on text lockfile → skip strict compare |
| `bun pm untrusted` | Security / audit-bunfig | Blocked lifecycle scripts |
| `bun pm ls --trusted` | Security scanner | Trusted dependency surface |
| `bun pm pkg get name version` | audit-bunfig + automation | Project identity without parsing JSON by hand |
| `bun pm bin` / `bun pm bin -g` | pm-health / path verify | Local `node_modules/.bin` vs global `~/.bun/bin` |
| `bun pm pack --quiet --dry-run` | CI artifacts | Tarball dry-run (supported unlike `cache rm`) |
| `bun pm version patch --no-git-tag-version` | Release automation | Bump without git tag side effects |

**pm-health checks** (foundation for `herdr-doctor pm-health`): implemented in `scripts/lib/bun-pm-health.ts`, invoked via `bun run install:cache:lifecycle --json`.

---

## IDE / VS Code

`~/projects/.vscode/settings.json` and `~/.vscode/settings.json` — do **not** inject `BUN_INSTALL_CACHE_DIR`, `BUN_INSTALL_GLOBAL_STORE`, or terminal `PATH` overrides. Cache and global store come from `~/.bunfig.toml` only.

---

## CI notes

### Wave D — frozen lockfile (complete)

All root `~/projects/.github/workflows/` install steps use `bun scripts/with-bun-cache-env.ts ci` (9 workflows):

| Workflow | Notes |
| --- | --- |
| `repo-hygiene.yml` | was `install --frozen-lockfile` |
| `search-governance.yml` | was `install --frozen-lockfile` |
| `typescript-checks.yml` | was `install --frozen-lockfile` |
| `p0-security-check.yml` | was `install --frozen-lockfile` |
| `brand-bench.yml` | was `install --frozen-lockfile` |
| `cache-lifecycle.yml` | was `install --frozen-lockfile` |
| `demo-module-contract.yml` | was `install --frozen-lockfile` |
| `har-performance.yml` | **hardened** — was plain `install` |
| `url-validation.yml` | **hardened** — was plain `install` |

`kimi-toolchain/.github/actions/setup/action.yml` uses `bun ci` for downstream composite consumers.

- Root GHA workflows use `bun scripts/with-bun-cache-env.ts ci` (≡ frozen lockfile) — not plain `bun install`.
- `repo-hygiene` workflow: `install:verify:strict` + `install:cache:lifecycle` (metrics dry-run after every PR/push).
- `cache-lifecycle` workflow: weekly metrics artifact; `workflow_dispatch` + `prune=true` on `self-hosted` runners.
- `BUN_INSTALL_CACHE_DIR` is set in GHA job env (`/home/runner/.bun/install/cache`) — acceptable for ephemeral runners; not injected via VS Code.
- GitHub-hosted runners have no `~/.bunfig.toml` — `with-bun-cache-env.ts` supplies absolute cache + global store.
- Self-hosted runners: set `CI_SELF_HOSTED=1` or `BUN_CACHE_PRUNE=1`; optional `BUN_CACHE_PRUNE_MAX_MB` (default 2048). **Do not** rely on `bun pm cache rm --dry-run` on Bun 1.4 — it still deletes; use `scripts/bun-cache-lifecycle.ts --dry-run` instead.

---

## Related docs

- [`docs/organization/ROOT_CLEANUP_SUMMARY.md`](./organization/ROOT_CLEANUP_SUMMARY.md) — Phase 4.x cleanup history
- [`STRUCTURE.md`](../STRUCTURE.md) — monorepo layout
- [`docs/AGENTS.md`](./AGENTS.md) — agent guide (install policy summary)
- [Bun global store](https://bun.sh/docs/pm/global-store)
- [Bun bunfig.toml](https://bun.sh/docs/runtime/bunfig)