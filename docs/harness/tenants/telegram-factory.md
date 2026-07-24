# Telegram factory bot — env, API, rate limits

Harness tenant doc for the **factory** Telegram integration (`@factorywager_bot`). Code SSOT: [`lib/telegram/telegram-config.ts`](../../../lib/telegram/telegram-config.ts) · [`lib/telegram/telegram-api.ts`](../../../lib/telegram/telegram-api.ts).

## Prerequisites (before consume / welcome drain)

| Step | Command / env | Notes |
|------|----------------|-------|
| 1. Bot token | `TELEGRAM_BOT_FACTORY` in `.env` or `~/.reasonix/.env` | Create via [@BotFather](https://t.me/BotFather); never commit |
| 2. Verify | `bun run telegram:verify` | Calls `getMe` + `getWebhookInfo` |
| 3. Webhook + menu | `bun run telegram:factory:setup` | `setMyCommands` + `setWebhook` → Pages |
| 4. Linked seats | `/start link_<nonce>` on factory bot | Sets `tree_nodes.telegram_id` — **never invent chat ids** |
| 5. Drain | `bun run telegram:ops:consume` | R2 command queue + `ops_channel_outbox` projectors |
| 5b. Dry-run drain | `bun run telegram:ops:consume -- --dry-run` | Queue + outbox counts only |

Partner onboard checklist: [`partner-onboarding-package.md`](partner-onboarding-package.md).

Transport health API: [`lib/telegram/telegram-transport-health.ts`](../../../lib/telegram/telegram-transport-health.ts) · `bun run telegram:verify -- --json`

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_FACTORY` | Yes (or legacy `TELEGRAM_BOT_TOKEN`) | Factory tenant token — [`config/tenants.ts`](../../../config/tenants.ts) |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | `secret_token` on webhook registration |
| `TELEGRAM_OPS_CHAT_ID` | For group alerts | Supergroup id when outbox row has no `telegramId` |
| `TELEGRAM_TOPICS` | For forum threads | JSON map → `message_thread_id` (see below) |
| `TELEGRAM_RATE_LIMIT_MIN_INTERVAL_MS` | Optional | Default `34` (~29 msg/s; Telegram ~30/s) |

Science / tennis tenants use `TELEGRAM_BOT_SCIENCE` / `TELEGRAM_BOT_TENNIS` (same pattern).

## Forum topics (`TELEGRAM_TOPICS`)

For supergroups with **Topics** enabled, route group posts to the correct thread:

```json
{"ops": 2, "alerts": 5, "toc": 8, "plays": 3, "welcome": 0}
```

- **DMs** (`partner.welcome`, play ack to `tree_nodes.telegram_id`) — no thread id.
- **Group fallback** — when payload lacks `telegramId`, projector uses `TELEGRAM_OPS_CHAT_ID` + thread from outbox `topic` / `event_type` via [`threadIdForOutboxTopic`](../../../lib/telegram/telegram-config.ts).

Payload overrides: `messageThreadId` or `message_thread_id` on outbox JSON.

## Rate limiting

All `sendMessage` calls go through [`sendTelegramBotMessage`](../../../lib/telegram/telegram-api.ts):

- Per-token minimum interval (default 34 ms).
- On HTTP 429 / `error_code: 429`, waits `retry_after` seconds and retries once.

No rate limiter on `getMe` / webhook setup (infrequent).

## Bot API surface (this repo)

| Method | Module | Used for |
|--------|--------|----------|
| `sendMessage` | `telegram-api.ts` | Outbox projector, webhook replies, consumer |
| `answerCallbackQuery` | `telegram-api.ts` | Play inline keyboard ack |
| `setMyCommands` | `telegram-api.ts` | `telegram:factory:setup` |
| `getMe` | `telegram-api.ts` | `telegram:verify` |
| `getWebhookInfo` | `telegram-api.ts` | `telegram:verify` |
| `setWebhook` | `tools/telegram-bot-setup.ts` | Pages edge URL |

Canonical API reference: [Telegram Bot API](https://core.telegram.org/bots/api).

## Architecture

```text
Telegram → Pages webhook (functions-bun-only/api/telegram/webhook/[[tenant]].ts)
         → lib/telegram/bot.ts (commands + link nonce)
         → ops-bridge / ops-commands (SQLite or R2 queue)

Outbox → processChannelOutbox → sendTelegramBotMessage (rate-limited)
       → DM: payload.telegramId
       → Group: TELEGRAM_OPS_CHAT_ID + TELEGRAM_TOPICS thread
```

Long-poll [`lib/telegram/ops-bot.ts`](../../../lib/telegram/ops-bot.ts) is **dev fallback** only when `OPS_DB_PATH` is local.

## Related

- [`lib/telegram/README.md`](../../../lib/telegram/README.md)
- [`partner-onboarding-package.md`](partner-onboarding-package.md)
- [`ops-partner-bridge.md`](ops-partner-bridge.md)
