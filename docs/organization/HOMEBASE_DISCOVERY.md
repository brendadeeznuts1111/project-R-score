# Homebase discovery — worktree `khxy`

Readonly discovery of this worktree as a **Projects homebase root** (shared + Bun-native).  
Date: 2026-07-20 · Branch: `cursor/2ef0930d` · Path: `/Users/nolarose/.cursor/worktrees/Projects/khxy`

Method: Bun CLI with controlled `--console-depth`, plus four parallel explore lanes (install · shared · bun-native · projects).

---

## Verdict

| Layer | Status | Note |
|-------|--------|------|
| Install plane | Healthy | `install:verify` + `install:machine:health` pass |
| Shared spine | Clear | Homebase shared = `lib/` + `config/` harness; `packages/*` is thin publishables |
| Bun-native | Broken in worktrees | `config/bun-dx-catalog.ts` missing here (gitignored local on main tree) |
| Projects boundary | Clear | Apps under `projects/`; nested own-repos ignored |

**Start here for homebase work:** unignore + track (or symlink strategy) for `config/bun-dx-catalog.ts`, then reconcile Bun version pin.

---

## 1. Install plane

### Machine vs workspace

| Layer | Owns |
|-------|------|
| `~/.bunfig.toml` | `linker=isolated`, `globalStore`, absolute `cache.dir`, `frozenLockfile`, `minimumReleaseAge` |
| Root `bunfig.toml` | `[console] depth=6`, `[debug]`, `[install] exact` + `frozenLockfile=false`, `@factorywager` scope, `[test]` |
| Shell | `BUN_INSTALL` / PATH — do **not** set `BUN_INSTALL_CACHE_DIR` / `BUN_INSTALL_GLOBAL_STORE` |

Policy SSOT: [`docs/UNIFIED.md`](../UNIFIED.md).

### Live checks (this worktree)

- `bun run install:verify` → pass (cache ~814M, no `./~` drift, lockfile configVersion 1)
- `bun run install:machine:health` → pass
- `bun run audit:bunfig` → root clean; some **nested** project bunfigs override machine knobs (duo-automation local cache, keyboard-shortcuts-lite `linker=hoisted`, etc.) — expected for independent apps

### Setup surface

| Script | Behavior |
|--------|----------|
| `setup` | `install:all` then `build` (mutating) |
| `setup:mcp` / `setup:p2p` | Side doors |
| `install:verify` / `install:machine:health` | Readonly health |

### Bun pin (reconciled)

| Source | Value |
|--------|-------|
| Runtime | Bun **1.4.0** |
| `package.json` `packageManager` | **bun@1.4.0** |
| `engines` | unset (optional; pin is `packageManager`) |

---

## 2. Shared spine

### Workspaces (`package.json`)

```
packages/*
projects/active/factorywager/registry/packages/*  ← 11 packages on disk
projects/active/sports-terminal-os             ← name: sports-terminal-os
lib/*                                          ← only lib/shared has package.json today
```

(Removed dead glob `projects/active/kimiremote/packages/*` — tree absent / gitignored.)

### Homebase map

```
ROOT SPINE
  lib/          ← shared harness (brands, console-depth, projects-scan, security, …)
  config/       ← ports, r2-env, eslint harness plugin, …
  packages/*    ← 8 thin @factorywager/* publishables
  tools/ scripts/ docs/ .agents/

projects/       ← product parking lot (not default shared)
```

Path SSOT: [`lib/docs/repo-docs.ts`](../../lib/docs/repo-docs.ts) (`CANONICAL_REPO_DOCS` + `CANONICAL_HARNESS`).

### Root `packages/*` (8)

`ab-testing` · `business` · `docs-tools` · `guards` · `p2p` · `package` · `rip` · `versioning`

Name overlap with `lib/`: `ab-testing`, `business`, `guards`, `package` — packages look like extract/publish shells; ownership not documented at `packages/README.md` (missing).

### Gaps

1. ~~Dead workspace glob: `projects/active/kimiremote/packages/*`~~ — removed
2. `lib/*` workspace glob mostly inert (only `lib/shared`)
3. No `packages/README.md`

