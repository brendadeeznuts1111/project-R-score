# Telegram factory bot — env, API, rate limits

Harness tenant doc for the **factory** Telegram integration (`@factorywager_bot`). Code SSOT: [`lib/telegram/telegram-config.ts`](../../../lib/telegram/telegram-config.ts) · [`lib/telegram/telegram-api.ts`](../../../lib/telegram/telegram-api.ts).

## Prerequisites (before consume / welcome drain)

| Step | Command / env | Notes |
|------|----------------|-------|
| 1. Bot token | `TELEGRAM_BOT_FACTORY` in `.env` or `~/.reasonix/.env` | Create via [@BotFather](https://t.me/BotFather); never commit |
| 2. Verify | `bun run telegram:verify` | Calls `getMe` + `getWebhookInfo` |
| 2b. Discover | `bun run telegram:discover` | Bot API inventory + `ops_telegram_known_chats` (learned from updates) |
| 3. Webhook + menu | `bun run telegram:factory:setup` | `setMyCommands` + `setWebhook` → Pages `/api/telegram/webhook/factory` (R2 enqueue; see Architecture) |
| 3b. Drain updates | `bun run telegram:ops:consume` | Processes R2 `telegram-updates` + `telegram-commands` + outbox |
| 4. Linked seats | `/start link_<nonce>` or `bun tools/telegram-link-chat.ts ASH-001 tg:chat:…` | Sets `tree_nodes.telegram_id` + `ChatChannelMeta`; CLI also enqueues `partner.welcome` when a profile binding exists (`--no-welcome` to skip) |
| 5. Drain | `bun run telegram:ops:consume` | R2 command queue + `ops_channel_outbox` projectors (HTML templates) |
| 5b. Dry-run drain | `bun run telegram:ops:consume -- --dry-run` | Queue + outbox counts only |

**Full identity integration** (cellphone → profile → seat → ChatChannelMeta → HTML templates): [`partner-onboarding-package.md`](partner-onboarding-package.md).

Transport health API: [`lib/telegram/telegram-transport-health.ts`](../../../lib/telegram/telegram-transport-health.ts) · `bun run telegram:verify -- --json`

## Known chats (self-learning)

Bot API has no membership list. On each drained update, Bun upserts `chat.id` into `ops_telegram_known_chats` (`lib/telegram/known-chats.ts`) from `message`, `callback_query`, and `my_chat_member`. Leave/kick sets `active=0`. Webhook `allowed_updates` includes `my_chat_member` via `telegram:factory:setup`.

## Partner message path (deep)

```text
renderForNode(templateId, treeNodeId)
  → HTML + KeyboardSpec (textKey → locale)
  → outbox payload (partner.welcome / partner.onboard.complete)
  → processChannelOutbox → sendTelegramBotMessage (parseMode HTML + replyMarkup)

Flow cards (welcome / balances / status) call the same renderForNode.
ChatChannelMeta (ops_chat_channel_meta) holds callSigns · topics · lastTemplateIds.
```

Templates SSOT: [`lib/telegram/templates/`](../../../lib/telegram/templates/) · link CLI: `bun run telegram:link-chat`

## Environment variables

Token SSOT: [`loadTelegramEnv()`](../../../lib/telegram/telegram-config.ts) → `effectiveToken = TELEGRAM_BOT_FACTORY ?? TELEGRAM_BOT_TOKEN`. Prefer FACTORY; legacy TOKEN remains for older hosts.

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_FACTORY` | Yes (or legacy `TELEGRAM_BOT_TOKEN`) | Factory tenant token — [`config/tenants.ts`](../../../config/tenants.ts) |
| `TELEGRAM_WEBHOOK_SECRET` | Required on Pages | Same value in local `.env` + Pages Variables/Secrets (prod+preview). Without it the edge webhook returns **503**. Redeploy after setting. |
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
| `setWebhook` | `tools/telegram-bot-setup.ts` | Webhook URL → Pages edge enqueue |

Canonical API reference: [Telegram Bot API](https://core.telegram.org/bots/api).

## Architecture

**Deploy plane (Pages):** [`functions/api/telegram/webhook/[[tenant]].ts`](../../../functions/api/telegram/webhook/[[tenant]].ts) → [`lib/telegram/webhook-pages.ts`](../../../lib/telegram/webhook-pages.ts) — edge-safe R2 enqueue to topic `telegram-updates` (no `bun:sqlite`). Bun [`telegram:ops:consume`](../../../tools/telegram-ops-consumer.ts) drains updates with full [`bot.ts`](../../../lib/telegram/bot.ts).

**Local Bun plane:** [`functions-bun-only/api/telegram/webhook/[[tenant]].ts`](../../../functions-bun-only/api/telegram/webhook/[[tenant]].ts) keeps sync handling for low-latency local/dev (see [`docs/platform-routing.md`](../../platform-routing.md)).

```text
Telegram → Pages webhook (await R2 publish, then 200 — retries on failure)
         → R2 channels/telegram-updates
         → bun run telegram:ops:consume (poison updates skipped; cursor advances)
         → lib/telegram/bot.ts → deliverFlowOutput (HTML + keyboards; /start included)

Outbox → processChannelOutbox → sendTelegramBotMessage (rate-limited)
       → DM: payload.telegramId
       → Group: TELEGRAM_OPS_CHAT_ID + TELEGRAM_TOPICS thread
       → projectorBackend r2|memory (ops-summary loop slice)
```

Long-poll [`lib/telegram/ops-bot.ts`](../../../lib/telegram/ops-bot.ts) is **dev fallback** only when `OPS_DB_PATH` is local.

## Related

- [`lib/telegram/README.md`](../../../lib/telegram/README.md)
- [`partner-onboarding-package.md`](partner-onboarding-package.md)
- [`ops-partner-bridge.md`](ops-partner-bridge.md)
