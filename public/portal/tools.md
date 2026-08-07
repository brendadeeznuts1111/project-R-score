# CLI Tools hub

Control plane for real `portal-cli` commands and baked registry freshness.

- Board: [/portal/tools/](/portal/tools/)
- Launcher: `bun run portal-cli dashboard` · `portal-cli dashboard --view=packages --open`
- Nav badges: [`nav-badges.js`](../nav-badges.js) (registry JSON only)
- Capability subset: board `#capabilities` · bake `/registry/capability-map-subset.json` · full `/registry/capability-map-full.json` · [capability-map.md](../../docs/harness/capability-map.md#grounded-capability-map)
- Gates: `portal-cli capabilities health` · `portal-cli capabilities doctor` · `bun run check:snapshots`

## Real boards only

| View | Board |
|------|-------|
| tools | `/portal/tools/` |
| packages | `/portal/packages/` |
| vault | `/portal/vault/` |
| env | `/portal/env/` |
| failures | `/portal/failures/` |
| health | `/portal/health/` |

No phantom routes (`/portal/pm/`, `/portal/audit/`, `/portal/snapshots/`).

## Related

- Vault gate vs bake: [proton-integration](../../docs/harness/tenants/proton-integration.md#vault-health-gate-vs-dashboard)
- Packages graph: [packages.md](../packages.md)
- Chrome SSOT: [portal-foundation](../../docs/portal-foundation.md)
