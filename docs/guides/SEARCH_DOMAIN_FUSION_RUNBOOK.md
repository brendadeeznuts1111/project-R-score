# Search-Domain Fusion Runbook

## Purpose
Fuse code search relevance from `search-smart` with domain-health telemetry for FactoryWager, while staying in verify-only rollout mode.

## Commands
- Local fusion JSON output:
  - `bun run search:smart:fusion:local -- "auth middleware"`
- R2 fusion JSON output:
  - `bun run search:smart:fusion:r2 -- "auth middleware"`
- Direct fusion flags:
  - `bun run scripts/search-smart.ts "auth middleware" --fusion-domain factory-wager.com --fusion-source local --fusion-json --json`
- Readiness check:
  - `bun run project:online:check --domain factory-wager.com --source local --json`

## Fusion Flags
- `--fusion-domain <domain>`: enable domain fusion and set domain context.
- `--fusion-source <local|r2>`: choose health source.
- `--fusion-strict-p95 <ms>`: apply strict p95 penalty and readiness gate.
- `--fusion-weight <0..1>`: set domain contribution weight (default `0.35`).
- `--fusion-json`: include fusion metadata/readiness in JSON payload.
- `--fusion-fail-on-critical`: exit non-zero when readiness is critical/degraded.

## Scoring Model
- Base blend:
  - `final = searchScoreNorm*(1-fusionWeight) + domainScoreNorm*fusionWeight`
- Penalties:
  - `overall=critical`: hard cap `<= 0.45`
  - `dns=critical`: `-0.20`
  - `storage=critical`: `-0.15`
  - `cookie=critical`: `-0.10`
  - strict p95 violation: `-0.15`

## Readiness Exit Codes
- `0`: healthy/ready
- `2`: degraded
- `3`: critical
- `1`: execution/runtime failure

## Troubleshooting
- R2 source returns degraded with `r2_not_configured`:
  - Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and bucket env (`R2_BENCH_BUCKET` or `R2_BUCKET`).
- Missing local health data:
  - Ensure `reports/health-report.json` and `reports/search-benchmark/latest.json` exist.
  - Optionally set `DOMAIN_HEALTH_REPORT_PATH` and `DOMAIN_HEALTH_LATEST_SNAPSHOT_PATH`.
- Cookie telemetry ingestion:
  - Reader now supports:
    - `domains/<domain>/cookies.json` (legacy dashboard payload)
    - `cookies/<domain>/secure_domain_ctx`
    - `cookies/<domain>/secure_subdomain_state`
    - `cookies/<domain>/latest_payload`
  - To emit the new payload shape during session ops, use `/Users/nolarose/Projects/scripts/lib/cookie-telemetry.ts` (`storeCookieTelemetry`).
- Unexpected fusion ordering:
  - Lower `--fusion-weight` to reduce domain influence.

## Rollback
- Stop passing `--fusion-*` flags and run existing `search-smart` commands unchanged.
- Keep `search:smart` script as canonical non-fusion path.
