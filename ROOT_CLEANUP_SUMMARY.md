# Root Directory Cleanup Summary

Phases 1–5 and 4.1–4.3 history moved to [`docs/archives/root-cleanup-history.md`](docs/archives/root-cleanup-history.md).

## Current state (May 2026)

- Root holds configs, entrypoints, and organized top-level dirs only
- Partner Profile skill: `.agents/skills/partner-profile-os/SKILL.md`
- Sports Terminal docs: `docs/sports-terminal/`
- Workspace map: [`STRUCTURE.md`](STRUCTURE.md)

## Phase 4.1 (committed)

Canonicalize docs, tighten gitignore, project dashboards, evict `.vscode` markdown to project docs.

## Phase 4.2 (in progress)

Context bloat reduction, global interface barrel diet, dead code removal in `lib/` / `scripts/` / `tools/`.

See [`STRUCTURE.md`](STRUCTURE.md) Future Candidates for deferred work (bet-ticker/cascade-mover root moves).
