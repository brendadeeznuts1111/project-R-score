# Telegram — operations + factory portal bot

Tree-aware Telegram integration for the sports betting operations platform and multi-tenant portal webhook.

## Modules

| Module | Role |
|--------|------|
| `ops-bot.ts` | Long-polling `OpsTelegramBot` (direct SQLite) |
| `bot.ts` | Pages webhook router (`TelegramBot`, factory/science/tennis) |
| `ops-bridge.ts` | Edge webhook → SQLite or R2 `telegram-commands` queue |
| `ops-commands.ts` | Pure ops command handlers shared by bridge + consumer |
| `play-callback.ts` | Inline keyboard ack (`play:{id}:{node}:placed\|skip`) |
| `telegram-api.ts` | Bot API helpers (`setMyCommands`, `answerCallbackQuery`) |

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
    ↓ webhook (Pages) or long-poll (OpsTelegramBot)
TelegramBot / OpsTelegramBot / ops-bridge
    ↓ dispatchOpsCommand / handlePlayCallback
tree_nodes + play_distribution + ops_channel_outbox
    ↓ processChannelOutbox
Telegram sendMessage (plays, partner.welcome)
```

## Quick start

```bash
# Factory bot menu + webhook
bun run telegram:factory:setup

# Drain R2-queued ops commands (edge path)
bun run telegram:ops:consume

# Long-poll ops bot (Bun host with OPS_DB_PATH)
bun -e "import { OpsTelegramBot } from './lib/telegram/ops-bot.ts'; new OpsTelegramBot({ token: Bun.env.TELEGRAM_BOT_TOKEN!, dbPath: 'data/operations.db' }).start()"
```

## Related

- [`docs/harness/tenants/partner-onboarding-package.md`](../../docs/harness/tenants/partner-onboarding-package.md)
- [`lib/channels/outbox.ts`](../channels/outbox.ts) — `enqueuePartnerWelcomeEvent`, play inline keyboard
