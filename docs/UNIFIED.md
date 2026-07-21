# UNIFIED — Bun install policy (machine + monorepo)


> **JIT:** Install/bunfig questions only. Day loop → `bun run harness:status`. Machine SSOT summary also in root `AGENTS.md`.
Canonical reference for FactoryWager monorepo **install configuration**: machine-level defaults, workspace overrides, `./~` drift prevention, and verification tooling.

This document is **about Bun package install / bunfig / cache / CI** — not TypeScript wire boundaries. For parse-once / branded IDs, see [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md).

| | |
| --- | --- |
| **Precedence** | CLI flags (`--config`, `--linker`, …) → `BUN_CONFIG_*` env → shallow-merged bunfig (`~/.bunfig.toml` + `./bunfig.toml`; **project wins** on conflict) |
| **Last verified** | 2026-07-20 against machine `~/.bunfig.toml`, root `bunfig.toml`, `~/.config/shell/`, root `package.json` scripts, `.github/workflows/` |

## Table of contents

Anchors below match GitHub / CommonMark auto-slugs from the section headings (re-check if you rename a heading).

1. [Install matrix](#install-matrix)
   - [Legitimate workspace overrides](#legitimate-workspace-overrides)
2. [Machine layer](#machine-layer)
   - [Machine bunfig shape](#machine-bunfig-shape)
   - [Root monorepo bunfig](#root-monorepo-bunfig)
   - [Shell layout](#shell-layout)
   - [Shell aliases](#shell-aliases)
3. [Tilde cache drift](#tilde-cache-drift)
4. [Workspace bunfig template](#workspace-bunfig-template)
5. [Tooling registry](#tooling-registry)
   - [Precise audit grep](#precise-audit-grep)
6. [bun pm command matrix](#bun-pm-command-matrix)
7. [IDE and VS Code](#ide-and-vs-code)
8. [CI notes](#ci-notes)
   - [Frozen lockfile install wrapper](#frozen-lockfile-install-wrapper)
9. [Related docs](#related-docs)
   - [Install and monorepo ops](#install-and-monorepo-ops)
   - [Other monorepo policies](#other-monorepo-policies)

---

## Install matrix

| Key | `~/.bunfig.toml` (machine) | Workspace `bunfig.toml` | Action |
| --- | --- | --- | --- |
| `linker = "isolated"` | Set | Strip if identical — inherited | Machine owns default linker |
| `globalStore = true` | Set | Strip if identical — inherited | Machine owns global virtual store |
| `[install.cache].dir` (absolute) | Set | Strip — never use `~` in project files | Prevents `./~` drift ([oven-sh/bun#6237](https://github.com/oven-sh/bun/issues/6237)) |
| `globalDir` / `globalBinDir` | Absolute under `$HOME/.bun` | Do not set | Machine owns global package locations |
| `frozenLockfile` | `true` (CI safety) | Root sets `false` for active local dev | Machine locks by default; monorepo opts out locally |
| `minimumReleaseAge` | `259200` (3 days) | Prefer inherit; do not re-duplicate unless documenting | Supply-chain age floor |
| `packageManager` / `engines.bun` | Not set | Keep in `package.json` (`packageManager`: `bun@1.4.0`) | Project pin must match operated runtime |
| `[install.scopes."@scope"]` | Not set (npm default registry only) | Keep (e.g. `@factorywager`) | Private registry tokens are project-specific |
| `[test]` / `[run]` / `[build]` / `[console]` / `[debug]` | Not set | Keep | Runtime / test behavior is project-specific |

### Legitimate workspace overrides

Do not strip without review. Verified present on disk as of last verification:

| Project | Override | Why |
| --- | --- | --- |
| `projects/active/analysis/matrix-analysis` | `linker = "hoisted"`, `dir = ".cache/bun/install"` | Matrix tooling dep resolution |
| `projects/active/utilities/keyboard-shortcuts-lite` | `linker = "hoisted"` | Small lib / legacy compat |
| `projects/active/automation/duo-automation` | `dir = ".bun-cache"` | Sandboxed local cache |

Historical note: `projects/experimental/windsurf-cascade-2` previously used `dir = ".bun-cache"`; that tree is **gone** — do not resurrect the table entry without a live path.

---

## Machine layer

| Layer | File | Role |
| --- | --- | --- |
| Config SSOT | `~/.bunfig.toml` | `linker`, `globalStore`, `frozenLockfile`, `minimumReleaseAge`, absolute `cache.dir`, `globalDir`, `globalBinDir` |
| Env | `~/.config/shell/bun.sh` | `BUN_INSTALL`, `NO_PROXY`; **unsets** `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` if set by IDE parents; `bun_verify()` |
| PATH | `~/.config/shell/path.sh` | `$BUN_INSTALL/bin` first |
| Interactive | `~/.config/shell/interactive.zsh` | Completions; machine health via aliases |
| Aliases | `~/.config/shell/aliases.sh` | Audit, PM, `bverify`, `bci`, `bmachine` / `health` |
| Policy helper | `~/.config/shell/machine-bun.ts` | Machine bunfig policy helper (shell-side) |
| Repo health | `bun run install:machine:health` → `scripts/machine-bun-health.ts` | What `bmachine` / `health` invoke from monorepo root |

### Machine bunfig shape

Match the live file on this Mac (paths under your `$HOME`). Illustrative:

```toml
# ~/.bunfig.toml — machine install SSOT
# Doc: https://bun.com/docs/pm/cli/install#configuring-bun-install-with-bunfig-toml

[install]
saveTextLockfile = false
frozenLockfile = true
minimumReleaseAge = 259200
concurrentScripts = 16
linker = "isolated"
globalStore = true
globalDir = "/Users/<you>/.bun/install/global"
globalBinDir = "/Users/<you>/.bun/bin"

[install.cache]
dir = "/Users/<you>/.bun/install/cache"

[install.registry]
url = "https://registry.npmjs.org"

# Optional local-only keys (e.g. [secrets]) may also appear — not install-matrix critical
```

Upstream: [Configuring bun install with bunfig.toml](https://bun.com/docs/pm/cli/install#configuring-bun-install-with-bunfig-toml).

### Root monorepo bunfig

Install keys that **belong** at root (not duplicated machine `linker` / `globalStore` / `cache.dir`):

- `frozenLockfile = false` — local dev can update lockfile
- `exact = true`
- `[install.scopes."@factorywager"]` — private registry + token env
- `[console]`, `[debug]`, `[test]` — runtime/test, not install inheritance

Do **not** re-set `linker`, `globalStore`, or absolute `cache.dir` here unless intentionally overriding machine SSOT (fails `bunfig-policy` / audit when redundant).

### Shell layout

| File | Owns |
| --- | --- |
| `bun.sh` | `BUN_INSTALL`, `NO_PROXY`, `bun_verify()` — **not** PATH, **not** `BUN_INSTALL_GLOBAL_STORE` |
| `path.sh` | PATH with `$BUN_INSTALL/bin` ahead of Homebrew |
| `interactive.zsh` | Completions; health aliases defined in `aliases.sh` |
| `bun.sh` (commented) | `BUN_CONFIG_*` for emergency override only (higher priority than bunfig) |

**Never** set `BUN_INSTALL_CACHE_DIR`, `BUN_INSTALL_GLOBAL_STORE`, or `BUN_RUNTIME_TRANSPILER_CACHE_PATH` in interactive shell or IDE terminal env for day-to-day work — fails `bunfig-policy` / `bun_verify`. **CI** may set absolute `BUN_INSTALL_CACHE_DIR` via `with-bun-cache-env.ts` (see [CI notes](#ci-notes)).

### Shell aliases

Install-related aliases on this Mac:

| Alias | Actual command |
| --- | --- |
| `ba` | `bun run audit:bunfig` |
| `bhealth` / `bverify` | `bun_verify` (shell function in `bun.sh`) |
| `bmachine` | `bun run --cwd "$HOME/Projects" install:machine:health` (`--cwd` is Bun CLI) |
| `health` | `root-health` → monorepo `install:machine:health` (among other checks) |
| `bci` | `bun ci` |
| `bi` | `bun install` |
| `bcache` | `bun pm cache` |
| `bbin` | `bun pm bin` |

Other audit/dev aliases (`bac`, `baf`, `br`, `bt`, …) live in `aliases.sh` — treat that file as SSOT if this table drifts.

---

## Tilde cache drift

Formerly titled “the `./~` drift bug” — same issue, stable heading for anchors.

**Symptom:** Literal directory `./~` appears under repo roots or nested workspaces.

**Cause:** Bun treats `~` literally in `[install.cache].dir` and `BUN_INSTALL_CACHE_DIR` when not expanded by the shell — especially in nested workspaces ([oven-sh/bun#6237](https://github.com/oven-sh/bun/issues/6237)).

**Fix stack:**

1. **Machine:** absolute path in `~/.bunfig.toml` `[install.cache].dir`
2. **Never** set `BUN_INSTALL_CACHE_DIR` in `~/.zshrc` or IDE terminal env for local work
3. **Never** use `dir = "~/.bun/install/cache"` in project `bunfig.toml`
4. **CI/subprocess safety:** `scripts/with-bun-cache-env.ts` wraps install with `applyBunInstallEnv()` from `scripts/lib/bun-install-env.ts` (sets **absolute** cache + `BUN_INSTALL_GLOBAL_STORE=1` for the child only)
5. **Hygiene:** `scripts/verify-install-cache.ts` (`bun run install:verify`) scans for `./~` dirs; pre-commit blocks staged tilde-cache paths

---

## Workspace bunfig template

```toml
# <project>/bunfig.toml
# Install defaults (linker, globalStore, cache.dir, minimumReleaseAge)
# inherited from ~/.bunfig.toml
# Machine frozenLockfile=true — set false here for active local dev if needed

[install]
frozenLockfile = false

# [install.scopes."@factorywager"]
# url = "<private FactoryWager registry>"  # same host as root bunfig.toml; token required
# token = "$FACTORYWAGER_REGISTRY_TOKEN"

[test]
# project-specific
```

---

## Tooling registry

| Tool | Command | Purpose |
| --- | --- | --- |
| audit-bunfig | `bun run audit:bunfig` | Scan workspace `bunfig.toml` for redundant install key assignments |
| audit-bunfig (strict) | `bun run audit:bunfig:strict` | Exit 1 if `linker` / `globalStore` / `dir` assignments found (includes intentional overrides — review first) |
| audit-bunfig (doctor) | `bash scripts/audit-bunfig.sh --doctor` | Delegate to `kimi-doctor --gate bunfig-policy` when on PATH |
| install:verify | `bun run install:verify` | Cache dir, global store `links/`, lockfile, tilde drift, layout |
| install:verify (strict) | `bun run install:verify:strict` | Same checks, non-zero exit on failure |
| with-bun-cache-env | `bun scripts/with-bun-cache-env.ts ci` | CI-safe env wrapper + frozen lockfile install |
| bun-install-env | `scripts/lib/bun-install-env.ts` | Shared `applyBunInstallEnv()`, tilde scan helpers |
| bun_verify | `bverify` / `bhealth` | Interactive runtime + machine policy checks (`~/.config/shell/bun.sh`) |
| install:machine:health | `bun run install:machine:health` · aliases `bmachine` / `health` | Repo script `scripts/machine-bun-health.ts` |
| kimi-doctor bunfig-policy | `kimi-doctor --gate bunfig-policy` | Root bunfig redundancy vs `~/.bunfig.toml` |
| install:cache:lifecycle | `bun run install:cache:lifecycle` | CI-safe cache metrics dry-run (no destructive `pm cache rm`) |
| install:cache:prune | `BUN_CACHE_PRUNE=1 bun run install:cache:prune` | Self-hosted prune when over `BUN_CACHE_PRUNE_MAX_MB` (default 2048) |
| harness:report --json | `bun run harness:report --json` | Harness report; may embed install-cache metrics |

### Precise audit grep

Broad greps match **comments**. Prefer assignment matching:

```bash
find . -name "bunfig.toml" -not -path "*/node_modules/*" -not -path "*/herdr-worktrees/*" \
  -exec grep -lE '^(linker|globalStore)[[:space:]]*=|^[[:space:]]*dir[[:space:]]*=' {} \;
```

Or run `./scripts/audit-bunfig.sh`.

---

## bun pm command matrix

| Command | Active track | Notes |
| --- | --- | --- |
| `bun pm cache` | CI cache lifecycle | Resolve effective cache path |
| `bun pm cache rm` | Self-hosted prune | **No safe `--dry-run` on Bun 1.4** — use `install:cache:lifecycle --dry-run` |
| `bun pm hash` | Lockfile integrity | Current lockfile hash |
| `bun pm hash-print` | Lockfile integrity | Stored hash |
| `bun pm untrusted` | Security / audit | Blocked lifecycle scripts |
| `bun pm ls --trusted` | Security | Trusted dependency surface |
| `bun pm pkg get name version` | Automation | Project identity without hand-parsing JSON |
| `bun pm bin` / `bun pm bin -g` | PATH verify | Local vs global bins |
| `bun pm pack --quiet --dry-run` | CI artifacts | Tarball dry-run |

**pm-health:** `scripts/lib/bun-pm-health.ts`, also reachable via `bun run install:cache:lifecycle --json`.

---

## IDE and VS Code

`~/Projects/.vscode/settings.json` and `~/.vscode/settings.json` — do **not** inject `BUN_INSTALL_CACHE_DIR`, `BUN_INSTALL_GLOBAL_STORE`, or terminal `PATH` overrides for install policy. Cache and global store come from `~/.bunfig.toml` only.

---

## CI notes

### Frozen lockfile install wrapper

Root `.github/workflows/` install steps that use `bun scripts/with-bun-cache-env.ts ci` (9 workflows, verified):

| Workflow | Notes |
| --- | --- |
| `repo-hygiene.yml` | + `install:verify:strict` / cache lifecycle patterns |
| `search-governance.yml` | frozen via wrapper |
| `typescript-checks.yml` | frozen via wrapper |
| `p0-security-check.yml` | frozen via wrapper |
| `brand-bench.yml` | frozen via wrapper |
| `cache-lifecycle.yml` | metrics / prune dispatch |
| `demo-module-contract.yml` | frozen via wrapper |
| `har-performance.yml` | hardened from plain install |
| `url-validation.yml` | hardened from plain install |

Additional workflows (e.g. `issue-automation.yml`) may exist without that wrapper — do not assume *every* YAML installs the same way; re-grep when adding jobs. Install journey CI owner is `repo-hygiene.yml` only.

- Wrapper ≡ frozen lockfile install with absolute cache + global store for **ephemeral** runners that lack `~/.bunfig.toml`.
- `BUN_INSTALL_CACHE_DIR` in GHA job env is acceptable for runners; do not mirror that into local VS Code.
- Self-hosted: `CI_SELF_HOSTED=1` or `BUN_CACHE_PRUNE=1`; optional `BUN_CACHE_PRUNE_MAX_MB` (default 2048). **Do not** rely on `bun pm cache rm --dry-run` on Bun 1.4 — it may still delete; use `scripts/bun-cache-lifecycle.ts --dry-run`.

---

## Related docs

### Install and monorepo ops

- [STRUCTURE.md](../STRUCTURE.md) — monorepo layout
- [AGENTS.md](../AGENTS.md) — agent entry (machine Bun summary) · [docs/AGENTS.md](./AGENTS.md) — full guide
- [organization/ROOT_CLEANUP_SUMMARY.md](./organization/ROOT_CLEANUP_SUMMARY.md) — root organization history
- [Bun global store](https://bun.com/docs/pm/global-store)
- [Bun bunfig.toml](https://bun.com/docs/runtime/bunfig)
- [bun install CLI](https://bun.com/docs/pm/cli/install)

### Other monorepo policies

Not install SSOT — linked for navigation only:

- [.custom-instructions.md](../.custom-instructions.md) — coding standards
- [WIRE_BOUNDARY.md](./WIRE_BOUNDARY.md) — wire / parse-once types (`unknown` → domain)
- [lib/docs/repo-docs.ts](../lib/docs/repo-docs.ts) — path SSOT (`CANONICAL_REPO_DOCS`)
