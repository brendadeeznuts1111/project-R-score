# Packages graph map

Workspace package coupling board — metafile orphans, external hubs, archive
probes, vault plane, env owners, and the SVG dependency graph.

- Board: [/portal/packages/](/portal/packages/)
- Bake: [/registry/packages-graph-map.json](/registry/packages-graph-map.json)
- Env inventory: [/registry/env-inventory.json](/registry/env-inventory.json) ·
  [/portal/env/](/portal/env/)
- Claim: `packages-graph-map-v13` (multi-surface v3: workspaces, portal
  chrome/brand, registry families, page references, lib hubs, and orphan triage)
- CLI:
  - `bun run portal-cli pm graph --scope @factorywager` — filter canonical
    `packages/*` rows by npm namespace; surface inventories stay global
  - `bun run portal-cli pm graph --scope unscoped`
  - `bun run portal-cli pm graph --update` — refresh the complete package audit
    plus graph (`audit-report.json` and `packages-graph-map.json`)
  - `bun run portal-cli dashboard --view=packages --open` — open board
  - `bun run audit:packages:full` — cross-check · diff · map · vault · env ·
    bake
  - `bun run audit:packages:env` — vault-gap + env inventory bake
  - `bun run audit:packages:vault` — vault + vault-gap + bake
  - `bun run audit:packages:apply` — wire open `wire-root-dep` actions + bake

## Board UI (live)

| Control | Behavior |
|---------|----------|
| Dependency graph | Zero-CDN SVG from `packageEdges` + `externalEdges` |
| Node / table row | Click or press Enter/Space to focus, dim unrelated nodes, and open details |
| Role chips | Filter graph + table: consumed · dormant · root-tooling |
| Copy CLI | `pm graph` · `audit:packages -- --bake` |
| Nav badge | Package count from bake (`nav-badges.js`) |

## Failure paths

| Symptom | Fix |
|---------|-----|
| Board banner “Packages map failed” | Rebake: `bun run audit:packages:full` then deploy Pages |
| Schema mismatch note | Board pins schema **13** and renders v12 as legacy — rebake so the graph includes current surfaces |
| Schema missing / invalid | Board renders a degraded schema status — rebake with `bun run audit:packages -- --bake` |
| Residual `migrate-relative-imports` | Prefer `@factorywager/<pkg>` over `packages/<pkg>/…` path imports |
| `wire-root-dep` open | `bun run audit:packages:apply` (or `:apply:dry`) |
| `archive-candidate` | Review archive probes; quarantine rows block hard delete (tsconfig / boundaries) |
| Missing vault / env plane | `bun run audit:packages:env` |
| Root needs inject &gt; 0 | `bun run proton:inject:factorywager` · check env board |
| Registry client resolve fails | Root pin `@factorywager/registry-client: workspace:*` · package exports `bun` → `src` |
| Empty graph (0 edges) | Expected when only external edges exist — the external ring still renders |

## Dormant packages

`business` and `p2p` currently appear as archive-candidates because nothing
outside `packages/` imports them. Prefer promote (wire consumers + root dep)
over silent delete.

`ab-testing` and `versioning` are archived outside the install graph and should
not appear in a current schema-v13 bake.

See [monorepo-health tenant](../../docs/harness/tenants/monorepo-health.md) ·
[portal foundation](../../docs/portal-foundation.md).
