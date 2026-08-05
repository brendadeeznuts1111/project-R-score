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
| **Accounting** | Deposit / withdraw / **bet-slip** proof (amount confirm with [DOD](./dod.md)) |

Ensure topics: `bun run telegram:package-group:enhance CODE --ensure-topics`.
Accounting bootstrap: `bun run telegram:package-group:accounting`.

## House surfaces (ops only)

Do not pin partner forum titles onto house groups.

| Slug | Topics (summary) |
|------|------------------|
| `hq` | alerts · day-ops · aar · identity — outbox **`dod`** lands here |
| `ash-staging` | plays · balances · onboard · alerts |
| `all-accounting` | Deposits · Withdrawals · Reconcile |

Bind via `TELEGRAM_SURFACES` JSON · fallback `TELEGRAM_OPS_CHAT_ID`. Full
grammar: [telegram.md](./telegram.md).

## Related boards

| Board | Why |
|-------|-----|
| [Partners](./partners/) · [partners.md](./partners.md) | Package groups · Soft · deposits · accounting deals · outs |
| [Ops](./ops/) · [ops.md](./ops.md) | Handshake gaps · seat incomplete · outbox pending |
| [DOD](./dod/) · [dod.md](./dod.md) | Image proofs (Bun.Image · R2) · confirm amounts in Accounting |
| [Limits](./limits/) · [limits.md](./limits.md) | Multi-factor raises · coverage % |
| [Bookmakers](./bookmakers/) · [bookmakers.md](./bookmakers.md) | Registry `id === slug` · `fetcher` · `urls.web` · desk coverage |
| [Account](./account/) | Per-account Soft accounting chrome |
| [Telegram map](./telegram.md) | Full chat grammar · house surfaces · CLI day loop |
| [Routing audit](./routing.md) | Pages vs local webhook / API |

## CLI

```bash
bun run telegram:verify
bun run telegram:factory:setup
bun run telegram:discover
bun run telegram:ops:consume
bun run telegram:handshake:catalog
bun run telegram:handshake:readiness --deep
bun run telegram:handshake:invite-gap
bun run telegram:package-group:enhance CODE --ensure-topics
bun run telegram:package-group:accounting
bun run ops:snapshot --no-seed
```

## Failure paths

| Symptom | Fix |
|---------|-----|
| Webhook 503 | Set `TELEGRAM_WEBHOOK_SECRET` on Pages + local · redeploy |
| Invite gap `2·house!` | `telegram:handshake:invite-gap` · send invite · partner joins |
| Missing Accounting / Liquidity topics | `telegram:package-group:enhance CODE --ensure-topics` (Manage Topics) |
| Handshake board stale | `telegram:handshake:catalog` · `ops:snapshot --no-seed` |
| DOD outbox not in partner chat | Expected — route `dod` → house **`hq`**; confirm in package Accounting |

Docs: [`telegram-factory.md`](../../docs/harness/tenants/telegram-factory.md) ·
[`partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md) ·
[`seat-capital-desk.md`](../../docs/harness/tenants/seat-capital-desk.md).
