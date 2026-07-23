# Telegram — operations bot

Tree-aware Telegram bot for the sports betting operations platform.

## Commands

| Command | Access | Description |
|---------|--------|-------------|
| `/start` | anyone | Welcome + registration check |
| `/register <ref> <name>` | unregistered | Register as sub-agent |
| `/status` | registered | Accounts, plays placed, P&L |
| `/accounts` | registered | List sportsbook accounts with balances |
| `/plays` | registered | Today's pending plays |
| `/tree` | partner/agent | Downstream tree + liquidity |

## Architecture

```
Telegram API
    ↓ webhook / long-poll
OpsTelegramBot
    ↓ bun:sqlite queries
tree_nodes + plays + sb_accounts tables
```

## Quick start

```ts
import { OpsTelegramBot } from "lib/telegram/ops-bot";

const bot = new OpsTelegramBot({
  token: Bun.env.TELEGRAM_BOT_TOKEN!,
  dbPath: "data/operations.db",
});

bot.start(); // begins long-polling loop
```