---

## 3. Bun-native

### Wired

| Piece | Role |
|-------|------|
| `discover:bun-native*` | Scan Node→Bun debt (`scripts/bun-native-discover.ts`) |
| `docs/BUN_NATIVE_CAPABILITIES.md` | WebView / markdown.ansi / cron / udp (Bun 1.4 surface) |
| `lib/console-depth.ts` | Inspect depth SSOT |
| `.cursor/rules/bun-harness.mdc` | Prefer Bun APIs; points at DX catalog |
| `check:harness` / `lint:bun-native*` | Gates |

### Discover snapshot (readonly JSON)

Roots: `scripts`, `lib`, `packages`, `tools` · **23 files** with hits:

| Kind | Count |
|------|------:|
| node-fs-import | 9 |
| process.env | 7 |
| mkdir | 7 |
| writeFile-async | 5 |
| readFile-async | 4 |
| existsSync | 3 |
| child_process | 2 |
| readFileSync | 1 |
| readdir | 1 |

Many hits are migrate/example noise. Apply is scripts-only (`discover:bun-native:apply`); not run in this discovery.

### Critical gap — DX catalog

`config/bun-dx-catalog.ts` is the Bun-first one-liner / guard SSOT. It is:

- **Present** on main checkout: `~/Projects/config/bun-dx-catalog.ts` (~433 lines, local file)
- **Absent** from this worktree
- **Gitignored** by `.gitignore`: `config/*` (only `config/domain-branding.json` is explicitly un-ignored; other `config/` files in git were force-added earlier)
- **Referenced** by `scripts/dx-catalog-cli.ts`, `scripts/dx-mcp.ts`, `packages/guards`, `docs/BUN_FIRST_GUARDS.md`, bun-harness rule

So: homebase Bun DX works on the main tree by accident of a local file; **new worktrees do not inherit it**.

---

## 4. Projects boundary

Tiers: `active/` (populated) · `experimental/` (bucket) · `archive/` (bucket).  
Triage SSOT: [`projects/README.md`](../../projects/README.md).

### `projects/active/` (this worktree)

Categories: analysis · apps · automation · dashboards · development · enterprise · games · tools · utilities  

Specials present: `factorywager` · `sports-terminal-os` · `playwriter-skill`  

Documented / ignored / absent: `kimiremote` · `f402-openapi` · enterprise cascade / bet-ticker (own remotes)

### Rule of thumb

| In root shared | Under `projects/` |
|----------------|-------------------|
| Brands, wire boundary, console-depth, harness | Product apps, demos, dashboards |
| `@factorywager/*` when reused | Per-app install/lock unless workspace-listed |
| Skills (`.agents/skills/`) | Nested own-repos (path convenience only) |

---

## 5. Config deep dive (follow-up)

Agent lane: [Config archaeology](97d2912c-3f16-403b-95e1-e9e318c4ff62).

### Ignore stack (`.gitignore` ~212–233)

| Rule | Effect |
|------|--------|
| `*config/` / `**/config/` | Ignore nested `config` dirs (projects, sensitive trees) |
| `!config/` | Re-open **root** `config/` so children can be selectively un-ignored |
| `config/*` | Ignore all direct children of root `config/` |
| `!config/domain-branding.json` | Only explicit allowlist exception |

**Mechanism:** already-tracked files stay in the index even when they match `config/*`. New files under `config/` need `git add -f` or a new `!` rule. That is why this worktree looks “complete” for the 30 tracked paths but still lacks main-tree locals.

### This worktree vs `~/Projects/config`

| | Worktree `khxy` | Main `~/Projects` |
|--|-----------------|-------------------|
| Top-level entries | 29 | 35 |
| Tracked files | 30 (all on-disk files tracked) | same index + **local-only** extras |
| Only on main | — | `bun-dx-catalog.ts`, `bun-docs.config.json`, `resilience-chain.ts`, `venmo-config-example.toml`, `cookie-crc32/`, `rules/` |

### Tracked `config/` by role (30)

