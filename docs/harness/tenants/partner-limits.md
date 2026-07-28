# Partner limit raises

**Plane:** ops SQLite (`operations.db`) · public Pages bake · agent API
**Artifacts:** `public/registry/limit-raises.json` · portal `/portal/limits/` ·
ops-summary `limitChanges` **Secrets:** none for board bake; agent read paths
use existing serve-public / Pages auth where wired

Detect sportsbook account limit changes, enrich with multi-factor context
(handle, CLV, risk inverted), seal digests, and connect each row to
partner/downline hierarchy, sportsbook behavior, state licenses, geo profiles,
ZIP-prefix clusters, and regulatory audit counts.

## Architecture

```text
operations.db
  partner_account_limits · limit_raise_context · (optional) limit_predictions
        │
        ├── AccountLimitsRepository          # detect / seed / recent changes
        ├── PartnerAnalyticsRepository       # capture context · multi-factor score · seal
        ├── LimitRaiseReport                 # Bun.inspect.table + inspect.custom
        ├── predictLimitRaise                # forecast next raise
        │
        ├── tools/ops-check-limits.ts        # ops:limits:check · :demo · :multi · :alerts
        ├── tools/capture-raise-context.ts   # ops:limits:capture
        ├── tools/ops-limit-predict.ts       # ops:limits:predict
        ├── tools/seed-limit-patterns.ts     # multi-partner/downline/state/ZIP fixture
        ├── exportLimitRaisesSnapshot        # ops:snapshot → /registry/limit-raises.json
        │
        ├── Local: serve-public agent handlers (live SQLite)
        └── Pages:
              GET /api/agents/v1/limits/raises  → ASSETS snapshot
              GET /api/limits/summary           → snapshot aggregate
              POST record / analyze / predictions → 503 stubs (local only)
```

**DB home:** `operations.db` (not `partner.db`). Wire `AccountLimitsRepository`
/ analytics against the ops connection used by `ops:snapshot` and serve-public.

## Operator loop

```bash
# 1. Demo seed + multi-factor tables (CLI)
bun run ops:limits:demo
# ≡ ops-check-limits --force-seed --multi  → LimitRaiseReport inspect tables

# Connected fixture: 3 partners · 5 downline nodes · 5 books · MA/NJ · 5 ZIP clusters
bun run ops:limits:seed-patterns

# 2. Check / capture / predict
bun run ops:limits:check --partner partner-42 --multi
bun run ops:limits:capture --inspect
bun run ops:limits:predict --partner partner-42 --inspect

# 3. Bake registry + portal companion (48h window, capture missing context)
bun run ops:snapshot   # writes public/registry/limit-raises.json

# 4. Local portal
bun run serve:public:hot   # open /portal/limits/ · /registry/limit-raises.json
# Agent (local live SQLite):
#   GET /api/agents/v1/limits/raises?node_id=partner-42&hours=24
#   GET /api/agents/v1/limits/raises?node_id=partner-42&format=table
#   GET /api/limits/summary?format=table
```

## Code map

