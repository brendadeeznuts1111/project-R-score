# Telegram — operations + factory portal bot

<!-- area-map-verified: 2026-08-06 -->

> **AGENT PROTOCOL:** Do not list files recursively. Read the **## Area map**
> below, pick one cluster, and open only the entry paths listed for that
> cluster. Prefer `bun run lib:area-maps:check` when editing this map.

Tree-aware Telegram integration for the sports betting operations platform and
multi-tenant portal webhook.

**Scale:** ~24k lines · ~100+ `.ts` files (second-largest `lib/` domain). Use
the **Area map** first. Inventory SSOT: [`../README.md`](../README.md).

**Maps are cluster indexes, not exhaustive file lists.** Prefer prefixes:
`seat-desk-*`, `handshake-*`, `package-group-*`, `partner-ops-*`, `ops-*`,
`telegram-*`. Nested packs: [`flows/`](flows/), [`templates/`](templates/),
[`catalog-research/`](catalog-research/).

**Coupling (lib graph):** dual-core with [`../operations/`](../operations/) and
[`../channels/`](../channels/); also [`../types/`](../types/),
[`../pages/`](../pages/), [`../dod/`](../dod/),
[`../partner-profile/`](../partner-profile/).

## Area map

| Area                          | Start here                                                                                                | Also                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bots / entry**              | [`ops-bot.ts`](ops-bot.ts) · [`bot.ts`](bot.ts)                                                           | [`ops-bridge.ts`](ops-bridge.ts) · [`ops-commands.ts`](ops-commands.ts) · [`ops-bot-types.ts`](ops-bot-types.ts) · [`play-callback.ts`](play-callback.ts) · [`webhook-pages.ts`](webhook-pages.ts) · [`consumer-updates.ts`](consumer-updates.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Wire / config**             | [`telegram-config.ts`](telegram-config.ts) · [`telegram-api.ts`](telegram-api.ts)                         | [`telegram-api-url.ts`](telegram-api-url.ts) · [`telegram-update.ts`](telegram-update.ts) · [`telegram-env-bind.ts`](telegram-env-bind.ts) · [`telegram-transport-health.ts`](telegram-transport-health.ts) · [`rich-message.ts`](rich-message.ts) · [`inline-confirmation.ts`](inline-confirmation.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Flows / UX cards**          | [`flows/README.md`](flows/README.md)                                                                      | `flows/cards/*` · `flows/keyboards.ts` · `flows/callbacks.ts` · `flows/channel-meta.ts` · `flows/deliver.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Templates**                 | [`templates/README.md`](templates/README.md)                                                              | `renderForNode` · TemplateId pack · `templates/escape.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Surfaces / topology**       | [`surfaces.ts`](surfaces.ts)                                                                              | [`surface-graph.ts`](surface-graph.ts) · [`surface-audit.ts`](surface-audit.ts) · [`known-chats.ts`](known-chats.ts) · [`broadcast.ts`](broadcast.ts) · [`broadcast-log.ts`](broadcast-log.ts) · [`telegram-discovery.ts`](telegram-discovery.ts) · [`refresh-known-chats.ts`](refresh-known-chats.ts) · [`out-health.ts`](out-health.ts)                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Package group / handshake** | [`handshake-catalog.ts`](handshake-catalog.ts)                                                            | [`handshake-desk.ts`](handshake-desk.ts) · [`handshake-readiness.ts`](handshake-readiness.ts) · [`handshake-lanes.ts`](handshake-lanes.ts) · [`handshake-ref.ts`](handshake-ref.ts) · [`handshake-snapshot.ts`](handshake-snapshot.ts) · [`package-group-registry.ts`](package-group-registry.ts) · [`package-group-forum.ts`](package-group-forum.ts) · [`package-group-membership.ts`](package-group-membership.ts) · [`verify-package-group-handshake.ts`](verify-package-group-handshake.ts) · [`forum-invite-gap.ts`](forum-invite-gap.ts) · [`house-forum-metadata.ts`](house-forum-metadata.ts) · [`enhance-package-group-forum.ts`](enhance-package-group-forum.ts) · [`rename-partner-package-group.ts`](rename-partner-package-group.ts) |
| **Seat capital desk**         | [`seat-capital-desk.ts`](seat-capital-desk.ts)                                                            | `seat-desk-*.ts` · [`seat-intake.ts`](seat-intake.ts) · [`dm-seat-designation.ts`](dm-seat-designation.ts) · [seat-capital-desk](../../docs/harness/tenants/seat-capital-desk.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Partner ops / colors**      | [`partner-ops-registry.ts`](partner-ops-registry.ts) · [`partner-ops-project.ts`](partner-ops-project.ts) | I/O facade + pure projection · [`partner-ops-color-kernel.ts`](partner-ops-color-kernel.ts) · [`partner-ops-events.ts`](partner-ops-events.ts) · [`partner-ops-glossary.ts`](partner-ops-glossary.ts) · notifications · forum accounting                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Catalog research**          | [`catalog-research/`](catalog-research/)                                                                  | `telegram:catalog:research` · gap artifact `catalog-enhancements.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Branding / media**          | [`branding.ts`](branding.ts)                                                                              | [`partner-visuals.ts`](partner-visuals.ts) · [`package-group-icon.ts`](package-group-icon.ts) · [`telegram-color-kernel.ts`](telegram-color-kernel.ts) · [`brands.ts`](brands.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **ACL / ops views**           | [`ops-acl.ts`](ops-acl.ts)                                                                                | [`ops-accounting-view.ts`](ops-accounting-view.ts) · [`ops-view-glossary.ts`](ops-view-glossary.ts) · [`telegram-glossary.ts`](telegram-glossary.ts) · [`daily-finance-report.ts`](daily-finance-report.ts) · [`daily-capacity-report.ts`](daily-capacity-report.ts) · [`event-alerts.ts`](event-alerts.ts) · [`soft-accounting-export.ts`](soft-accounting-export.ts)                                                                                                                                                                                                                                                                                                                                                                             |
| **DOD accounting photos**     | ingest from `ops-bot` / `bot`                                                                             | [`../dod/telegram-accounting-ingest.ts`](../dod/telegram-accounting-ingest.ts) · `/verifydod`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Linking**                   | [`link-nonce.ts`](link-nonce.ts)                                                                          | portal `/start link_*` · `tools/telegram-link-chat.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### Maintainability notes (drill-down)

| Topic              | Guidance                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dual bots**      | Intentional multi-plane: production = Pages webhook → R2 `telegram-updates` → `telegram:ops:consume` → [`bot.ts`](bot.ts); long-poll [`ops-bot.ts`](ops-bot.ts) is host-local when `OPS_DB_PATH` is openable. Not product duplication. Tenant: [telegram-factory](../../docs/harness/tenants/telegram-factory.md).                                                                       |
| **Edge allowlist** | No `bun:sqlite` only on [`webhook-pages.ts`](webhook-pages.ts) + [`telegram-update.ts`](telegram-update.ts). Everything else is Bun-only.                                                                                                                                                                                                                                                |
| **R2 topics**      | `telegram-updates` (Pages write / consumer drain) · `telegram-commands` (`ops-bridge` when no local DB) · channel outbox via `processChannelOutbox`.                                                                                                                                                                                                                                     |
| **God files**      | [`seat-intake.ts`](seat-intake.ts) (~1k, intentional cycle leaf). **Partners-ops bake split:** pure projection/classifiers/validation in [`partner-ops-project.ts`](partner-ops-project.ts) (`projectPartnersOpsRegistry`); disk/SQLite/write in [`partner-ops-registry.ts`](partner-ops-registry.ts) (`buildPartnersOpsRegistry` · `exportPartnersOpsRegistry`). Wire schema unchanged. |
| **Cycle belt**     | Bidirectional with [`../operations/`](../operations/) and [`../channels/outbox.ts`](../channels/outbox.ts). Prefer snapshot JSON for reverse deps when adding ops→telegram edges.                                                                                                                                                                                                        |

## Factory webhook commands

| Command         | Description                                          |
| --------------- | ---------------------------------------------------- |
| `/start link_*` | Link portal account (`telegram_linked` ops-sync)     |
| `/start`        | Ops welcome / registration hints                     |
| `/link`         | Portal link instructions                             |
| `/status`       | Ops tree status (or registry health if unregistered) |
| `/accounts`     | Sportsbook accounts                                  |
| `/plays`        | Pending plays + ack status                           |
| `/tree`         | Downstream network                                   |
| `/register`     | Sub-agent under referral id                          |
| `/registry`     | Factory registry package count                       |
| `/deploy`       | Admin deploy request                                 |
| `/verifydod`    | DOD delivery receipt                                 |

Play messages include inline **Placed / Skip** buttons; acks update
`play_distribution.ack_status`.

## Architecture

```text
Telegram API
    ↓ Pages webhook (functions/api/… → R2 telegram-updates)
    ↓ bun run telegram:ops:consume  (or OpsTelegramBot long-poll)
TelegramBot / OpsTelegramBot / ops-bridge
    ↓ dispatchOpsCommand / handlePlayCallback
tree_nodes + play_distribution + ops_channel_outbox
    ↓ processChannelOutbox (projectorBackend r2|memory)
Telegram sendMessage (plays, partner.welcome HTML templates)
```

## Quick start

```bash
bun run telegram:verify
bun run telegram:discover
bun run telegram:ops -- directory --refresh
bun run telegram:ops -- surfaces
bun run telegram:ops -- graph
bun run telegram:handshake:catalog
bun run telegram:factory:setup
bun run telegram:ops:consume
bun run seat:desk:refresh SPEN-001
```

Long-poll ops bot (`OPS_DB_PATH` + token):

```bash
bun -e "
import { OpsTelegramBot } from './lib/telegram/ops-bot.ts';
import { loadTelegramEnv } from './lib/telegram/telegram-config.ts';
new OpsTelegramBot({
  token: loadTelegramEnv().effectiveToken!,
  dbPath: 'data/operations.db',
}).start();
"
```

## Related tenants

| Doc / surface                                                                                    | Role                               |
| ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| [telegram-factory](../../docs/harness/tenants/telegram-factory.md)                               | Factory bot + consume loop         |
| [seat-capital-desk](../../docs/harness/tenants/seat-capital-desk.md)                             | Pinned Liquidity/Outs desk         |
| [partner-package-group-handshake](../../docs/harness/tenants/partner-package-group-handshake.md) | Package group lifecycle            |
| [`../channels/outbox.ts`](../channels/outbox.ts)                                                 | Outbox projector + partner welcome |
