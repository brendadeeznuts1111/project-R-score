# Cheatsheet CLIs retired (Jul 2026)

The legacy `scripts/cheatsheet*.js` entrypoints were removed as non-TypeScript / non-harness surface.

Prefer:
- `bun run packages:list`
- `docs/` Bun guides
- `bun tools/bun-doc-refs.ts`

Recover history: `git show HEAD~1:scripts/cheatsheet.js` (adjust commit).