| Layer                    | Path                                                                                                                                                                       | Role                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Schema / detect**      | [`lib/account-limits-repo.ts`](../../../lib/account-limits-repo.ts)                                                                                                        | `partner_account_limits` · `detectRaises` · CLV/line enrich · `seedAccountLimitsDemo` · `queryRecentLimitChanges` · alert formatters |
| **Multi-factor**         | [`lib/operations/partner-analytics-repo.ts`](../../../lib/operations/partner-analytics-repo.ts)                                                                            | `limit_raise_context` · `computeMultiFactorScore` · seal proofs · `exportLimitRaisesSnapshot` · `captureAllMissingRaiseContexts`     |
| **Connected patterns**   | [`lib/operations/limit-patterns.ts`](../../../lib/operations/limit-patterns.ts)                                                                                            | deterministic partner/downline seed · book/state/ZIP aggregates · hierarchy/geo/license/proof audit coverage                         |
| **CLI report**           | [`lib/operations/limit-raise-report.ts`](../../../lib/operations/limit-raise-report.ts)                                                                                    | `LimitRaiseReport` · `LIMIT_*_TABLE_PROPERTIES` · `Bun.inspect.table` + `[Bun.inspect.custom]` · deep `Uint8Array` digests           |
| **Agent HTTP**           | [`lib/operations/limit-raise-agent-api.ts`](../../../lib/operations/limit-raise-agent-api.ts)                                                                              | raises / record / summary / analyze / predictions · `?format=table\|text\|inspect` on raises+summary                                 |
| **Prediction**           | [`lib/prediction/limit-prediction.ts`](../../../lib/prediction/limit-prediction.ts)                                                                                        | `predictLimitRaise` · backfill · cycle                                                                                               |
| **Predict report**       | [`lib/prediction/limit-prediction-report.ts`](../../../lib/prediction/limit-prediction-report.ts)                                                                          | forecast `inspect.table` / inspect.custom                                                                                            |
| **CLI — check**          | [`tools/ops-check-limits.ts`](../../../tools/ops-check-limits.ts)                                                                                                          | `ops:limits:check` · `:all` · `:clv` · `:multi` · `:demo` · `:alerts`                                                                |
| **CLI — capture**        | [`tools/capture-raise-context.ts`](../../../tools/capture-raise-context.ts)                                                                                                | `ops:limits:capture` · optional `--inspect`                                                                                          |
| **CLI — predict**        | [`tools/ops-limit-predict.ts`](../../../tools/ops-limit-predict.ts)                                                                                                        | `ops:limits:predict` · `:predict:json` · `--inspect`                                                                                 |
| **CLI — analyze**        | [`tools/ops-limit-analyze.ts`](../../../tools/ops-limit-analyze.ts)                                                                                                        | `ops:limits:analyze` · `:analyze:json`                                                                                               |
| **CLI — connected seed** | [`tools/seed-limit-patterns.ts`](../../../tools/seed-limit-patterns.ts)                                                                                                    | `--force` replaces only `limit-demo-*` rows · `--bake` writes the limit registry snapshot                                            |
| **Bake**                 | `exportLimitRaisesSnapshot` (analytics) · [`tools/ops-snapshot.ts`](../../../tools/ops-snapshot.ts)                                                                        | companion bake → [`public/registry/limit-raises.json`](../../../public/registry/limit-raises.json)                                   |
| **Portal UI**            | [`public/portal/limits/index.html`](../../../public/portal/limits/index.html)                                                                                              | board · filters · multi-factor score badges · 48h · summary/registry fallbacks                                                       |
| **Pages edge**           | [`functions/api/agents/v1/limits/raises.ts`](../../../functions/api/agents/v1/limits/raises.ts) · [`…/record.ts`](../../../functions/api/agents/v1/limits/record.ts) · [`functions/api/limits/summary.ts`](../../../functions/api/limits/summary.ts) | snapshot GET · record **503** stub · summary aggregate                                                                               |
| **Route SSOT**           | [`lib/http/public-routes.ts`](../../../lib/http/public-routes.ts)                                                                                                          | `/portal/limits/` · registry · raises · record · summary · analyze · predictions                                                     |
| **Weave**                | [`lib/http/portal-weave.ts`](../../../lib/http/portal-weave.ts)                                                                                                            | surface · artifact · scripts (`ops:limits:*` · seed-limit-patterns)                                                                  |
| **Ops summary**          | [`lib/operations/ops-summary.ts`](../../../lib/operations/ops-summary.ts)                                                                                                  | `limitChanges[]` card slice from ops DB                                                                                              |
| **Monitoring / health**  | [`lib/monitoring/limit-slice.ts`](../../../lib/monitoring/limit-slice.ts)                                                                                                  | `limitRaises` monitoring tile · health `artifacts.limitRaises` (missing bake does not degrade)                                       |
| **Barrel**               | [`lib/operations/index.ts`](../../../lib/operations/index.ts) · [`lib/prediction/index.ts`](../../../lib/prediction/index.ts)                                              | all limit agent handlers + limit prediction exports                                                                                  |
| **Tests**                | `tests/account-limits-repo.test.ts` · `analytics-multifactor.test.ts` · `limit-raise-report.test.ts` · `limit-raise-agent-api.test.ts` · `limit-patterns*.test.ts` · `limit-prediction-report.test.ts` | schema · score · inspect · agent · Pages · predict                                                                                    |

## Scripts

| Script                            | Tool / behavior                           |
| --------------------------------- | ----------------------------------------- |
| `bun run ops:limits:check`        | Freshness / changes (default table)       |
| `bun run ops:limits:check:all`    | All nodes                                 |
| `bun run ops:limits:check:clv`    | CLV-enriched                              |
| `bun run ops:limits:check:multi`  | Multi-factor + context                    |
| `bun run ops:limits:demo`         | Force-seed demo + multi report            |
| `bun run ops:limits:capture`      | Capture missing raise context rows        |
| `bun run ops:limits:alerts`       | Deep alerts / channel publish path        |
| `bun run ops:limits:predict`      | Forecast next raise (CLI)                 |
| `bun run ops:limits:predict:json` | Forecast JSON only                        |
| `bun run ops:limits:analyze`      | Granular book/sport/market breakdown      |
| `bun run ops:limits:analyze:json` | Analyze JSON only                         |
| `bun run ops:limits:seed-patterns` | Connected multi-partner seed + registry bake (`seed-limit-patterns --force --bake`) |
| `bun run ops:snapshot`            | Bakes `limit-raises.json` (capture + 48h) |

```bash
bun --console-depth=6 run ops:limits:demo     # deeper nested digests
bun run ops:limits:check --partner partner-42 --multi --inspect
bun run ops:limits:predict --partner partner-42 --inspect
```

## Surfaces

