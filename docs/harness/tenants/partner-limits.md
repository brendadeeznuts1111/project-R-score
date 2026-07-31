# Partner limit raises

**Plane:** ops SQLite (`operations.db`) · public Pages bake · agent API
**Artifacts:** `public/registry/limit-raises.json` · portal `/portal/limits/` ·
ops-summary `limitChanges` **Secrets:** none for board bake; agent read paths
use existing serve-public / Pages auth where wired

Detect sportsbook account limit changes, enrich with multi-factor context
(handle, CLV, risk inverted), seal digests, and connect each row to an
account-centered limit profile: partner/downline identity, Partner Profile OS
binding, sportsbook observations, state licenses, geo profiles, jurisdiction
policies, ZIP-prefix clusters, regulatory audit counts, and time-ordered trace
evidence.

## Architecture

```text
operations.db
  partner_account_limits · limit_raise_context · (optional) limit_predictions
  partner_profile_bindings · partner_geo_profiles · partner_state_licenses
  regulation-policy-catalog.ts ──materialize──▶ regulatory_limits
  regulatory_violations
        │
        ├── AccountLimitsRepository          # detect / seed / recent changes
        ├── PartnerAnalyticsRepository       # capture context · multi-factor score · seal
        ├── buildAccountLimitProfiles        # profile + jurisdiction + monitoring + trace read model
        ├── buildCompliancePolicyKpis        # blocked · active · risk · recent changes
        ├── policy:audit                     # conflicts · refs · alerts · expiration
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
# ≡ ops-check-limits --reseed --multi  → LimitRaiseReport inspect tables

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
#   GET /api/limits/analyze
#   POST /api/agents/v1/limits/record — JSON body: { node_id, sportsbook, sport_id, market_id, bet_type, max_wager }

# 5. Snapshot (scope-aware, with manifest + index)
bun run snapshot:data-plane --scope limits

# 6. Domain matrix (limit impact heatmap)
bun run scan:domains --limit-only
```

## Code map

