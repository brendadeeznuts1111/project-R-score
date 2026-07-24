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
- [`lib/channels/outbox.ts`](../channels/outbox.ts) — `enqueuePartnerWelcomeEvent`, play inline keyboard
- [`templates/`](templates/) — `renderForNode` · TemplateId pack
