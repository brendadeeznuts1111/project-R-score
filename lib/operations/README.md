# Operations — sports betting platform

Tree-structured agent management with HMAC-signed play distribution.

**Scale:** ~27k lines · ~96 `.ts` files (largest `lib/` domain). Use the **Area
map** below before opening random files. Inventory SSOT for all domains:
[`../README.md`](../README.md).

**Coupling (lib graph):** heavy with [`../telegram/`](../telegram/),
[`../channels/`](../channels/), [`../types/`](../types/),
[`../toc-ops/`](../toc-ops/), [`../partner-profile/`](../partner-profile/),
[`../prediction/`](../prediction/).

## Area map

| Area                     | Start here                                                                                                | Also                                                                                                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DB + schema**          | [`db.ts`](db.ts) · [`schema.ts`](schema.ts)                                                               | [`backup.ts`](backup.ts) · [`postgres-bridge.ts`](postgres-bridge.ts)                                                                                                                                                                           |
| **Play loop**            | [`play-dispatcher.ts`](play-dispatcher.ts) · [`play-signing.ts`](play-signing.ts)                         | [`play-settlement.ts`](play-settlement.ts) · [`play-validation.ts`](play-validation.ts) · [`ops-settle-batch.ts`](ops-settle-batch.ts) · [`liquidity.ts`](liquidity.ts) · [`cut-engine.ts`](cut-engine.ts)                                      |
| **Ops loop throughput**  | [`ops-loop-metrics.ts`](ops-loop-metrics.ts)                                                              | [`ops-loop-fixture.ts`](ops-loop-fixture.ts) · [`ops-loop-gate-backfill.ts`](ops-loop-gate-backfill.ts) · tenant [ops-loop-throughput](../../docs/harness/tenants/ops-loop-throughput.md)                                                       |
| **Summary / portal**     | [`ops-summary.ts`](ops-summary.ts)                                                                        | [`ops-summary-diagnose.ts`](ops-summary-diagnose.ts) · [`ops-sync.ts`](ops-sync.ts) · [`portal-snapshot-cron.ts`](portal-snapshot-cron.ts) · [`snapshot-cron.ts`](snapshot-cron.ts)                                                             |
| **Accounts / tree**      | [`account-service.ts`](account-service.ts)                                                                | [`account-limit-profiles.ts`](account-limit-profiles.ts) · [`account-dossier-seed.ts`](account-dossier-seed.ts)                                                                                                                                 |
| **Partner onboard**      | [`partner-onboarding.ts`](partner-onboarding.ts)                                                          | [`partner-onboard-package.ts`](partner-onboard-package.ts) · [`partner-profile-bridge.ts`](partner-profile-bridge.ts) · [`partner-profile-seed.ts`](partner-profile-seed.ts) · [`partner-compliance-onboard.ts`](partner-compliance-onboard.ts) |
| **Limits / raises**      | [`limit-raise-agent-api.ts`](limit-raise-agent-api.ts) · [`limit-raise-report.ts`](limit-raise-report.ts) | [`limit-patterns.ts`](limit-patterns.ts) · [`partner-analytics-repo.ts`](partner-analytics-repo.ts) · [`limits/`](limits/) · [partner-limits](../../docs/harness/tenants/partner-limits.md)                                                     |
| **Coverage / liquidity** | [`platform-coverage.ts`](platform-coverage.ts)                                                            | [`coverage-analytics.ts`](coverage-analytics.ts) · [`liquidity.ts`](liquidity.ts) · [`rail-limits.ts`](rail-limits.ts)                                                                                                                          |
| **State compliance**     | [`state-regulation.ts`](state-regulation.ts) · [`state-compliance-http.ts`](state-compliance-http.ts)     | [`compliance-policy-kpis.ts`](compliance-policy-kpis.ts) · [`regulation-policy-catalog.ts`](regulation-policy-catalog.ts) · [`fraud-guard.ts`](fraud-guard.ts)                                                                                  |
| **Baselines / books**    | [`baseline-scraped-limits.ts`](baseline-scraped-limits.ts)                                                | [`baseline-sportsbook-policies.ts`](baseline-sportsbook-policies.ts) · [`book-reconcile.ts`](book-reconcile.ts) · [`sportsbook-opening-baseline.ts`](sportsbook-opening-baseline.ts)                                                            |
| **Scrapers**             | [`scrapers/README.md`](scrapers/README.md)                                                                | [`scrapers/books/`](scrapers/books/) · [`scrapers/run-book-agent.ts`](scrapers/run-book-agent.ts) · `config/scrape-agents.toml`                                                                                                                 |
| **TOC bridge**           | [`toc-ops-seed.ts`](toc-ops-seed.ts)                                                                      | [`toc-identity-bridge.ts`](toc-identity-bridge.ts) · [`toc-soft-balance.ts`](toc-soft-balance.ts) · [`toc-play-routing.ts`](toc-play-routing.ts) · [`../toc-ops/`](../toc-ops/)                                                                 |
| **Seeds / fixtures**     | [`ops-seed.ts`](ops-seed.ts)                                                                              | [`dod-seed.ts`](dod-seed.ts) · [`prediction-seed.ts`](prediction-seed.ts) · [`tenant-registry-seed.ts`](tenant-registry-seed.ts) · catalogs under `sports-*.ts`                                                                                 |
| **Barrel**               | [`index.ts`](index.ts)                                                                                    | Prefer direct imports for tree-shaking clarity                                                                                                                                                                                                  |

