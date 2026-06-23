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

## Phase 4.2 (committed)

Context bloat reduction, barrel trim, dead code purge (−16k lines).

## Phase 4.3 (committed)

`lib/projects-scan.ts` shared module, dx-mcp scan hardening (`DX_MCP_DEBUG=1`), path fork documented in core-documentation.

## Phase 4.4 (committed)

`lib/projects-scan.ts` uses Bun.Glob, Bun.file, Bun.spawnSync — no node:fs/path in project inventory chain.
ESLint Bun-native gate: `bun run lint:bun-native` (see `eslint.bun-native.config.ts`).

See [`STRUCTURE.md`](STRUCTURE.md) Future Candidates for deferred work (bet-ticker/cascade-mover root moves).
