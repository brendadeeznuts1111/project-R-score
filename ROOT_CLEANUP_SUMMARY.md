# Root Directory Cleanup Summary

Phases 1–5 and 4.1–4.3 history moved to [`docs/archives/root-cleanup-history.md`](docs/archives/root-cleanup-history.md).

## Current state (May 2026)

- Root holds configs, entrypoints, and organized top-level dirs only
- Partner Profile skill: `.agents/skills/partner-profile-os/SKILL.md`
- Sports Terminal docs: `docs/sports-terminal/`
- Workspace map: [`STRUCTURE.md`](STRUCTURE.md)

## Phase 4.1 (Jun 2026)

Canonicalize docs, tighten gitignore, project dashboards, evict `.vscode` markdown to project docs.

**Root eviction (Jun 2026):**
- `bet-ticker-worker-v1.1/`, `cascade-mover-v3/` → `projects/active/enterprise/`
- `kimi-plugin/` → `projects/active/sports-terminal-os/integrations/kimi-plugin/`
- Experimental: `alchemy-effect/`, `cloudflare-artifacts/`, `purelytelegram-router/`, `apex-biolabs/` → `projects/experimental/`
- `alchemy-tutorial/` → `examples/demos/alchemy-tutorial/`
- `lazycodex/` → `projects/archive/`
- `z-ai/` → `scratch/session-artifacts/`
- Removed: `~/` (815M misplaced bun cache), empty scaffolds (`my-app/`, `playground/`, `work/`), session photo
- MCP/dx-mcp paths updated; `bet-ticker-worker` skill symlink retargeted

## Phase 4.5 (Jun 2026) — Global virtual store

- `scripts/lib/bun-install-env.ts` — shared `BUN_INSTALL_CACHE_DIR` + `BUN_INSTALL_GLOBAL_STORE` resolution
- `scripts/verify-install-cache.ts` — `bun run install:verify` checks cache, `links/`, lockfile, tilde drift
- Pre-commit blocks staged `./~` cache paths; CI installs via `with-bun-cache-env.ts`
- VS Code terminal env: `BUN_INSTALL` + `BUN_INSTALL_GLOBAL_STORE` only (no `BUN_INSTALL_CACHE_DIR`)

## Phase 4.7 (Jun 2026) — CI cache lifecycle

- `scripts/bun-cache-lifecycle.ts` + `scripts/lib/bun-cache-metrics.ts` — safe dry-run metrics (Bun 1.4 `pm cache rm --dry-run` still deletes)
- `repo-hygiene` runs `install:cache:lifecycle` after `install:verify:strict`
- `.github/workflows/cache-lifecycle.yml` — weekly metrics artifact; self-hosted prune via `workflow_dispatch`
- `harness:report --json` embeds `installCache` size + global-store link counts

## Phase 4.6 (Jun 2026) — Machine-level install defaults

- `~/.bunfig.toml` owns `linker`, `globalStore`, absolute `cache.dir` for all repos on the Mac
- Workspace `bunfig.toml` files stripped of redundant machine keys (~21 files); 4 intentional overrides retained
- `scripts/audit-bunfig.sh` + `bun run audit:bunfig` — workspace redundancy scan
- `kimi-toolchain` `bunfig-policy` gate warns on root `bunfig.toml` duplicating `~/.bunfig.toml`
- Canonical doc: [`docs/UNIFIED.md`](docs/UNIFIED.md) · agent entry: [`AGENTS.md`](AGENTS.md)

## Phase 4.1b (Jun 2026) — Root polish

- Removed duplicate root `index.html` (canonical: `public/dashboards/dns-status-dashboard.html`)
- Removed root `index.ts` hello-world stub
- Deleted recurring `./~/` Bun cache dir; root `bunfig.toml` now uses Bun-documented `[install.cache]`
- Moved `registry.config.json5`, `ci.bunfig.toml`, `bunfig-registry.toml` → `config/` (root symlinks for legacy lookups)
- Fixed `scripts/sitemap-refresh.ts` to reference `public/dashboards/` paths
- `repo-hygiene` flags unexpected root dirs/files and auto-evicts `./~` Bun cache drift
- Prefer absolute `[install.cache].dir` in `~/.bunfig.toml`; avoid `BUN_INSTALL_CACHE_DIR` in shell/IDE env
- `postinstall` + `scripts/evict-root-tilde-cache.ts` remains a safety net for `./~` drift

## Phase 4.2 (committed)

Context bloat reduction, barrel trim, dead code purge (−16k lines).

## Phase 4.3 (committed)

`lib/projects-scan.ts` shared module, dx-mcp scan hardening (`DX_MCP_DEBUG=1`), path fork documented in core-documentation.

## Phase 4.4 (committed)

`lib/projects-scan.ts` uses Bun.Glob, Bun.file, Bun.spawnSync — no node:fs/path in project inventory chain.
ESLint Bun-native gate: `bun run lint:bun-native` (see `eslint.bun-native.config.ts`).

See [`STRUCTURE.md`](STRUCTURE.md) Future Candidates for deferred work (bet-ticker/cascade-mover root moves).
