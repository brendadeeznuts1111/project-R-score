# Telegram — operations + factory portal bot

Tree-aware Telegram integration for the sports betting operations platform and multi-tenant portal webhook.

## Modules

| Module | Role |
|--------|------|
| `ops-bot.ts` | Long-polling `OpsTelegramBot` (direct SQLite) |
| `bot.ts` | Bun command router (`TelegramBot`, factory/science/tennis) |
| `webhook-pages.ts` | Pages edge enqueue → R2 `telegram-updates` (no bun:sqlite) |
| `telegram-update.ts` | Edge-safe TelegramUpdate wire types |
| `ops-bridge.ts` | Bun webhook → SQLite or R2 `telegram-commands` queue |
| `ops-commands.ts` | Pure ops command handlers shared by bridge + consumer |
| `play-callback.ts` | Inline keyboard ack (`play:{id}:{node}:placed\|skip`) |
| `flows/` | Flow cards — menu, balances, i18n keyboards, callbacks ([`flows/README.md`](flows/README.md)) |
| `templates/` | Message template pack + `renderForNode` (HTML · keyboards) |
| `flows/channel-meta.ts` | `ChatChannelMeta` store · `linkTelegramChat` |
| `telegram-config.ts` | Env SSOT — `loadTelegramEnv()` / `effectiveToken` (FACTORY → TOKEN) · topics |
| `telegram-transport-health.ts` | `getMe` + webhook probe for `telegram:verify` |
| `telegram-discovery.ts` | Granular Bot API + known-chats inventory (`telegram:discover`) |
| `known-chats.ts` | Self-learning `ops_telegram_known_chats` from updates |
| `broadcast.ts` | Send-to-known-chats + `ops_broadcast_log` |
| `surfaces.ts` | Concern separation SSOT · naming · outbox chat routing |
| `surface-graph.ts` | Live topology ASCII / mermaid / env suggest |
| `surface-audit.ts` | Title · binding · ACL · routing audit |
| `package-group-registry.ts` | Partner package forum registry + pending JSONL |
| `package-group-forum.ts` | Forum metadata SSOT · `reports/telegram/forums/{CODE}.json` |
| `handshake-ref.ts` | Partner code / call-sign regex SSOT for package-group CLIs |
| `handshake-desk.ts` | Unified desk rows (registry + known chats + verify) |
| `handshake-readiness.ts` | Phased readiness gates + forum invite-gap filter |
| `handshake-lanes.ts` | Deep per-lane audit (forum / audit / routing / operator) |
| `dm-seat-designation.ts` | DM seat designate / assess (`none` · `designated` · `linked` · `shared`) |
| `package-group-membership.ts` | Member-count tell (`2·house`, `2·house!`, `3·OK`, `N·ext`) |
| `verify-package-group-handshake.ts` | JSONL + registry + forum metadata lifecycle checks |
| `ops-acl.ts` | In-chat ACL — `/register` DM-only · `/deploy` ops-admin |
| `branding.ts` | TOC Ops profile (Bun.Image) · group titles/photos · forum topics |
| `refresh-known-chats.ts` | `getChat` / member-count refresh for directory |
| `telegram-api.ts` | `sendTelegramBotMessage` · `editTelegramMessage` · `setMyCommands` · `answerCallbackQuery` (rate-limited + 429 retry) |

## Factory webhook commands

| Command | Description |
|---------|-------------|
| `/start link_*` | Link portal account (publishes `telegram_linked` ops-sync) |
| `/start` | Ops welcome / registration hints |
| `/link` | Portal link instructions |
| `/status` | Ops tree status, or registry health when not registered |
| `/accounts` | Sportsbook accounts |
| `/plays` | Pending plays + ack status |
| `/tree` | Downstream network |
| `/register` | Sub-agent under referral id (binds profile + welcome) |
| `/registry` | Factory registry package count |
| `/deploy` | Admin deploy request |
| `/verifydod` | DOD delivery receipt |

Play messages include inline **Placed / Skip** buttons; acks update `play_distribution.ack_status`.

## Architecture

```text
Telegram API
    ↓ Pages webhook (functions/api/… → R2 telegram-updates)
    ↓ bun run telegram:ops:consume  (or local bun-only sync / OpsTelegramBot long-poll)
TelegramBot / OpsTelegramBot / ops-bridge
    ↓ dispatchOpsCommand / handlePlayCallback
tree_nodes + play_distribution + ops_channel_outbox
    ↓ processChannelOutbox (projectorBackend r2|memory)
Telegram sendMessage (plays, partner.welcome HTML templates)
```

Tenant runbook: [`docs/harness/tenants/telegram-factory.md`](../../docs/harness/tenants/telegram-factory.md).

## Quick start

```bash
# Token + webhook probe
bun run telegram:verify

# Known chats + Bot API inventory
bun run telegram:discover
bun run telegram:ops -- directory --refresh
bun run telegram:ops -- directory --rich
bun run telegram:brand -- --matrix          # concern matrix + naming
bun run telegram:brand -- --groups
bun run telegram:ops -- surfaces
bun run telegram:ops -- graph                 # live ASCII topology
bun run telegram:ops -- graph --mermaid       # mermaid for docs
bun run telegram:ops -- graph --env           # suggested TELEGRAM_SURFACES
# Parallel lanes (artifacts → reports/telegram/)
bun run telegram:surfaces:discover -- --refresh --stdout
bun run telegram:surfaces:audit -- --stdout
bun run telegram:surfaces:map -- --stdout
bun run telegram:surfaces:pipeline -- --refresh   # sequential all-three
bun tools/onboard-partner-package.ts ASH-001 --create-package-group
bun run telegram:ops -- link-package-group ASH -1003937534779 --invite 'https://t.me/+…'
bun run telegram:ops -- directory --surface ash-staging
bun run telegram:ops -- send --surface sandbox --all --preview "hello {{title}}"

# Factory bot menu + webhook
bun run telegram:factory:setup

# Explicit chat bind (ChatChannelMeta — never invent ids)
bun tools/telegram-link-chat.ts ASH-001 tg:chat:-100…

# Drain R2 telegram-updates + commands + outbox (Pages path)
bun run telegram:ops:consume

# Long-poll ops bot (Bun host with OPS_DB_PATH)
bun -e "import { OpsTelegramBot } from './lib/telegram/ops-bot.ts'; import { loadTelegramEnv } from './lib/telegram/telegram-config.ts'; new OpsTelegramBot({ token: loadTelegramEnv().effectiveToken!, dbPath: 'data/operations.db' }).start()"
```

## Related

- [`docs/harness/tenants/partner-onboarding-package.md`](../../docs/harness/tenants/partner-onboarding-package.md)
- [`docs/harness/tenants/partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md) — factory ↔ ct handshake · readiness · desk · designate-dm-seat
- [`lib/channels/outbox.ts`](../channels/outbox.ts) — `enqueuePartnerWelcomeEvent`, play inline keyboard
- [`templates/`](templates/) — `renderForNode` · TemplateId pack