| Surface        | Path                                               | Mode                                               |
| -------------- | -------------------------------------------------- | -------------------------------------------------- |
| Portal board   | `/portal/limits/`                                  | Static HTML; prefers live summary / registry       |
| Registry bake  | `/registry/limit-raises.json`                      | ops-snapshot companion (48h · multi-factor)        |
| Ops summary    | `ops-summary.limitChanges`                         | Live SQLite when baking summary                    |
| Agent raises   | `GET /api/agents/v1/limits/raises?node_id=&hours=` | Local: SQLite · Pages: snapshot                    |
| Agent table    | same + `?format=table\|text\|inspect`              | `LimitRaiseReport` text/plain (local + Pages)      |
| Record         | `POST /api/agents/v1/limits/record`                | Local write · Pages **503** stub                   |
| Public summary | `GET /api/limits/summary` · `?format=table`        | Local SQLite · Pages snapshot aggregate            |
| Analyze        | `GET /api/limits/analyze`                          | Local only                                         |
| Predictions    | `GET\|POST /api/limits/predictions`                | Local only                                         |

## Failure paths (operator)

| Condition | Response / behavior | Fix |
|-----------|---------------------|-----|
| Missing `node_id` on raises | **400** + example URL | pass `node_id` |
| Bad `hours` | **400** (local + Pages) | positive number ≤ 30d |
| Snapshot missing / empty `byNode` (Pages) | **503** + bake links | `ops:snapshot` or `seed-limit-patterns --force --bake` |
| Record on Pages | **503** mutations not available | local serve-public |
| Invalid JSON / fields on record | **400** | required fields + finite `max_wager` |
| SQLite / schema errors on GET | **500** + demo hint | `ops:limits:demo` |
| No changes in window | **200** empty / table hint | seed or widen hours |

## Inspect tables (`LimitRaiseReport`)

`console.log(report)` → multi-section layout via `[Bun.inspect.custom]`.
Explicit columns:

| Section | Properties const                 | Columns                                                                        |
| ------- | -------------------------------- | ------------------------------------------------------------------------------ |
| Raises  | `LIMIT_RAISE_TABLE_PROPERTIES`   | node · book · sport · market · type · prev · new · dir · score · line5m · when |
| Drivers | `LIMIT_FACTOR_TABLE_PROPERTIES`  | limit_id · factor · weight_score · rank                                        |
| CLV     | `LIMIT_CLV_TABLE_PROPERTIES`     | limit_id · player · tier · delta                                               |
| Context | `LIMIT_CONTEXT_TABLE_PROPERTIES` | limit_id · metric · value                                                      |
| Proofs  | `LIMIT_PROOF_TABLE_PROPERTIES`   | limit_id · algorithm · digest_hex · digest_bytes · signed · valid              |

Idempotency of `Bun.inspect.table` is proven in `tableProof()` / tests (same
pattern as `RouteProbeReport`).

## Multi-factor score (weights)

Positive weights; risk metrics inverted via ranges (high violations /
chargebacks / volatility **lower** score). SSOT: `MULTI_FACTOR_WEIGHTS` /
`MULTI_FACTOR_RANGES` in partner-analytics-repo.

| Factor                    | Weight | Notes              |
| ------------------------- | ------ | ------------------ |
| `total_handle_7d`         | 0.20   | Volume             |
| `avg_clv_7d`              | 0.15   | Closing-line value |
| `violation_count_30d`     | 0.12   | inverted risk      |
| `chargeback_count_30d`    | 0.12   | inverted risk      |
| `kyc_pass_rate`           | 0.10   |                    |
| `partner_profit_30d`      | 0.10   |                    |
| `market_volatility_index` | 0.08   | inverted risk      |
| `sportsbook_share`        | 0.05   |                    |
| `top_tier_player_count`   | 0.04   |                    |
| `active_players_7d`       | 0.04   |                    |

## Related

- [`ops-snapshot.md`](ops-snapshot.md) — companion bake owner for
  `limit-raises.json`
- [`ops-loop-throughput.md`](ops-loop-throughput.md) — outbox / alert enqueue
  after record
- [`compliance-portal.md`](compliance-portal.md) — sibling portal board pattern
- [`public-plane.md`](public-plane.md) — portal static / registry plane
- [`toc-ops.md`](toc-ops.md) — TOC desk fixture · **LIMIT task** (account
  limit-refresh work) is not a sportsbook **limit raise** · not seat
  **maxBet** terms
- [`telegram-factory.md`](telegram-factory.md) — package bot / outbox plane
  (alerts may fan out; desk UI is `/portal/limits/`)
- [`partner-onboarding-package.md`](partner-onboarding-package.md) — onboard
  package · flow cards before raises land
- [`seat-capital-desk.md`](seat-capital-desk.md) — per-out **maxBet** /
  freeplay desk vocabulary (terms, not raise detection)
- [Bun.inspect.table](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options)
  · [inspect.custom](https://bun.com/docs/runtime/utils#bun-inspect-custom)
