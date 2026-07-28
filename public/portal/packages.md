# Packages graph map

Workspace package coupling board — metafile orphans, external hubs, archive probes, vault plane.

- Board: [/portal/packages/](/portal/packages/)
- Bake: [/registry/packages-graph-map.json](/registry/packages-graph-map.json)
- Claim: `packages-graph-map-v11`
- CLI:
  - `bun run audit:packages:full` — cross-check · diff · map · vault · bake
  - `bun run audit:packages:vault` — vault + vault-gap + bake
  - `bun run audit:packages:apply` — wire open `wire-root-dep` actions + bake

## Failure paths

| Symptom | Fix |
|---------|-----|
| Board banner “Packages map failed” | Rebake: `bun run audit:packages:full` then deploy Pages / copy registry |
| Schema mismatch note | Board pins schema **11** — rebake so `packages-graph-map.json` matches |
| Residual `migrate-relative-imports` | Prefer `@factorywager/<pkg>` over `packages/<pkg>/…` path imports |
| Missing vault plane | `bun run audit:packages:vault` |
| Registry client resolve fails | Root pin `@factorywager/registry-client: workspace:*` · package exports `bun` → `src` |

See [monorepo-health tenant](../../docs/harness/tenants/monorepo-health.md).