| Layer                       | Path                                                                                                                                                                                                                                                 | Role                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Schema / detect**         | [`lib/account-limits-repo.ts`](../../../lib/account-limits-repo.ts)                                                                                                                                                                                  | `partner_account_limits` · `detectRaises` · CLV/line enrich · `seedAccountLimitsDemo` · `queryRecentLimitChanges` · alert formatters |
| **Multi-factor**            | [`lib/operations/partner-analytics-repo.ts`](../../../lib/operations/partner-analytics-repo.ts)                                                                                                                                                      | `limit_raise_context` · `computeMultiFactorScore` · seal proofs · `exportLimitRaisesSnapshot` · `captureAllMissingRaiseContexts`     |
| **Connected patterns**      | [`lib/operations/limit-patterns.ts`](../../../lib/operations/limit-patterns.ts)                                                                                                                                                                      | deterministic partner/downline seed · book/state/ZIP aggregates · hierarchy/geo/license/proof audit coverage                         |
| **Account profiles**        | [`lib/operations/account-limit-profiles.ts`](../../../lib/operations/account-limit-profiles.ts)                                                                                                                                                      | account/profile identity · jurisdiction policy codes · evidence-derived status/tone · trace timeline                                 |
| **Regulation authority**    | [`lib/operations/state-regulation.ts`](../../../lib/operations/state-regulation.ts)                                                                                                                                                                  | effective state/account policies · MA/NJ reference seed · licenses · violations · dynamic additional-state projection                |
| **Governed policy catalog** | [`lib/operations/regulation-policy-catalog.ts`](../../../lib/operations/regulation-policy-catalog.ts) · [`docs/JURISDICTIONS.md`](../../JURISDICTIONS.md)                                                                                            | lifecycle · jurisdiction inheritance · deterministic codes · risk/enforcement · tiers/exclusions · generated reference               |
| **Compliance KPIs**         | [`lib/operations/compliance-policy-kpis.ts`](../../../lib/operations/compliance-policy-kpis.ts)                                                                                                                                                      | blocked today · active policies · highest-risk jurisdiction · trailing-30-day policy changes                                         |
| **Glossary semantics**      | [`lib/portal/semantic-vocabulary.ts`](../../../lib/portal/semantic-vocabulary.ts)                                                                                                                                                                    | limit account/profile/policy/code/status/evidence/effective-limit definitions consumed by the portal                                 |
| **Sports-data glossary**    | [`lib/operations/sports-betting-glossary.ts`](../../../lib/operations/sports-betting-glossary.ts) · bake [`tools/domain-glossary.ts`](../../../tools/domain-glossary.ts)                                                                               | `sport.*` · `competition` / `league.*` · `event.*` · `market.*` · `metric.*` · `cross_market.*` · `evidence.*` · `multi.*` (portal projection) |
| **Opening baseline**        | [`lib/operations/sportsbook-opening-baseline.ts`](../../../lib/operations/sportsbook-opening-baseline.ts) · [`baseline-scraped-limits.ts`](../../../lib/operations/baseline-scraped-limits.ts) · [`scrapers/sportsbook-limits.ts`](../../../lib/operations/scrapers/sportsbook-limits.ts) · [`config/scraper-targets.ts`](../../../config/scraper-targets.ts) · `bun run baseline:sync-scraped` | Multi-tier bake (schema v2): T1 NJ/MA · T2 policies · T4 estimated scrape fixture · T5 ops matrix → `/registry/sportsbook-opening-baseline.json` · `/portal/partner-history/` |
| **CLI report**              | [`lib/operations/limit-raise-report.ts`](../../../lib/operations/limit-raise-report.ts)                                                                                                                                                              | `LimitRaiseReport` · `LIMIT_*_TABLE_PROPERTIES` · `Bun.inspect.table` + `[Bun.inspect.custom]` · deep `Uint8Array` digests           |
| **Agent HTTP**              | [`lib/operations/limit-raise-agent-api.ts`](../../../lib/operations/limit-raise-agent-api.ts)                                                                                                                                                        | raises / record / summary / analyze / predictions · `?format=table\|text\|inspect` on raises+summary                                 |
| **Prediction**              | [`lib/prediction/limit-prediction.ts`](../../../lib/prediction/limit-prediction.ts)                                                                                                                                                                  | `predictLimitRaise` · backfill · cycle                                                                                               |
| **Predict report**          | [`lib/prediction/limit-prediction-report.ts`](../../../lib/prediction/limit-prediction-report.ts)                                                                                                                                                    | forecast `inspect.table` / inspect.custom                                                                                            |
| **CLI — check**             | [`tools/ops-check-limits.ts`](../../../tools/ops-check-limits.ts)                                                                                                                                                                                    | `ops:limits:check` · `:all` · `:clv` · `:multi` · `:demo` · `:alerts`                                                                |
| **CLI — capture**           | [`tools/capture-raise-context.ts`](../../../tools/capture-raise-context.ts)                                                                                                                                                                          | `ops:limits:capture` · optional `--inspect`                                                                                          |
| **CLI — predict**           | [`tools/ops-limit-predict.ts`](../../../tools/ops-limit-predict.ts)                                                                                                                                                                                  | `ops:limits:predict` · `:predict:json` · `--inspect`                                                                                 |
| **CLI — analyze**           | [`tools/ops-limit-analyze.ts`](../../../tools/ops-limit-analyze.ts)                                                                                                                                                                                  | `ops:limits:analyze` · `:analyze:json`                                                                                               |
| **CLI — snapshot**          | [`tools/snapshot-data-plane.ts`](../../../tools/snapshot-data-plane.ts) · [`tools/snapshot-core.ts`](../../../tools/snapshot-core.ts)                                                                                                                | `snapshot:data-plane` · `--scope limits` · manifest · index · list · grep                                                            |
| **CLI — domain scanner**    | [`tools/scan-domains.ts`](../../../tools/scan-domains.ts)                                                                                                                                                                                            | `scan:domains` · matrix · limit hits · `--limit-only` · `--watch` · `--interactive`                                                  |
| **Table formatter**         | [`lib/table-format.ts`](../../../lib/table-format.ts)                                                                                                                                                                                                | ANSI tables · LIMIT_CHANGE_COLUMNS · DIMENSION_COLUMNS · REGULATORY_COLUMNS · formatTableNative (Bun.inspect.table)                  |
| **CLI — connected seed**    | [`tools/seed-limit-patterns.ts`](../../../tools/seed-limit-patterns.ts)                                                                                                                                                                              | `--force` replaces only `limit-demo-*` rows · `--bake` writes the limit registry snapshot                                            |
| **CLI — TOC bridge seed**   | [`tools/seed-toc-limit-bridge.ts`](../../../tools/seed-toc-limit-bridge.ts) · [`lib/operations/toc-limit-bridge-seed.ts`](../../../lib/operations/toc-limit-bridge-seed.ts)                                                                          | Writes raises on ASH/PAT identity `treeNodeId` UUIDs so TOC board `raises 48h` join lights · scoped `--force` · optional `--bake`    |
| **Bake**                    | `exportLimitRaisesSnapshot` (analytics) · [`tools/ops-snapshot.ts`](../../../tools/ops-snapshot.ts)                                                                                                                                                  | companion bake → [`public/registry/limit-raises.json`](../../../public/registry/limit-raises.json)                                   |
| **Portal UI**               | [`public/portal/limits/index.html`](../../../public/portal/limits/index.html) · [`limit-profiles.js`](../../../public/portal/limits/limit-profiles.js) · [`glossary-ux.js`](../../../public/portal/components/glossary-ux.js)                      | account profiles · policy catalog · trace deep links · glossary tooltips/breadcrumbs · legacy pattern/change analysis                |
| **Pages edge**              | [`functions/api/agents/v1/limits/raises.ts`](../../../functions/api/agents/v1/limits/raises.ts) · [`…/record.ts`](../../../functions/api/agents/v1/limits/record.ts) · [`functions/api/limits/summary.ts`](../../../functions/api/limits/summary.ts) | snapshot GET · record **503** stub · summary aggregate                                                                               |
| **Route SSOT**              | [`lib/http/public-routes.ts`](../../../lib/http/public-routes.ts)                                                                                                                                                                                    | `/portal/limits/` · registry · raises · record · summary · analyze · predictions                                                     |
| **Weave**                   | [`lib/http/portal-weave.ts`](../../../lib/http/portal-weave.ts)                                                                                                                                                                                      | surface · artifact · scripts (`ops:limits:*` · seed-limit-patterns)                                                                  |
| **Ops summary**             | [`lib/operations/ops-summary.ts`](../../../lib/operations/ops-summary.ts)                                                                                                                                                                            | `limitChanges[]` card slice from ops DB                                                                                              |
| **Monitoring / health**     | [`lib/monitoring/limit-slice.ts`](../../../lib/monitoring/limit-slice.ts)                                                                                                                                                                            | `limitRaises` monitoring tile · health `artifacts.limitRaises` (missing bake does not degrade)                                       |
| **Barrel**                  | [`lib/operations/index.ts`](../../../lib/operations/index.ts) · [`lib/prediction/index.ts`](../../../lib/prediction/index.ts)                                                                                                                        | all limit agent handlers + limit prediction exports                                                                                  |
| **Tests**                   | `tests/account-limits-repo.test.ts` · `analytics-multifactor.test.ts` · `limit-raise-report.test.ts` · `limit-raise-agent-api.test.ts` · `limit-patterns*.test.ts` · `limit-prediction-report.test.ts`                                               | schema · score · inspect · agent · Pages · predict                                                                                   |

