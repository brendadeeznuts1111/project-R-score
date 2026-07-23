# Accounts — storage boundaries

Two account layers serve different runtimes. Do not merge them.

| Layer | SSOT | Runtime | Purpose |
|-------|------|---------|---------|
| **Portal identity** | [`account-r2-store.ts`](account-r2-store.ts) | Cloudflare Pages + R2 | Multi-tenant users (factory / science / tennis), OIDC login, portal roles |
| **Operations tree** | [`../operations/`](../operations/) + `data/operations.db` | Bun host (local/staging) | Partner/agent/sub-agent tree, plays, rails, phones, funding |

## Link key

Portal accounts link to the ops tree via:

- `telegram_user_id` — after link-nonce flow; publishes `ops-sync` channel event for Bun consumer
- `oidc_subject` — on assign (`ops-sync` event) or when `OPS_TREE_SYNC=1` + `OPS_DB_PATH` on Bun host

```bash
bun run ops:sync              # consume R2 ops-sync channel → tree_nodes
bun run ops:reconcile         # rails vs deposits + position refresh
bun run ops:book-reconcile    # sportsbook balance scrape + sb_accounts compare
bun run ops:postgres-probe    # probe OPS_DATABASE_URL / export DDL for migration
bun run ops:automation        # crons: outbox, backup, reconcile, book scrape, sync
```

Book scrape env (Bun host only):

- `OPS_BOOK_SCRAPE_LIVE=1` — run live scrape pass (default: cached balances)
- `OPS_BOOK_SCRAPE_WEBVIEW=1` — open WebView per book (DOM selectors deferred)

Cloudflare edge Functions **cannot** open SQLite. Tree sync runs via R2 queue + Bun consumer, or direct sync when `OPS_DB_PATH` is writable.

## Deprecated import

[`accounts.ts`](accounts.ts) re-exports `AccountService` from `lib/operations/account-service.ts`. Prefer:

```ts
import { AccountService, openOperationsDb } from 'lib/operations';
```

## Portal-only modules

- [`account-r2-store.ts`](account-r2-store.ts) — R2 JSON + indexes
- [`memory-account-store.ts`](memory-account-store.ts) — tests
- [`account-types.ts`](account-types.ts) — portal DTOs + R2 key helpers

## Operations automation

[`automation.ts`](automation.ts) — promotion, liquidity rollup, outbox flush, backup, reconcile, book scrape, ops-sync, rail limits (unified `data/operations.db`).

Play publish runs **guardrails + fraud correlation** (`validatePlayFull`). Settle closed plays via `settlePlay()` to apply cut cascade and liquidity adjustments.