## Entities

| Entity     | Role                                                  |
| ---------- | ----------------------------------------------------- |
| Operations | Platform operator — funding, infrastructure           |
| Expert     | Person with edge in a sport/market, generates plays   |
| Partner    | Agent who grew to manage their own down-tree          |
| Agent      | Manages sportsbook accounts, places bets              |
| Sub-agent  | Downstream of agent/partner, Telegram-delivered plays |
| Rail       | Funding channel (PayPal, Venmo, CashApp, wire)        |
| Play       | HMAC-signed wager recommendation from expert          |

## Prove / tenants

| Concern               | Command / doc                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partner limits        | [partner-limits](../../docs/harness/tenants/partner-limits.md) · `bun run ops:limits:demo` · `/portal/limits/`                                                       |
| Ops loop              | `bun run ops:settle` · `ops:outbox:requeue` · `bun test tests/ops-loop-hardening.test.ts` · [ops-loop-throughput](../../docs/harness/tenants/ops-loop-throughput.md) |
| Snapshot              | `bun run ops:snapshot` → `public/registry/ops-summary.json`                                                                                                          |
| Dual-mode experiments | [`.agents/skills/ops-dual-mode-experiments`](../../.agents/skills/ops-dual-mode-experiments/SKILL.md)                                                                |

### Compliance mock · `bun run -` · console depth

```bash
bun run ops:compliance:mock
bun --console-depth=6 tools/show-enhancements.ts
# Ad-hoc:
bun --console-depth=4 run - <<EOF
import { ComplianceClient } from "./lib/operations/state-compliance-http.ts";
const client = new ComplianceClient();
console.log(await client.getStatus("demo-ma-licensed", "MA"));
EOF
```

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

| Package                                 | Role                                      | CLI                           |
| --------------------------------------- | ----------------------------------------- | ----------------------------- |
| [`lib/experiments/`](../experiments/)   | Factorial partner-policy experiments (C4) | `bun run ops:experiments`     |
| [`lib/prediction/`](../prediction/)     | Coverage prediction backtest (C5)         | `bun run ops:prediction`      |
| [`lib/provisioning/`](../provisioning/) | Manual / automated_test queue             | `bun run ops:provision-queue` |
| [`lib/telegram/`](../telegram/)         | Bot / webhook / outbox delivery           | `bun run telegram:verify`     |
| [`lib/channels/`](../channels/)         | Outbox projectors                         | —                             |

### Coverage floors (experiments → offer gate)

`canOfferOnPlatform(db, platformId, stake, minPct, partnerId?)` and
`reservePlay(..., { checkCoverage: true })` honor active variant keys:

`min_coverage_pct` · `coverage_floor` · `minPlatformCoverage`

(`COVERAGE_FLOOR_KEYS` in
[`lib/experiments/engine.ts`](../experiments/engine.ts)).

## Portal + Cloudflare Pages + local API

**One payload:** `buildOpsSummary` → `OpsSummaryPayload` (experiments C4 +
prediction C5).

| Surface               | Endpoint                                           | Source                                           |
| --------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Local portal          | `bun run serve:public` → `/api/operations/summary` | **Live** SQLite (`source: "live"`)               |
| Local static fallback | `/registry/ops-summary.json`                       | File from last `ops:snapshot`                    |
| Pages Function        | `/api/operations/summary`                          | Snapshot via ASSETS (Workers have no bun:sqlite) |
| Pages static          | `/registry/ops-summary.json`                       | Same file                                        |
| Builder SSOT          | [`ops-summary.ts`](ops-summary.ts)                 | Used by live local + `ops:snapshot`              |

```bash
bun run serve:public
# http://localhost:3000/portal/ops/
bun run ops:snapshot   # freeze live → public/registry/*
```

## Prove (ops SSOT)

```bash
bun test tests/operations-schema.test.ts tests/ops-summary.test.ts
bun test tests/experiments-*.test.ts tests/prediction-*.test.ts
bun run ops:experiments --help
bun run ops:prediction --help
bun run ops:snapshot --out /tmp/ops-summary.json
```
