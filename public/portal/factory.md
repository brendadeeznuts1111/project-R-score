# Factory Telegram · bot wire · handshake

Tenant ops board for **`@factorywager_bot`** — webhook, package-group wire,
handshake readiness. **Chats · plays · balances · bets · accounting** map:
[telegram.md](./telegram.md).

| Artifact | Path / command |
|----------|----------------|
| Board | [`/portal/factory/`](./factory/) |
| Handshake bake | `/registry/telegram-handshake.json` · `bun run telegram:handshake:catalog` |
| Catalog | `/registry/telegram-handshake-catalog.json` |
| Bot verify | `bun run telegram:verify` |
| Tenant registry | `/registry/factory/registry.json` |
| Webhook | `/api/telegram/webhook/factory` |
| Tenant doc | [`docs/harness/tenants/telegram-factory.md`](../../docs/harness/tenants/telegram-factory.md) |
| Handshake runbook | [`docs/harness/tenants/partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md) |

## Partner package forum topics (every CODE)

| Topic | Role |
|-------|------|
| General | Implicit thread |
| Ops | House ops |
| Alerts | Outbox alerts |
| **Liquidity/Outs** | Seat capital desk · rails · **max bet** · freeplay · FUND |
| **Accounting** | Deposit / withdraw / **bet-slip** proof |

Ensure topics: `bun run telegram:package-group:enhance CODE --ensure-topics`.

## Related boards

| Board | Why |
|-------|-----|
| [Partners](./partners/) | Package groups · Soft plays/weeks · deposits · accounting deals · outs |
| [Ops](./ops/) | Handshake gaps · seat incomplete · outbox pending |
| [Account](./account/) | Per-account Soft accounting chrome |
| [Telegram map](./telegram.md) | Full chat grammar · house surfaces · CLI day loop |

## CLI

```bash
bun run telegram:verify
bun run telegram:factory:setup
bun run telegram:ops:consume
bun run telegram:handshake:catalog
bun run telegram:handshake:readiness --deep
bun run telegram:handshake:invite-gap
```
