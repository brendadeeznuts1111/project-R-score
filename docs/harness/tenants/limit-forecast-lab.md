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

`forecastEligible` is computed — not hardcoded. Transition Brier / log-loss stay
diagnostic. Promotion clears only when all of the following hold:

1. Immutable `limit_forecast_issues` rows exist
2. Matured outcomes include both raises and no-raises
3. Leakage-safe rolling-origin calibration scores at least one sample under the
   48h horizon embargo (`scoreRollingOriginEmbargo`)
4. The decision-eligible transition set is non-empty (Tier-4 / fixture-only
   datasets remain blocked)

Helpers: `computeForecastEligibility` · `readLimitForecastCalibrationSamples` in
[`lib/prediction/limit-forecast-evidence.ts`](../../../lib/prediction/limit-forecast-evidence.ts).

## Domain path

The local route is the first stage. A future `limits-lab.factory-wager.com`
deployment should be a separate promotion decision. Cloudflare Sandbox preview
services require the Sandbox SDK, a container image built with Docker, and
wildcard custom-domain routing; those prerequisites are not installed on this
workstation.
