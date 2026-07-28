# Packages graph map

Workspace package coupling board — metafile orphans, external hubs, archive probes, vault plane, env owners, **SVG dependency graph**.

- Board: [/portal/packages/](/portal/packages/)
- Bake: [/registry/packages-graph-map.json](/registry/packages-graph-map.json)
- Env inventory: [/registry/env-inventory.json](/registry/env-inventory.json) · [/portal/env/](/portal/env/)
- Claim: `packages-graph-map-v13` (multi-surface v2: workspaces + portal chrome/brand + registry families)
- CLI:
  - `bun run portal-cli pm graph` — offline table from bake
  - `bun run portal-cli dashboard --view=packages --open` — open board
  - `bun run audit:packages:full` — cross-check · diff · map · vault · env · bake
  - `bun run audit:packages:env` — vault-gap + env inventory bake
  - `bun run audit:packages:vault` — vault + vault-gap + bake
  - `bun run audit:packages:apply` — wire open `wire-root-dep` actions + bake

## Board UI (live)

| Control | Behavior |
|---------|----------|
| Dependency graph | Zero-CDN SVG from `packageEdges` + `externalEdges` |
| Click node / table row | Focus (dim unrelated) · detail panel (edges, actions, probes) |
| Role chips | Filter graph + table: consumed · dormant · root-tooling |
| Copy CLI | `pm graph` · `audit:packages -- --bake` |
| Nav badge | Package count from bake (`nav-badges.js`) |

## Failure paths

| Symptom | Fix |
|---------|-----|
| Board banner “Packages map failed” | Rebake: `bun run audit:packages:full` then deploy Pages |
| Schema mismatch note | Board pins schema **13** (min **12**) — rebake `packages-graph-map.json` |
| Residual `migrate-relative-imports` | Prefer `@factorywager/<pkg>` over `packages/<pkg>/…` path imports |
| `wire-root-dep` open | `bun run audit:packages:apply` (or `:apply:dry`) |
| `archive-candidate` | Review archive probes; quarantine rows block hard delete (tsconfig / boundaries) |
| Missing vault / env plane | `bun run audit:packages:env` |
| Root needs inject > 0 | `bun run proton:inject:factorywager` · check env board |
| Registry client resolve fails | Root pin `@factorywager/registry-client: workspace:*` · package exports `bun` → `src` |
| Empty graph (0 edges) | Expected when only external edges exist — external ring still renders |

## Dormant packages

Packages may appear as archive-candidates when nothing outside `packages/` imports them. Prefer promote (wire consumers + root dep) over silent delete.

See [monorepo-health tenant](../../docs/harness/tenants/monorepo-health.md) · [portal foundation](../../docs/portal-foundation.md).
