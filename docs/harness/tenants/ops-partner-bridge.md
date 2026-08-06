# Ops partner profile bridge (Identity lane)

<!-- REF:ID 0.1.ops-partner-bridge -->
<a id="0.1.ops-partner-bridge"></a>

**Claim:** partner identity is rooted in ops `tree_nodes`; Partner Profile OS is an **adapter**, not a peer ledger.

| Piece | Path |
|-------|------|
| Schema | `partner_profile_bindings` in [`lib/operations/schema.ts`](../../../lib/operations/schema.ts) |
| Bridge | [`lib/operations/partner-profile-bridge.ts`](../../../lib/operations/partner-profile-bridge.ts) |
| Templates | [`config/partner-templates/`](../../../config/partner-templates/) (TOML, standalone — not Sports Terminal nested build) |
| Brands | `TreeNodeId`, `PartnerTemplateId`, `PartnerProfileKey` in [`lib/types/branded/operations.ts`](../../../lib/types/branded/operations.ts) |
| Summary | `buildOpsSummary().partners` · portal panel **Partner profiles** |
| Sync | `applyOpsSyncEvent(..., db)` binds on `account_assigned` / `telegram_linked` |
| Backfill | `bun scripts/backfill-partner-bindings.ts` |

## Binding model

```text
tree_nodes.id  ──1:1──►  partner_profile_bindings.tree_node_id
                              ├── template_id  → config/partner-templates/<id>.toml
                              ├── profile_key  → PartnerProfileKey (pp-…)
                              └── lifecycle_status → canonical eight-state PartnerLifecycleStatus
```

Default template: **`default-prospect`** (`DEFAULT_TEMPLATE_ID`).

The canonical contract is owned by
[`lib/partner-profile/schema.ts`](../../../lib/partner-profile/schema.ts): `signup`
· `materialized` · `kyc_pending` · `active` · `cultivating` · `graduated` ·
`suspended` · `terminated`. SQLite lifecycle values are parsed into that
contract at the bridge boundary before materialization, gating, summaries, or
downstream projections.

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

## Lifecycle gate mapping

`evaluateForNode` applies this lifecycle decision before the template SoR gate:

| Lifecycle | Gate action |
|-----------|-------------|
| `active` | allow |
| `graduated` | allow |
| `materialized` | allow |
| `kyc_pending` | allow |
| `cultivating` | defer |
| `signup` | defer |
| `suspended` | block |
| `terminated` | block |

An `allow` lifecycle continues through the template’s stake, book, signal,
OpSec, and tier policy checks; those checks may still adjust or block the play.

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

## Phase I2 — policy gate on dispatch

`publishAndDispatch` (play-dispatcher):

1. Auto-bind missing profiles (`default-prospect`).
2. `inferSignalTypeFromPlay` → `evaluateForNode` (template SoR).
3. `recordGateDecision` on every recipient.
4. Deny → skip reserve/distribution + `play.gate.denied` outbox event.
5. Adjust → use capped stake + `play.gate.adjusted` event.
6. Reserve fail → `play.gate.denied` with reserve reason.

Tests: `tests/play-dispatcher-gate.test.ts` · `tests/toc-play-routing.test.ts`.

## Phase I2b — TOC weightedScore routing (before template gate)

After auto-bind, `rankPlayRecipients` orders agents by baked TOC `weightedScore` (readiness × expertWeight × limit freshness × Gate 12 — see [`lib/toc-ops/return-efficiency.ts`](../../../lib/toc-ops/return-efficiency.ts)).

When `buffer.throttleOnboarding` is true and an agent has a TOC-bound call sign with `0 < weightedScore < 0.5`, dispatch **defers** before `evaluateForNode`:

1. `recordGateDecision` with `action: 'defer'`.
2. `play.gate.defer` outbox (payload includes `callSign`, `weightedScore`, `rankedRank`).
3. Skip reserve/distribution for that recipient; higher-score recipients still dispatch.

Override baked snapshot in tests via `publishAndDispatch(..., { routingContext })`.

## Phase I3 — identity channel

| Event | Topic | When |
|-------|-------|------|
| `partner.bound` | `identity` | First `bindPartnerProfile` insert via ops-sync (`created === true`) |
| `partner.welcome` | `identity` | Telegram linked · HTML template pack + keyboard (`r2` + `telegram`) |
| `partner.onboard.complete` | `identity` | Package apply · `onboard.complete.v1` (`r2` + `telegram`) |
| `play.gate.denied` / `play.gate.adjusted` / `play.gate.defer` | `plays` | Dispatch gate / TOC routing defer |
| `play.settled` | `plays` | Settlement (profileKey attached when bound) |

Helpers: `enqueueIdentityChannelEvent`, `enqueuePartnerWelcomeEvent`, `enqueueOnboardCompleteEvent`, `enqueuePlayGatedChannelEvent` in [`lib/channels/outbox.ts`](../../../lib/channels/outbox.ts).

Deep identity (cellphone → profile → seat → ChatChannelMeta → templates): [`partner-onboarding-package.md`](partner-onboarding-package.md).

Process: `processChannelOutbox` (welcome/onboard.complete use `telegram` projector with `parseMode: HTML`; other identity events default R2; tests use `deliver: false` → local MemoryChannelStore).

## Explicit non-goals (later)

- Importing full Sports Terminal PartnerGateway / nested monorepo UI.
- Slack/Telegram projectors on every identity event (identity defaults to R2 only).
- Multi-template referral routing beyond `templateIdForSource` stub.

## Related

- Deep onboarding + Telegram templates: [`partner-onboarding-package.md`](partner-onboarding-package.md)
- Ops dual-mode experiments skill: [`.agents/skills/ops-dual-mode-experiments/`](../../../.agents/skills/ops-dual-mode-experiments/)
- Partner Profile OS product skill: [`.agents/skills/partner-profile-os/`](../../../.agents/skills/partner-profile-os/)
- Ops snapshot tenant: [`ops-snapshot.md`](ops-snapshot.md)