## Monorepo filter (bun --filter)

Limit-related tools run from the root workspace. Use `bun --filter <pattern>` to
target packages:

```bash
# Run limit tests only in specified workspaces
bun test --filter '!tests/limit-*-agent-api*'    # exclude agent API tests
bun --filter '*' ops:limits:check                  # run in all workspaces (root only has the script)
bun --filter './packages/*' ops:limits:check       # packages only (no-op — limit tools in root)

# Install dependencies for specific groups
bun install --filter '!packages/*'                 # root only (omit sub-packages)
bun install --filter './packages/*'                # packages only
```

See [`bun --filter` docs](https://bun.com/docs/cli/filter).

| Script                               | Tool / behavior                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `bun run ops:limits:check`           | Freshness / changes (default table)                                                  |
| `bun run ops:limits:check:all`       | All nodes                                                                            |
| `bun run ops:limits:check:clv`       | CLV-enriched                                                                         |
| `bun run ops:limits:check:multi`     | Multi-factor + context                                                               |
| `bun run ops:limits:demo`            | Force-seed demo + multi report                                                       |
| `bun run ops:limits:capture`         | Capture missing raise context rows                                                   |
| `bun run ops:limits:alerts`          | Deep alerts / channel publish path                                                   |
| `bun run ops:limits:analyze:json`    | Analyze JSON only                                                                    |
| `bun run ops:limits:predict`         | Forecast next raise (CLI)                                                            |
| `bun run ops:limits:predict:json`    | Forecast JSON only                                                                   |
| `bun run snapshot:data-plane`        | Scope-aware snapshot (default: limits)                                               |
| `bun run snapshot:data-plane:list`   | List all snapshots                                                                   |
| `bun run snapshot:data-plane:last`   | Show latest snapshot manifest                                                        |
| `bun run ops:limits:analyze`         | Granular book/sport/market breakdown                                                 |
| `bun run ops:limits:analyze:json`    | Analyze JSON only                                                                    |
| `bun run ops:limits:seed-patterns`   | Connected multi-partner seed + registry bake (`seed-limit-patterns --force --bake`)  |
| `bun run ops:limits:seed-toc-bridge` | Seed raises on TOC identity UUIDs (ASH/PAT) · `--reseed` · optional bake via `:bake` |
| `bun run ops:limits:smoke`           | Cross-surface test bundle (bridge · join · outbox · seat book-max · UI)              |
| `bun run ops:snapshot:demo`          | `ops:seed:all` (includes toc-bridge) + snapshot bake                                 |
| `bun run ops:snapshot`               | Bakes `limit-raises.json` (capture + 48h; runs toc-bridge unless `--no-toc-limits`)  |
| `bun run policy:audit`               | CI policy consistency gate: references, conflicts, block alerts, expiration          |
| `bun run jurisdictions:docs`         | Generate the governed jurisdiction catalog reference                                 |
| `bun run jurisdictions:docs:check`   | Fail when the generated jurisdiction reference is stale                              |
| `bun run baseline:sync-regulatory`   | Tier 1 catalog projection + full opening-baseline bake (schema v2)                   |
| `bun run baseline:sync-policies`     | Tier 2 published-policy fixture + full opening-baseline bake                         |
| `bun run baseline:sync-scraped` / `baseline:scrape-public` | Tier 4: run agents → JSONL · merge latest cells → `/registry/scraped-limits-observed.json` · fixture opening-baseline bake (CI-stable) |
| `bun run baseline:scrape-book -- <bookId>` | One registry agent by `bookId` → `artifacts/raw-limits/{bookId}.jsonl` + health.json |
| `bun run baseline:scrape-draftkings` / `fanduel` / `bet365` / `espnbet` / `betmgm` / `caesars` / `hardrock` / `fanatics` / `betrivers` / `circa` | Aliases for `baseline:scrape-book` (US top-10 Tier 4 fleet) |
| `bun run baseline:scrape-cron` / `:once` | In-process [`Bun.cron`](https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process) · default `*/15 * * * *` UTC · no-overlap · JSONL + alert eval |
| `bun run baseline:scrape-alert` | Evaluate consecutive agent fails → Slack/webhook (`BASELINE_SCRAPE_ALERT_WEBHOOK`, threshold default 3) |
| `bun run baseline:caesars:probe` | Deep-probe Caesars/AW catalog (`--location=co` · `--live` · `--json`) — WAF vs public |
| `bun run baseline:test-tier4`        | Tier 4 agent + registry + scrape unit tests                                                     |

### Scrape wire taxonomy (state · sport · market)

All Tier 4 agents normalize vendor wire onto one SSOT before JSONL write:

| Key | Module | Canonical values |
| --- | ------ | ---------------- |
| Book | [`scrape-wire-taxonomy.ts`](../../../lib/operations/scrapers/scrape-wire-taxonomy.ts) | US top-10 fleet (`draftkings`…`circa`) — `bookRegistry`; aliases `dk`/`czr`/`espn_bet`… |
| Sport | same | Full `SPORT_KEYS` (8) + league→sport aliases — `sportRegistry` |
| League | same | Competition-catalog codes (18+) — `leagueRegistry` (`nba`, `epl`, `ufc`, …) |
| Market | same | Regulation `match_winner`·`over_under`·`spread` + extended `player_prop`·`team_prop`·`futures` — `marketRegistry` |
| Phase | same | `pregame` · `live` (`in_play`/`inplay` → live) — `phaseRegistry` |
| State | same | Full US + DC (51) — `stateRegistry`; fixture subset `NJ`·`CO`·`MA` |

Bake: `bun run bake:scrape-wire-taxonomy` → [`/registry/scrape-wire-taxonomy.json`](../../../public/registry/scrape-wire-taxonomy.json) (schema v5 · `colorKey`/`hex`/`css` on book/sport/league rows via [`scrape-wire-color-kernel.ts`](../../../lib/operations/scrapers/scrape-wire-color-kernel.ts)). Glossary: `scrape.wire` · `scrape.book` · `scrape.sport` · `scrape.league` · `scrape.market` · `scrape.phase` · `scrape.jurisdiction`.

**Color kernel contract**

| Invariant | Enforcement |
| --- | --- |
| Closed palette | [`scrape-wire-palette.ts`](../../../lib/operations/scrapers/scrape-wire-palette.ts) — books + sports + leagues + `unknown` |
| Bun.color validate | Module load throws on invalid input; caches `HEX` / `css` / `{rgb}` / `ansi-16m` |
| Unique HEX | No two palette keys share a normalized `#RRGGBB` (load + `assertScrapeWireColorCoverage`) |
| Strict chip hex | `/^#[0-9A-Fa-f]{6}$/` — catalog rejects non-matching bake values before `--chip-color` |
| Bake ↔ kernel | `schema:audit` requires `colorKey === key` and `hex`/`css` equal `*ColorWire(key)` |
| UI tags | Catalog chips set `data-color-key` + `data-glossary-concept` |

#### Governance (schema:audit)

Registries are maintained alongside the domain glossary and the limits desk column semantics (`ops.limits.*` in [`semantic-vocabulary.ts`](../../../lib/portal/semantic-vocabulary.ts)).

| Command | Role |
| --- | --- |
| `bun run schema:audit` | Validate + write [`/registry/scrape-wire-schema-audit.json`](../../../public/registry/scrape-wire-schema-audit.json) |
| `bun run schema:audit:check` | Gate only (exit 1 on errors) |
| `bun run schema:audit:json` | Machine report |

Checks:

1. Every sport referenced by a league exists in `SPORT_KEYS`.
2. Every league used on the desk (`ops.limits.league`) is in the competition league registry.
3. Desk sport / market / competition / phase values ⊆ scrape-wire keys.
4. Every US top-10 book has a vendor alias map ([`book-vendor-aliases.ts`](../../../lib/operations/scrapers/book-vendor-aliases.ts)) whose targets are canonical.
5. Color kernel covers every book / sport / league; baked `hex`/`css`/`colorKey` match kernel wires; no cross-registry hex collisions.

Per-book resolve: `resolveBookSport` / `resolveBookMarket` / `resolveBookLeague` / `resolveBookPhase` (book overlay → global normalizer).

### Caesars / American Wagering live path

Capture-derived catalog: [`lib/operations/scrapers/catalogs/caesars-americanwagering.ts`](../../../lib/operations/scrapers/catalogs/caesars-americanwagering.ts) · bake [`/registry/caesars-scrape-endpoints.json`](../../../public/registry/caesars-scrape-endpoints.json).

| Piece | Detail |
| ----- | ------ |
| Primary live URL | `https://api.americanwagering.com/regions/us/locations/{nj\|co}/brands/czr/sb/bets/configuration` |
| Gate | CloudFront / AWS WAF — plain `fetch` → 403 HTML; fixture fallback remains the default |
| Public (no WAF) | `sb/features`, `configs/sportsbook/{loc}/splash`, `sportsbook.caesars.com/us/config/*` — **no opening max USD** |
| Optional auth | `CAESARS_SCRAPE_COOKIE` · `CAESARS_WAF_TOKEN` · `CAESARS_SCRAPE_LOCATION` (default `nj`) · `BASELINE_SCRAPE_LIVE=1` |
| Parser | [`caesars-parse.ts`](../../../lib/operations/scrapers/books/caesars-parse.ts) — flexible `maxBet` / `maxStake` / nested `limits[]` |
| `bun run baseline:status`            | Tier coverage / row counts for committed baseline artifact                           |
| `bun run baseline:sync-all`          | Tier 1+2+4+5 bake; Tier 3 partner API provenance (`unavailable` until credentials) · overrides still stubbed |
| `bun run bake:sportsbook-opening-baseline:check` | Drift gate for `/registry/sportsbook-opening-baseline.json`                 |

### Baseline source tiers

| Tier | Role | Status |
| ---- | ---- | ------ |
| 1 | Statutory / regulatory (`REGULATION_POLICY_CATALOG` → compliance ceiling) | Wired · `baseline:sync-regulatory` |
| 2 | Published sportsbook policies (basketball/soccer research seeds) | Wired · `baseline:sync-policies` |
| 3 | Partner API live limits | Wired provenance · `unavailable` until `PARTNER_LIMITS_API_URL` + `PARTNER_LIMITS_API_TOKEN` · [`baseline-partner-api.ts`](../../../lib/operations/baseline-partner-api.ts) |
| 4 | Public scrape estimates (registry agents → JSONL + merge companion; optional live) | Wired · `scrape()` + `bookId` + [`books/registry.ts`](../../../lib/operations/scrapers/books/registry.ts) · JSONL merge → `/registry/scraped-limits-observed.json` · Lab ingest via [`limit-forecast-scrape-ingest.ts`](../../../lib/prediction/limit-forecast-scrape-ingest.ts) · cron [`scrape-cron.ts`](../../../lib/operations/scrapers/scrape-cron.ts) (`*/15` UTC) |
| 5 | Ops opening matrix (top-10 US books × sport/market/structure/phase) | Wired · commercial baseline |

Merge win-order: Tier 1 = compliance hard ceiling; Tier 3 = live comparison; commercial display Tier 5 > 2 > 4. See [`lib/operations/baseline-source-tiers.ts`](../../../lib/operations/baseline-source-tiers.ts).

```bash
bun --console-depth=6 run ops:limits:demo     # deeper nested digests
bun run ops:limits:check --partner partner-42 --multi --inspect
bun run ops:limits:predict --partner partner-42 --inspect
```

## Surfaces

| Surface        | Path                                               | Mode                                                    |
| -------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Portal board   | `/portal/limits/`                                  | Static HTML; prefers live summary / registry            |
| Registry bake  | `/registry/limit-raises.json`                      | schema v3: 48h raises + `accountProfiles` v2 read model |
| Ops summary    | `ops-summary.limitChanges`                         | Live SQLite when baking summary                         |
| Agent raises   | `GET /api/agents/v1/limits/raises?node_id=&hours=` | Local: SQLite · Pages: snapshot                         |
| Agent table    | same + `?format=table\|text\|inspect`              | `LimitRaiseReport` text/plain (local + Pages)           |
| Record         | `POST /api/agents/v1/limits/record`                | Local write · Pages **503** `plane=local-sqlite` · `reason=bun:sqlite` |
| Public summary | `GET /api/limits/summary` · `?format=table`        | Local SQLite · Pages snapshot aggregate                 |
| Analyze        | `GET /api/limits/analyze`                          | Local only · Pages **503** same contract                |
| Predictions    | `GET\|POST /api/limits/predictions`                | Local only · Pages **503** same contract                |

## Account profile and policy semantics

The board calls a partner-tree node an **account** and keeps that identity as a
branded `TreeNodeId`. Its Partner Profile OS binding is a separate branded
`PartnerProfileKey`; the two values are never collapsed into one generic ID.

Terminology (glossary SSOT in [`lib/portal/semantic-vocabulary.ts`](../../../lib/portal/semantic-vocabulary.ts)):

| Wire / code | UI label | Glossary |
| ----------- | -------- | -------- |
| `node_id` / `TreeNodeId` | Account | `ops.limits.node` · `ops.limits.account` |
| `tree_nodes` hierarchy | Partner tree | `ops.limits.tree` |
| Descendants under a partner | Downline | `ops.limits.downline` |
| `node_type` | Role type | `ops.limits.roleType` (`partner` · `agent` · `sub_agent`) |
| `node_type: agent` | Downline agent | `ops.limits.agent` (not HTTP, not Cursor) |
| `/api/agents/v1/…` | Agent API | `api.agent` |

`accountProfiles` is a read model over existing tables, not a new write
authority. Monitoring status is derived from evidence:

| Status       | Evidence rule                                                           | Tone   |
| ------------ | ----------------------------------------------------------------------- | ------ |
| `monitored`  | profile + jurisdiction + observed limit dimensions; no recent violation | `ok`   |
| `attention`  | jurisdiction exists but no active matching license                      | `warn` |
| `blocked`    | one or more regulatory violations in the trailing 30 days               | `bad`  |
| `incomplete` | remaining accounts missing enough bindings for active monitoring        | `skip` |

Policy keys use `policy.{STATE}.{SPORT}.{MARKET}` and codes use the
deterministic form `FW-LIMIT-{STATE}-{SPORT}-{MARKET}-{SCOPE}`. The TypeScript
catalog owns lifecycle, effective/expiration dates, authority, risk,
enforcement, daily and weekly totals, age, identity, tax, tags, exclusion
groups, tiers, and alert binding. Jurisdiction defaults are inherited before the
catalog is materialized into SQLite; `regulatory_limits` remains the runtime
lookup index.

MA and NJ are internal reference seeds, not external legal citations. Additional
two-letter jurisdictions discovered in legacy active rows remain visible with
explicit `regulatory_limits:legacy` provenance. The generated
[`docs/JURISDICTIONS.md`](../../JURISDICTIONS.md) is the human catalog, while
`policy:audit` is the machine gate.

Glossary deep links:

- `#glossary:ops.limits.account`
- `#glossary:ops.limits.node`
- `#glossary:ops.limits.tree`
- `#glossary:ops.limits.downline`
- `#glossary:ops.limits.roleType`
- `#glossary:ops.limits.agent`
- `#glossary:ops.limits.sub_agent`
- `#glossary:api.agent`
- `#glossary:ops.limits.profile`
- `#glossary:ops.limits.jurisdiction_policy`
- `#glossary:ops.limits.policy_code`
- `#glossary:ops.limits.monitoring_status`
- `#glossary:ops.limits.evidence_trace`
- `#glossary:ops.limits.effective_limit`
- `#glossary:ops.limits.sport`
- `#glossary:ops.limits.market_type`
- `#glossary:sport.soccer`
- `#glossary:market.match_winner`
- `#glossary:market.total`
- `#glossary:multi.parlay`
- `#glossary:policy.MA.basketball.over_under`
- `#glossary:kpi.compliance.active_policies`

Account trace state uses `/portal/limits/#account:{TreeNodeId}` and is parsed by
`URLPattern.hash`; the fragment is the canonical selection state.

## Failure paths (operator)

| Condition                                 | Response / behavior             | Fix                                                    |
| ----------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| Missing `node_id` on raises               | **400** + example URL           | pass `node_id`                                         |
| Bad `hours`                               | **400** (local + Pages)         | positive number ≤ 30d                                  |
| Snapshot missing / empty `byNode` (Pages) | **503** + bake links            | `ops:snapshot` or `seed-limit-patterns --force --bake` |
| Record on Pages                           | **503** mutations not available | local serve-public                                     |
| Invalid JSON / fields on record           | **400**                         | required fields + finite `max_wager`                   |
| SQLite / schema errors on GET             | **500** + demo hint             | `ops:limits:demo`                                      |
| No changes in window                      | **200** empty / table hint      | seed or widen hours                                    |

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
  limit-refresh work) is not a sportsbook **limit raise** · not seat **maxBet**
  terms