| Role | Files |
|------|--------|
| TS modules (live imports) | `ports.ts`, `urls.ts`, `content-types.ts`, `r2-env.ts` (path SSOT only; few/no imports) |
| Harness ESLint (partial) | `eslint/plugin-harness/{boundary,index}.ts` **only** |
| Bun / registry | `ci.bunfig.toml`, `bunfig-registry.toml`, registry wrangler/color TOMLs, `registry.config.json5` |
| Data JSON/YAML | feature-flags, domain-branding, cookies, headers, meta, ngrok, variants, … |
| Secrets-adjacent (low risk) | `secret-registry.json` (env **names**), `factorywager-secrets-lifecycle.yaml` (rotation policy) |

Root symlinks: `ci.bunfig.toml` → `config/ci.bunfig.toml`, `registry.config.json5` → `config/registry.config.json5`.

### Critical gap — harness ESLint tree is mostly local-only

Worktree has:

```
config/eslint/plugin-harness/{boundary,index}.ts
```

Main also has (gitignored, not in worktree):

```
config/eslint/bun-native.ts
config/eslint/harness/{rollout,report,bun-native,messages,index}.ts
config/eslint/plugin-bun/index.ts
config/bun-dx-catalog.ts
```

**Imported by tracked root files** (broken in this worktree without those locals):

| Consumer | Needs |
|----------|--------|
| `eslint.config.ts` / `eslint.harness.config.ts` | `plugin-bun`, `harness/rollout`, `harness/bun-native`, … |
| `scripts/pre-commit-harness.ts`, `harness-*.ts` | `harness/rollout.ts`, `harness/report.ts` |
| `packages/guards`, `dx:catalog`, `dx-mcp` | `bun-dx-catalog.ts` |

Verified missing here: all six paths above → `MISSING`.

So the homebase config problem is not just the DX catalog — **eslint harness rollout lives outside git** on the main machine.

### Root config surface (present)

Tracked/usable: `bunfig.toml`, four `eslint*.config.ts`, five `tsconfig*.json`, `.mcp.json`, `.npmrc`, `.prettierrc`, `.editorconfig`, `.bun.env`.  
`.env` absent in this worktree.

### Clean policy (recommendation)

**Track (allowlist):** harness code under `config/eslint/**`, `bun-dx-catalog.ts`, `ports.ts`, `urls.ts`, `content-types.ts`, `r2-env.ts`, shared non-secret JSON/TOML needed for CI.

**Keep ignored:** real tokens, `.env*`, nested `projects/**/config/`, machine-only overrides (`bun-docs.config.json` with real R2 endpoints, ngrok authtokens).

**Stop relying on force-add** so worktrees clone a complete homebase.

---

## Recommended next actions

1. ~~**Fix config tracking policy**~~ — harness SSOT allowlisted + tracked (`config/bun-dx-catalog.ts`, `config/eslint/**`).
2. ~~**Reconcile Bun pin**~~ — `packageManager` is `bun@1.4.0` (matches runtime).
3. ~~**Drop dead workspace glob**~~ — removed `projects/active/kimiremote/packages/*`.
4. **Optional** — short `packages/README.md`; audit nested project bunfigs only if they join homebase install.

Do **not** invent a second homebase doc tree; keep entry thin via `AGENTS.md` → `STRUCTURE.md` → this note for the discovery snapshot.

---

## Files that matter

| Path | Why |
|------|-----|
| `docs/UNIFIED.md` | Bun install policy |
| `bunfig.toml` | Workspace overrides |
| `package.json` | workspaces, setup/install/discover scripts |
| `lib/docs/repo-docs.ts` | Canonical path SSOT |
| `lib/console-depth.ts` | Console depth SSOT |
| `config/bun-dx-catalog.ts` | Missing here — Bun DX SSOT |
| `config/eslint/harness/*` | Missing here — pre-commit / eslint harness |
| `config/eslint/plugin-bun/*` | Missing here — bun eslint plugin |
| `projects/README.md` | Projects triage |
| `STRUCTURE.md` / `AGENTS.md` | Human/agent maps |
| `.gitignore` (`config/*`) | Root cause of worktree config gaps |
