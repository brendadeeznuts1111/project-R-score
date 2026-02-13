# Search Baseline Governance

This policy governs updates to search benchmark pinned baselines under `.search/`.

## Required Metadata

Every `search-benchmark-pinned-baseline*.json` must include:

- `rationale` (non-empty and reviewable)
- `pinnedBy` (actor id, not `unknown`)
- `previousSnapshotId` (string or `null`)

## Pin Procedure

Use explicit rationale and actor when promoting a new baseline:

```bash
bun run scripts/search-benchmark-pin.ts pin \
  --from reports/search-benchmark/latest.json \
  --out .search/search-benchmark-pinned-baseline.core_delivery_wide.json \
  --rationale "promote-core-wide-after-governance-review" \
  --pinned-by "${USER}"
```

Then verify:

```bash
bun run search:bench:baseline:verify
bun run search:bench:gate --json
```

## CI Enforcement

The Search Governance workflow enforces:

- baseline file presence
- baseline governance metadata validity
- benchmark snapshot generation and regression gate
- artifact upload for diagnostics

## Trend Gate Controls

The compare gate supports rolling same-pack trend assessment.

- `SEARCH_BENCH_PIN_TREND_ENABLED` (default `1`)
- `SEARCH_BENCH_PIN_TREND_STRICT` (default `0`)
- `SEARCH_BENCH_PIN_TREND_WINDOW` (default `5`)
- `SEARCH_BENCH_PIN_TREND_MIN_SAMPLES` (default `3`)

In CI Search Governance, trend strict mode is enabled so fail-level trend regressions block the gate.
