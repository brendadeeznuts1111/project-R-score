# Limits Forecast Lab

**Surface:** `/portal/limits-lab/`
**Artifact:** `/registry/limit-forecast-lab.json`
**Source:** read-only `data/operations.db → partner_account_limits` **plus** Tier 4 JSONL (`artifacts/raw-limits/{book}.jsonl`, synthetic nodes `scrape-{bookId}`)

The lab isolates forecasting experiments from the production limit-prediction
cycle. It can compare global and sportsbook-pooled candidates, inspect support,
and generate Bun CPU profiles without writing `prediction_accuracy`,
`limit_prediction_state`, or account-limit rows.

The production cycle writes immutable `limit_forecast_issues` and separately
matured `limit_forecast_outcomes`. The lab reads those tables without mutation
and exposes pending, observation-blocked, raise, and no-raise counts.

## Commands

```bash
bun run ops:limits:lab              # partner DB + scrape JSONL
bun run ops:limits:lab:json
bun run ops:limits:lab -- --no-scrape   # partner DB only
bun run ops:limits:lab:profile
bun run baseline:sync-scraped       # refresh JSONL + /registry/scraped-limits-observed.json
```

Scrape series use synthetic `TreeNodeId` values (`scrape-draftkings`, …) so they
never mutate `partner_account_limits`. Companion Tier 4 merge:
`/registry/scraped-limits-observed.json` (fixture ⊕ latest JSONL per cell).

The profiler writes `.cpuprofile` plus Markdown analysis under
`reports/limit-forecast-lab/profiles/`. Bun documents these formats at
<https://bun.com/docs/project/benchmarking#cpu-profiling>.

## Evidence boundary

The transition candidate dataset is still not a representative collection of
completed 48-hour positive and negative outcomes. The artifact therefore sets
`forecastEligible: false`. Transition Brier and log-loss values remain
diagnostic comparisons; evidence lifecycle metrics are reported separately.

Promotion requires immutable forecast rows, point-in-time features, explicit
maturity state, rolling-origin evaluation with a horizon embargo, and calibrated
global/book slices.

## Domain path

The local route is the first stage. A future `limits-lab.factory-wager.com`
deployment should be a separate promotion decision. Cloudflare Sandbox preview
services require the Sandbox SDK, a container image built with Docker, and
wildcard custom-domain routing; those prerequisites are not installed on this
workstation.
