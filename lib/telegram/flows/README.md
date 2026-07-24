# Telegram flow cards

Input → handler → `FlowOutput` → `deliverFlowOutput` (send or edit + inline keyboard).

## Layout

```text
lib/telegram/flows/
  types.ts           FlowInput / FlowOutput / KeyboardSpec
  i18n.ts            en / es label keys
  keyboards.ts       translateKeyboard · playAckKeyboard · f:* callbacks
  balances-snapshot.ts  read-only Soft / hard (TOC-aligned)
  registry.ts        runFlow · commandToFlowId
  deliver.ts         sendMessage / editMessageText
  callbacks.ts       play:* + f:* router
  media.ts           ops_chat_media per chat_id
  cards/             menu · status · balances · accounts · plays · tree · welcome
```

## Callback contract

| Pattern | Example |
|---------|---------|
| `f:menu` | Open menu card |
| `f:balances:r` | Refresh balances (edit in place) |
| `play:{id}:{node}:placed` | Play ack (existing) |

## Rules

- **Read-only** — no Soft post or task transitions from buttons
- **i18n** — keyboard labels via `textKey`, never hardcoded English in builders
- **Slash sync** — `/status` and `f:status` share the same card handler

## Wire points

- [`ops-bot.ts`](../ops-bot.ts) — long-poll; full keyboards + edit
- [`ops-commands.ts`](../ops-commands.ts) — webhook text fallback (`flowOutputToPlainText`)
- [`bot.ts`](../bot.ts) — factory webhook callbacks
- [`outbox.ts`](../../channels/outbox.ts) — `playAckReplyMarkup` → `playAckKeyboard`

## Related

- [`docs/harness/tenants/telegram-factory.md`](../../../docs/harness/tenants/telegram-factory.md)
