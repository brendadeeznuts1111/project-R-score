# Operations — sports betting platform

Tree-structured agent management with HMAC-signed play distribution.

## Entities

| Entity | Role |
|--------|------|
| Operations | Platform operator — funding, infrastructure |
| Expert | Person with edge in a sport/market, generates plays |
| Partner | Agent who grew to manage their own down-tree |
| Agent | Manages sportsbook accounts, places bets |
| Sub-agent | Downstream of agent/partner, Telegram-delivered plays |
| Rail | Funding channel (PayPal, Venmo, CashApp, wire) |
| Play | HMAC-signed wager recommendation from expert |

## Modules

| File | Purpose |
|------|---------|
| `schema.ts` | `bun:sqlite` schema — 9 tables with recursive CTE support |
| `play-signing.ts` | `Bun.CryptoHasher("sha256")` HMAC signing + fan-out distribution |
| `index.ts` | Barrel exports |

## Quick start

```ts
import { Database } from "bun:sqlite";
import { initSchema, PlaySigner } from "lib/operations";

const db = new Database("ops.db");
initSchema(db);

const signer = new PlaySigner();
const play = await signer.publish({
  expertId: "ex-1",
  sport: "NBA",
  market: "totals",
  event: "LAL vs GSW",
  selection: "over 225.5",
  odds: -110,
  stakeRecommended: 500,
}, db);
```
