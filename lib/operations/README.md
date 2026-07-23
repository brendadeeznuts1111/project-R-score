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

## Modules (this package)

| Path | Purpose |
|------|---------|
| [`db.ts`](db.ts) | `openOperationsDb` · `DEFAULT_OPS_DB_PATH` (`data/operations.db`) |
| [`schema.ts`](schema.ts) | `initSchema` / `migrateSchema` — core tables + provision + coverage + experiments |
| [`platform-coverage.ts`](platform-coverage.ts) | Platforms, coverage snapshots, `canOfferOnPlatform` |
| [`liquidity.ts`](liquidity.ts) | `ensurePosition`; re-exports offer/capacity helpers |
| [`play-signing.ts`](play-signing.ts) | `Bun.CryptoHasher("sha256")` HMAC play signing |
| [`account-service.ts`](account-service.ts) | Tree nodes, portal sync |
| [`backup.ts`](backup.ts) | DB backup helpers |
| [`index.ts`](index.ts) | Barrel exports |

## Quick start

```ts
import { openOperationsDb } from './db.ts';
import { PlaySigner } from './play-signing.ts';

const db = openOperationsDb({ path: ':memory:' }); // or default data/operations.db
const signer = new PlaySigner();
const play = await signer.publish(
  {
    expertId: 'ex-1',
    sport: 'NBA',
    market: 'totals',
    event: 'LAL vs GSW',
    selection: 'over 225.5',
    odds: -110,
    stakeRecommended: 500,
  },
  db
);
```

## Experiments (factorial C4)

SSOT is **[`lib/experiments/`](../experiments/)** — not a submodule of operations.

| Surface | Path |
|---------|------|
| Engine | [`lib/experiments/`](../experiments/) · `FactorialEngine` |
| Schema hook | `migrateSchema` → `ensureExperimentsSchema` |
| CLI | `bun run ops:experiments --help` → [`tools/ops-experiments.ts`](../../tools/ops-experiments.ts) |
| Docs | [`lib/experiments/README.md`](../experiments/README.md) |
| Skill | [`.agents/skills/ops-dual-mode-experiments/SKILL.md`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md) |

`canOfferOnPlatform(db, platformId, stake, minPct, partnerId?)` honors active
variant coverage floor keys: `min_coverage_pct` · `coverage_floor` ·
`minPlatformCoverage` (`COVERAGE_FLOOR_KEYS` in `lib/experiments/engine.ts`).
