# Limits Forecast Lab

**Surface:** `/portal/limits-lab/`
**Artifact:** `/registry/limit-forecast-lab.json`
**Source:** read-only `data/operations.db → partner_account_limits`

The lab isolates forecasting experiments from the production limit-prediction
cycle. It can compare global and sportsbook-pooled candidates, inspect support,
and generate Bun CPU profiles without writing `prediction_accuracy`,
`limit_prediction_state`, or account-limit rows.

## Commands

```bash
bun run ops:limits:lab
bun run ops:limits:lab:json
bun run ops:limits:lab:profile
```

The profiler writes `.cpuprofile` plus Markdown analysis under
`reports/limit-forecast-lab/profiles/`. Bun documents these formats at
<https://bun.com/docs/project/benchmarking#cpu-profiling>.

## Evidence boundary

The current dataset contains limit transitions, not a representative collection
of issued forecasts with completed 48-hour positive and negative outcomes. The
artifact therefore sets `forecastEligible: false`. Its Brier and log-loss values
are diagnostic comparisons only.

Promotion requires immutable forecast rows, point-in-time features, explicit
maturity state, rolling-origin evaluation with a horizon embargo, and calibrated
global/book slices.

## Domain path

The local route is the first stage. A future `limits-lab.factory-wager.com`
deployment should be a separate promotion decision. Cloudflare Sandbox preview
services require the Sandbox SDK, a container image built with Docker, and
wildcard custom-domain routing; those prerequisites are not installed on this
workstation.
