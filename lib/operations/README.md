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
| [`schema.ts`](schema.ts) | `initSchema` / `migrateSchema` — core + provision + coverage + experiments + prediction |
| [`ops-summary.ts`](ops-summary.ts) | Portal/Pages summary payload (`buildOpsSummary`) |
| [`platform-coverage.ts`](platform-coverage.ts) | Platforms, coverage snapshots, `canOfferOnPlatform` |
| [`liquidity.ts`](liquidity.ts) | `ensurePosition` · `reservePlay` / `releasePlay` · coverage-gated reserve |
| [`play-signing.ts`](play-signing.ts) | `Bun.CryptoHasher("sha256")` HMAC play signing |
| [`play-settlement.ts`](play-settlement.ts) | Settle play — per-node liquidity + `play.settled` outbox fan-out + experiment outcomes |
| [`ops-settle-batch.ts`](ops-settle-batch.ts) | Batch settle pending distributed plays + drain outbox |
| [`ops-loop-metrics.ts`](ops-loop-metrics.ts) | Row-aligned `loopCompletionRate` + CE/LE/RP proxies |
| [`ops-loop-gate-backfill.ts`](ops-loop-gate-backfill.ts) | Legacy gate + settle outbox attribution |
| [`ops-loop-fixture.ts`](ops-loop-fixture.ts) | Single- + multi-node throughput fixtures |
| [`snapshot-cron.ts`](snapshot-cron.ts) | In-process cron: snapshot · sync · settle |
| [`play-dispatcher.ts`](play-dispatcher.ts) | Publish + gate + reserve + Telegram outbox |
| [`account-service.ts`](account-service.ts) | Tree nodes, portal sync |
| [`cut-engine.ts`](cut-engine.ts) | Cut cascade allocations |
| [`backup.ts`](backup.ts) | DB backup helpers |
| [`index.ts`](index.ts) | Barrel exports |

Prove loop: `bun run ops:settle` · `ops:outbox:requeue` · `bun test tests/ops-loop-hardening.test.ts` · tenant [`docs/harness/tenants/ops-loop-throughput.md`](../../docs/harness/tenants/ops-loop-throughput.md).

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

Env: `OPS_DB_PATH` overrides the default DB path.

## Adjacent packages (not under this directory)

| Package | Role | CLI |
|---------|------|-----|
| [`lib/experiments/`](../experiments/) | Factorial partner-policy experiments (C4) | `bun run ops:experiments` |
| [`lib/prediction/`](../prediction/) | Coverage prediction backtest (C5) | `bun run ops:prediction` |
| [`lib/provisioning/`](../provisioning/) | Manual / automated_test queue | `bun run ops:provision-queue` |

Skill (lanes + prove): [`.agents/skills/ops-dual-mode-experiments/SKILL.md`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md).

### Coverage floors (experiments → offer gate)

`canOfferOnPlatform(db, platformId, stake, minPct, partnerId?)` and
`reservePlay(..., { checkCoverage: true })` honor active variant keys:

`min_coverage_pct` · `coverage_floor` · `minPlatformCoverage`

(`COVERAGE_FLOOR_KEYS` in [`lib/experiments/engine.ts`](../experiments/engine.ts)).

## Portal + Cloudflare Pages + local API

**One payload:** `buildOpsSummary` → `OpsSummaryPayload` (experiments C4 + prediction C5).

| Surface | Endpoint | Source |
|---------|----------|--------|
| Local portal | `bun run serve:public` → `/api/operations/summary` | **Live** SQLite (`source: "live"`) |
| Local static fallback | `/registry/ops-summary.json` | File from last `ops:snapshot` |
| Pages Function | `/api/operations/summary` | Snapshot via ASSETS (Workers have no bun:sqlite) |
| Pages static | `/registry/ops-summary.json` | Same file |
| Builder SSOT | [`ops-summary.ts`](ops-summary.ts) | Used by live local + `ops:snapshot` |

```bash
# Local (aligned live API)
bun run serve:public
# open http://localhost:3000/portal/ops/
# curl  http://localhost:3000/api/operations/summary

# Before Pages deploy (freeze live → static)
bun run ops:snapshot   # → public/registry/ops-summary.json + prediction/*
```

### Invocation (`bun run` vs `bunx`)

Monorepo scripts prefer **`bun run ops:*`**. Package `bin` entries also allow **bunx**
([docs](https://bun.com/docs/pm/bunx)):

| Style | Example |
|-------|---------|
| Script (default) | `bun run ops:prediction report --webview` |
| Direct file | `bun tools/ops-prediction.ts report --webview` |
| bunx + bin | `bunx --bun ops-prediction report --webview` |

Per bunx rules: place **`--bun` before** the binary name so shebangs run under Bun;
flags **after** the name (`report`, `--webview`) pass through to the tool.
## Prove (ops SSOT)

```bash
bun test tests/operations-schema.test.ts tests/ops-summary.test.ts
bun test tests/experiments-*.test.ts tests/prediction-*.test.ts
bun run ops:experiments --help
bun run ops:prediction --help
bun run ops:snapshot --out /tmp/ops-summary.json
bun run serve:public   # local live /api/operations/summary
```
