# Ops partner profile bridge (Identity lane)

**Claim:** partner identity is rooted in ops `tree_nodes`; Partner Profile OS is an **adapter**, not a peer ledger.

| Piece | Path |
|-------|------|
| Schema | `partner_profile_bindings` in [`lib/operations/schema.ts`](../../lib/operations/schema.ts) |
| Bridge | [`lib/operations/partner-profile-bridge.ts`](../../lib/operations/partner-profile-bridge.ts) |
| Templates | [`config/partner-templates/`](../../../config/partner-templates/) (TOML, standalone — not Sports Terminal nested build) |
| Brands | `TreeNodeId`, `PartnerTemplateId`, `PartnerProfileKey` in [`lib/types/branded/operations.ts`](../../lib/types/branded/operations.ts) |
| Summary | `buildOpsSummary().partners` · portal panel **Partner profiles** |
| Sync | `applyOpsSyncEvent(..., db)` binds on `account_assigned` / `telegram_linked` |
| Backfill | `bun scripts/backfill-partner-bindings.ts` |

## Binding model

```text
tree_nodes.id  ──1:1──►  partner_profile_bindings.tree_node_id
                              ├── template_id  → config/partner-templates/<id>.toml
                              ├── profile_key  → PartnerProfileKey (pp-…)
                              └── lifecycle_status ∈ signup | materialized | kyc_pending | active | suspended | terminated
```

Default template: **`default-prospect`** (`DEFAULT_TEMPLATE_ID`).

## API surface

| Function | Role |
|----------|------|
| `bindPartnerProfile` / `bindTemplate` | Create or refresh binding |
| `materializePartnerProfile` / `materializeProfile` | Join tree + platform accounts + provisioning |
| `queryPartnersSlice` / `getPartnersSummary` | Ops-summary counts |
| `templateIdForSource(source?)` | Onboard source → template (I1: always default) |
| `evaluateForNode` | Root-owned policy gate subset (I2 precursor) |
| `backfillPartnerBindings` | One-shot bind for active unbound nodes |

## Lifecycle defaults

| `tree_nodes.status` | Default lifecycle on bind |
|---------------------|---------------------------|
| `prospect` | `materialized` |
| `partner` | `active` |
| other active | `materialized` |

## Commands

```bash
# Schema is applied via openOperationsDb → initSchema → migrateSchema
bun scripts/backfill-partner-bindings.ts --dry-run
bun scripts/backfill-partner-bindings.ts

# Summary includes partners slice
bun run ops:snapshot

# Tests
bun test tests/partner-profile-bridge.test.ts tests/ops-summary.test.ts
```

## Adding a partner type (I1)

1. Add `config/partner-templates/<slug>.toml` with `[meta]` + `[sor]`.
2. Extend `templateIdForSource` if source/referral should pick that slug.
3. Bind via `bindPartnerProfile(db, treeNodeId, { templateId: asPartnerTemplateId(slug) })`.
4. Re-run `ops:snapshot` and confirm portal **Partner profiles** panel.

## Explicit non-goals (later phases)

- **I2** — play gate fully driven by template SoR on every dispatch path.
- **I3** — fan-out of `partner_bound` to Telegram / external channels (outbox topic `identity` already exists).
- Importing full Sports Terminal PartnerGateway / nested monorepo UI.

## Related

- Ops dual-mode experiments skill: [`.agents/skills/ops-dual-mode-experiments/`](../../../.agents/skills/ops-dual-mode-experiments/)
- Partner Profile OS product skill: [`.agents/skills/partner-profile-os/`](../../../.agents/skills/partner-profile-os/)
- Ops snapshot tenant: [`ops-snapshot.md`](ops-snapshot.md)
