# Packages graph map

Workspace package coupling board — metafile orphans, external hubs, archive
probes, vault plane, env owners.

- Board: [/portal/packages/](/portal/packages/)
- Bake: [/registry/packages-graph-map.json](/registry/packages-graph-map.json)
- Env inventory: [/registry/env-inventory.json](/registry/env-inventory.json) ·
  [/portal/env/](/portal/env/)
- Claim: `packages-graph-map-v13` (multi-surface: workspaces + portal
  chrome/brand + registry bakes)
- CLI:
  - `bun run audit:packages:full` — cross-check · diff · map · vault · env ·
    bake
  - `bun run audit:packages:env` — vault-gap + env inventory bake
  - `bun run audit:packages:vault` — vault + vault-gap + bake
  - `bun run audit:packages:apply` — wire open `wire-root-dep` actions + bake

## Failure paths

| Symptom                             | Fix                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Board banner “Packages map failed”  | Rebake: `bun run audit:packages:full` then deploy Pages                                                            |
| Schema mismatch note                | Board pins schema **13** and renders v12 as legacy — rebake so `packages-graph-map.json` includes current surfaces |
| Schema missing / invalid            | Board renders a degraded schema status — rebake with `bun run audit:packages -- --bake`                            |
| Residual `migrate-relative-imports` | Prefer `@factorywager/<pkg>` over `packages/<pkg>/…` path imports                                                  |
| `wire-root-dep` open                | `bun run audit:packages:apply` (or `:apply:dry`)                                                                   |
| `archive-candidate`                 | Review archive probes; quarantine rows block hard delete (tsconfig / boundaries)                                   |
| Missing vault / env plane           | `bun run audit:packages:env`                                                                                       |
| Root needs inject &gt; 0            | `bun run proton:inject:factorywager` · check env board                                                             |
| Registry client resolve fails       | Root pin `@factorywager/registry-client: workspace:*` · package exports `bun` → `src`                              |

## Dormant packages

`business` and `p2p` currently appear as archive-candidates because nothing
outside `packages/` imports them. Prefer promote (wire consumers + root dep)
over silent delete.

`ab-testing` and `versioning` are archived outside the install graph and should
not appear in a current schema-v13 bake.

See [monorepo-health tenant](../../docs/harness/tenants/monorepo-health.md).
