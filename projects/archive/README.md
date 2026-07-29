# Archive tier

Frozen former product leaves and package trees — read-only reference. Triage: [`../README.md`](../README.md).

## Status

First freeze is in place: [`factorywager-packages/`](factorywager-packages/) holds archived `@factorywager/*` packages that left the root workspace graph:

| Package | Former path | Notes |
|---------|-------------|--------|
| `@factorywager/ab-testing` | `packages/ab-testing` | Source retained; not a root workspace |
| `@factorywager/versioning` | `packages/versioning` | Source retained; not a root workspace |

Detail: [`factorywager-packages/README.md`](factorywager-packages/README.md) · workspace map: [`STRUCTURE.md`](../../STRUCTURE.md) (`projects/archive/` line).

Prefer root [`archive/`](../../archive/) (gitignored) for monorepo-root historical dumps. Use **this** tree when freezing a product leaf or package set:

```bash
# Product leaf
git mv projects/active/<category>/<name> projects/archive/<name>

# Package freeze (out of root workspaces)
git mv packages/<name> projects/archive/factorywager-packages/<name>
```

## Rules

- No CI ownership unless explicitly re-added
- Do not re-introduce archived packages into root workspaces
- Large runtime artifacts (`*.db`, `dist/`, `data/`) stay local-only / gitignored
- Frozen leaves still follow the root contract (`README.md` + `package.json`)
