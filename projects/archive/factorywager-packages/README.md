# Archived FactoryWager packages

Dormant `@factorywager/*` packages removed from the **root workspace install graph**
(`packages/*`) after monorepo health / packages-graph-map marked them archive-candidates
(no spine importers).

| Package | Former path | Notes |
|---------|-------------|--------|
| `@factorywager/ab-testing` | `packages/ab-testing` | Source retained for review |
| `@factorywager/versioning` | `packages/versioning` | Source retained for review |

These are **not** root workspace members. To revive: move back under `packages/`, add a
real consumer (`workspace:*` + imports), refresh `bun.lock`, and update root `tsconfig.json`
project references.

See [`docs/UNIFIED.md`](../../../docs/UNIFIED.md#catalogs-and-workspace-protocols) and
[`STRUCTURE.md`](../../../STRUCTURE.md) for the hybrid monorepo model.
