# `@factorywager/package` — quarantined placeholder

Archive probe recommendation: **archive** (empty / placeholder package).

Hard-delete is blocked while these still name the path:

- `tsconfig.json` project references / paths
- `docs/IMPORT_BOUNDARIES.md`
- `scripts/verify-package-import-boundaries.ts`
- `.agents/skills/ast-grep/repo-map.json`

Do not wire new consumers. Prefer removing boundary refs first, then delete the directory.
See packages-graph-map bake `quarantine[]` (schema v11+).
