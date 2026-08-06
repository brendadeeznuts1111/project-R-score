# Telegram — operations + factory portal bot

Tree-aware Telegram integration for the sports betting operations platform and
multi-tenant portal webhook.

**Scale:** ~24k lines · ~100+ `.ts` files (second-largest `lib/` domain). Use
the **Area map** first. Inventory SSOT: [`../README.md`](../README.md).

**Coupling (lib graph):** dual-core with [`../operations/`](../operations/) and
[`../channels/`](../channels/); also [`../types/`](../types/),
[`../pages/`](../pages/), [`../dod/`](../dod/),
[`../partner-profile/`](../partner-profile/).

## Area map

| Area                            | Start here                                                                        | Also                                                                                                                                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bots / entry**                | [`ops-bot.ts`](ops-bot.ts) · [`bot.ts`](bot.ts)                                   | [`ops-bridge.ts`](ops-bridge.ts) · [`ops-commands.ts`](ops-commands.ts) · [`play-callback.ts`](play-callback.ts) · [`webhook-pages.ts`](webhook-pages.ts)                                                                                                                 |
| **Wire / config**               | [`telegram-config.ts`](telegram-config.ts) · [`telegram-api.ts`](telegram-api.ts) | [`telegram-api-url.ts`](telegram-api-url.ts) · [`telegram-update.ts`](telegram-update.ts) · [`telegram-env-bind.ts`](telegram-env-bind.ts) · [`telegram-transport-health.ts`](telegram-transport-health.ts) · [`rich-message.ts`](rich-message.ts)                        |
| **Flows / UX cards**            | [`flows/README.md`](flows/README.md)                                              | `flows/cards/*` · `flows/keyboards.ts` · `flows/callbacks.ts` · `flows/channel-meta.ts`                                                                                                                                                                                   |
| **Templates**                   | [`templates/README.md`](templates/README.md)                                      | `renderForNode` · TemplateId pack                                                                                                                                                                                                                                         |
| **Surfaces / topology**         | [`surfaces.ts`](surfaces.ts)                                                      | [`surface-graph.ts`](surface-graph.ts) · [`surface-audit.ts`](surface-audit.ts) · [`known-chats.ts`](known-chats.ts) · [`broadcast.ts`](broadcast.ts) · [`telegram-discovery.ts`](telegram-discovery.ts)                                                                  |
| **Package group / handshake**   | [`handshake-catalog.ts`](handshake-catalog.ts)                                    | [`handshake-desk.ts`](handshake-desk.ts) · [`handshake-readiness.ts`](handshake-readiness.ts) · [`handshake-lanes.ts`](handshake-lanes.ts) · [`package-group-*.ts`](package-group-registry.ts) · [`verify-package-group-handshake.ts`](verify-package-group-handshake.ts) |
| **Seat capital desk**           | [`seat-capital-desk.ts`](seat-capital-desk.ts)                                    | `seat-desk-*.ts` · [`dm-seat-designation.ts`](dm-seat-designation.ts) · tenant [seat-capital-desk](../../docs/harness/tenants/seat-capital-desk.md)                                                                                                                       |
| **Partner ops colors / events** | [`partner-ops-color-kernel.ts`](partner-ops-color-kernel.ts)                      | [`partner-ops-events.ts`](partner-ops-events.ts) · [`partner-ops-glossary.ts`](partner-ops-glossary.ts) · [`partner-notifications.ts`](partner-notifications.ts)                                                                                                          |
| **Catalog research**            | [`catalog-research/`](catalog-research/)                                          | `telegram:catalog:research` · gap → `catalog-enhancements.json`                                                                                                                                                                                                           |
| **Branding / media**            | [`branding.ts`](branding.ts)                                                      | [`partner-visuals.ts`](partner-visuals.ts) · [`package-group-icon.ts`](package-group-icon.ts) · [`telegram-color-kernel.ts`](telegram-color-kernel.ts)                                                                                                                    |
| **ACL / ops views**             | [`ops-acl.ts`](ops-acl.ts)                                                        | [`ops-accounting-view.ts`](ops-accounting-view.ts) · [`daily-finance-report.ts`](daily-finance-report.ts) · [`daily-capacity-report.ts`](daily-capacity-report.ts)                                                                                                        |
| **DOD accounting photos**       | ingest in `ops-bot` / `bot`                                                       | [`../dod/telegram-accounting-ingest.ts`](../dod/telegram-accounting-ingest.ts)                                                                                                                                                                                            |

## Factory webhook commands

| Command         | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `/start link_*` | Link portal account (publishes `telegram_linked` ops-sync) |
| `/start`        | Ops welcome / registration hints                           |
| `/link`         | Portal link instructions                                   |
| `/status`       | Ops tree status, or registry health when not registered    |
| `/accounts`     | Sportsbook accounts                                        |
| `/plays`        | Pending plays + ack status                                 |
| `/tree`         | Downstream network                                         |
| `/register`     | Sub-agent under referral id (binds profile + welcome)      |
| `/registry`     | Factory registry package count                             |
| `/deploy`       | Admin deploy request                                       |
| `/verifydod`    | DOD delivery receipt                                       |

Play messages include inline **Placed / Skip** buttons; acks update
`play_distribution.ack_status`.

## Architecture

```text
Telegram API
    ↓ Pages webhook (functions/api/… → R2 telegram-updates)
    ↓ bun run telegram:ops:consume  (or local OpsTelegramBot long-poll)
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

Long-poll ops bot (needs `OPS_DB_PATH` + token):

```bash
bun -e "import { OpsTelegramBot } from './lib/telegram/ops-bot.ts'; import { loadTelegramEnv } from './lib/telegram/telegram-config.ts'; new OpsTelegramBot({ token: loadTelegramEnv().effectiveToken!, dbPath: 'data/operations.db' }).start()"
```

## Related tenants

| Doc / surface                                                                                    | Role                                      |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| [telegram-factory](../../docs/harness/tenants/telegram-factory.md)                               | Factory bot + consume loop                |
| [seat-capital-desk](../../docs/harness/tenants/seat-capital-desk.md)                             | Pinned Liquidity/Outs desk                |
| [partner-package-group-handshake](../../docs/harness/tenants/partner-package-group-handshake.md) | Package group lifecycle                   |
| [`../channels/outbox.ts`](../channels/outbox.ts)                                                 | Outbox projector + partner welcome events |
