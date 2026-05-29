# Root Directory Cleanup Summary

Phases 1–5 and 4.1–4.3 history moved to [`docs/archives/root-cleanup-history.md`](docs/archives/root-cleanup-history.md).

## Current state (May 2026)

- Root holds configs, entrypoints, and organized top-level dirs only
- Partner Profile skill: `.agents/skills/partner-profile-os/SKILL.md`
- Sports Terminal docs: `docs/sports-terminal/`
- Workspace map: [`STRUCTURE.md`](STRUCTURE.md)

## Phase 4.1 (committed)

Canonicalize docs, tighten gitignore, project dashboards, evict `.vscode` markdown to project docs.

## Phase 4.2 (committed)

Context bloat reduction, barrel trim, dead code purge (−16k lines).

## Phase 4.3 (committed)

`lib/projects-scan.ts` shared module, dx-mcp scan hardening (`DX_MCP_DEBUG=1`), path fork documented in core-documentation.

See [`STRUCTURE.md`](STRUCTURE.md) Future Candidates for deferred work (bet-ticker/cascade-mover root moves).
