# Code quality tenants

Same maintenance shape as spine runbooks (signal · intervention · proof · retirement), scoped to **harness / day-loop code health** — not scheduled by the spine daemon.

Catalog: [`lib/harness/code-quality.ts`](../../lib/harness/code-quality.ts)  
Coverage floor: [`lib/harness/coverage-baseline.json`](../../lib/harness/coverage-baseline.json)

## Tenants

| Id | Signal | Fresh-rerun |
|----|--------|-------------|
| `types-covered` | `type-check` fails | `bun run type-check` |
| `coverage-floor` | harness coverage below baseline | `bun run test:harness-coverage` |
| `orphan-modules` | `lib/harness` module with no importers | `bun run check:harness-orphans` |

Runbooks: [`tenants/types-covered.md`](tenants/types-covered.md) · [`tenants/coverage-floor.md`](tenants/coverage-floor.md) · [`tenants/orphan-modules.md`](tenants/orphan-modules.md)

## Ratchet

```bash
bun run test:code-quality
```

Included from `bun run test:tenant-runbooks`.

Claims: `harness-coverage-ratchet` · `harness-orphan-modules` (types reuse `lib-docs-typecheck` / day-loop `type-check`).