- [`telegram-factory.md`](telegram-factory.md) — package bot / outbox plane
  (alerts may fan out; desk UI is `/portal/limits/`)
- [`partner-onboarding-package.md`](partner-onboarding-package.md) — onboard
  package · flow cards before raises land
- **Package-group forum:** `enqueueLimitRaiseAlert` dual-routes ops `alerts` +
  optional package forum mirror (Liquidity/Outs → Alerts) when
  `package_group_registry` resolves for the tree node.
- **Alert enrich (optional):** callers may pass `multiFactorScore` /
  `topDrivers` into `enqueueLimitRaiseAlert` (or agent POST `multi_factor_score`
  / `top_drivers`) — outbox appends a multi-factor HTML line only when provided;
  it does **not** query analytics itself.
- **Seat desk:** maxBet display compares to last-known book max
  (`seat-desk-book-max.ts`) — never dual-writes desk terms into
  `partner_account_limits`. Fill path offers `sd:bm:` / `sd:bmy:` to adopt book
  max onto desk maxBet (one confirm).
- **TOC board:** pure join `limitChanges.node_id` ↔
  partnerCode/callSign/treeNodeId (`lib/toc-ops/limit-raises-join.ts`);
  ambiguous keys stay aggregate-only. Demo badges:
  `bun run ops:limits:seed-toc-bridge` seeds sportsbook raises on real identity
  UUIDs (not `limit-demo-*` dual-write into TOC `limitHistory`).
- [`seat-capital-desk.md`](seat-capital-desk.md) — per-out **maxBet** / freeplay
  desk vocabulary (terms, not raise detection)
- [Bun.inspect.table](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options)
  · [inspect.custom](https://bun.com/docs/runtime/utils#bun-inspect-custom)
