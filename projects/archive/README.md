# Archive tier (projects)

Frozen project checkouts under `projects/` — read-only reference, no active development.

## Status

Bucket exists for triage. Prefer **root `archive/`** for monorepo-root historical dumps (already gitignored). Use **this** tree when freezing a former `projects/active/*` app via:

```bash
git mv projects/active/<category>/<name> projects/archive/<name>
```

## Rules

- No CI ownership unless explicitly re-added
- Do not re-introduce archived packages into root workspaces
- Large runtime artifacts (`*.db`, `dist/`, `data/`) stay local-only / gitignored

See also: root [`archive/`](../../archive/) (gitignored entire tree) and [`projects/README.md`](../README.md).
