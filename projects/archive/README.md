# Archive tier

Frozen former `projects/active/*` apps — read-only reference. Triage: [`../README.md`](../README.md).

## Status

Empty until the first freeze. Prefer root [`archive/`](../../archive/) (gitignored) for monorepo-root historical dumps. Use **this** tree when freezing a product leaf:

```bash
git mv projects/active/<category>/<name> projects/archive/<name>
```

## Rules

- No CI ownership unless explicitly re-added
- Do not re-introduce archived packages into root workspaces
- Large runtime artifacts (`*.db`, `dist/`, `data/`) stay local-only / gitignored
- Frozen leaves still follow the root contract (`README.md` + `package.json`)
