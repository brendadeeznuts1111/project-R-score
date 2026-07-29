# Coverage prediction report

Tenant runbook for the baked coverage backtest at `/registry/prediction/report/`.
Code SSOT: [`lib/prediction/README.md`](../../../lib/prediction/README.md) · generator [`lib/prediction/report.ts`](../../../lib/prediction/report.ts).

**Claim** `prediction-report-v3` · schemaVersion **3** on `summary.json`.

## Enhancement tracking

| # | Enhancement | Priority | Component | Status | Notes / Dependencies | How to verify |
|---|-------------|----------|-----------|--------|----------------------|---------------|
| 1 | FactoryWager hero + trim nav | P0 | report header | Done | — | Brand wordmark; nav has Ops/Dashboard/Health/Monitoring/Report only |
| 2 | One stats row (n·MAE·RMSE·bias·≤5·trend) | P0 | report stats-row | Done | — | Exactly 6 glance metrics above charts |
| 3 | Section jobs: charts → stability → latest → series → footer | P0 | report sections | Done | — | Headings match jobs; asset links only in footer |
| 4 | Absolute PNG + orphan SVG links | P0 | report footer / artifacts | Done | — | PNG href `/registry/prediction/coverage-chart.png` 200 |
| 5 | `schemaVersion` + complete artifacts | P0 | summary.json | Done | v1→v2 adds bins/worstDays | `summary.schemaVersion === 2` |
| 6 | Drop purple + dead `#prediction-series` | P1 | report CSS/JS | Done | Rolling MAE uses `--accent` | No `#a371f7` / no `id="prediction-series"` |
| 7 | Most-recent 60 series window + fuller CTAs | P1 | `loadCoverageSeries` | Done | — | `ORDER BY date DESC LIMIT 60` then reverse |
| 8 | Retire stale `report.html` probes | P1 | monitoring / content-type | Done | Stub + `_redirects` remain | Canonical links use `/report/` |
| 9 | Promote diagnostics into ops-summary + report ops cards | P0 | ops-summary · report ops-cards · C5 | Done | Reuses stats; coverage-% thresholds (MAE≤5/15) | Ops card shows quality/trend; report has Quality + Trend cards |
| 10 | Histogram bins + worst-k + colored ≤5/trend | P0 | summary.json · report distribution | Done | Shared bin helper with histogram SVG | Mini bars + worst-5 table; ≤5/trend colored |
| 11 | Stats-row tooltips (plain-English) | P1 | stats glance row | Done | Coverage-% copy; tabindex + focus tips | Tab through stats; tooltip on focus |
| 12 | Light/dark theme toggle | P1 | report shell | Done | Portal light tokens; localStorage `fw-prediction-report-theme` | Toggle persists; charts filter in light mode |
| 13 | “What changed?” bake-over-bake diff | P2 | ops cards · summary.json | Done | Reads prior summary.json before overwrite | Diff row when prior exists; else “no comparison” |
| 14 | Rolling MAE ±1σ confidence band | P2 | rolling SVG · summary.rolling | Done | Per-window std of \|error\| | Translucent band + overall MAE baseline |
| 15 | Print + offline HTML download | P2 | topbar actions | Done | `@media print` + Blob download | Print dialog clean; HTML opens offline |

**PR split recommendation:** Round 2 (#11–#15) ships as one claim `prediction-report-v3`.

## Domain thresholds (coverage %)

**Freshness gate:** `tests/prediction-freshness.test.ts` fails when `summary.json.generated` is older than 48h — if the 01:00 UTC cron dies, the test turns red instead of the report silently aging. Refresh: `bun run ops:prediction report`.

These are **percentage points of coverage**, not unit-scale regression metrics:

| Signal | Good | Fair / marginal | Poor |
|--------|------|-----------------|------|
| MAE (quality) | ≤ 5 | ≤ 15 | > 15 |
| \|bias\| severity | ≤ 1 → `low` | ≤ 3 → `medium` | else `high` |
| within≤5 rate | ≥ 65% → `above_target` | ≥ 50% → `marginal` | else `below_target` |
| trend | `improving` / `stable` | — | `worsening` → `decayDetected` |

No `lastTrainDrift` — model is naive (no train step).

## summary.json schema (v3 additions)

```json
{
  "schemaVersion": 3,
  "previous": {
    "generatedAt": "2026-07-27T12:00:00.000Z",
    "mae": 3.1,
    "rmse": 4.8,
    "bias": 2.5,
    "within5Pct": 70,
    "n": 30,
    "qualityLabel": "Good fit"
  },
  "diff": {
    "available": true,
    "maeDelta": -0.24,
    "maePctBetter": 7.7,
    "within5Pp": 3.3,
    "biasDelta": 0.37,
    "improved": true
  },
  "rolling": {
    "window": 7,
    "mae": [2.1, 2.3],
    "stdUpper": [3.0, 3.2],
    "stdLower": [1.2, 1.4],
    "overallMae": 2.87
  },
  "diagnostics": {
    "…existing fields…",
    "errorStdDev": 0.41,
    "qualityLabel": "Good fit",
    "biasSeverity": "low",
    "within5Status": "above_target",
    "within5Target": 65,
    "trendLabel": "stable",
    "decayDetected": false,
    "maeRmseRatio": 0.74
  },
  "histogramBins": [
    { "lo": 0, "hi": 1.25, "count": 12, "pct": 40, "containsMae": true }
  ],
  "worstDays": [
    {
      "date": "2026-06-30",
      "predicted": 100,
      "actual": 90,
      "error": 10,
      "absError": 10,
      "within5": false,
      "exceedsRmse": true
    }
  ],
  "ops": {
    "stripTone": "good",
    "within5Text": "Within 5: 73% · target 65%",
    "trendText": "Trend: stable · Δ 0.00"
  }
}
```

When no prior bake: `"previous": null`, `"diff": { "available": false }`.

## Theme + export UX

- Theme toggle (sun/moon) in topbar; default follows `prefers-color-scheme`; persists in `localStorage`.
- Light mode inverts inlined chart SVGs via CSS filter (baked SVG palettes stay dark).
- **Print** opens browser print dialog with `@media print` layout.
- **Download HTML** saves self-contained page (inline CSS + SVG) for offline viewing.

## ops-summary.prediction.coverage (enriched)

In addition to `{ mae, rmse, bias, n }`:

`quality` · `trend` · `within5Pct` · `within15Pct` · `maeDelta` · `worstDate` · `maxAbsError` · `biasSeverity` · `within5Status` · `decayDetected` · `errorStdDev` · `report` path.

## Prove

```bash
bun test tests/prediction-report.test.ts tests/ops-summary.test.ts
bun run ops:prediction report
# reload http://localhost:3000/registry/prediction/report/
# ops card: http://localhost:3000/portal/ops/
```

## Scope-aware snapshots

Claim `snapshot-data-plane-v1` · core [`tools/snapshot-core.ts`](../../../tools/snapshot-core.ts) · configs [`tools/snapshot-scopes.ts`](../../../tools/snapshot-scopes.ts) · CLI [`tools/portal-cli.ts`](../../../tools/portal-cli.ts).

```bash
# Preferred — portal-cli subcommands
bun run portal-cli snapshot run --scope prediction
bun run portal-cli snapshot run --scope prediction --debug   # Bun.inspect manifest dump
bun run portal-cli snapshot list --scope prediction
bun run portal-cli snapshot grep "bias>2" --scope prediction
bun run portal-cli snapshot config

# Standalone binary (no Bun runtime required on target host)
bun run build:portal-cli
./dist/portal snapshot run --scope prediction

# Legacy flags (same core)
bun run snapshot:data-plane --scope prediction
rg "scope=prediction" snapshots/
```

**Env overrides:** `PORTAL_SCOPE` (default scope) · `PORTAL_SNAPSHOT_DIR` (default `snapshots`, local only — never point it at a public web root: manifests carry repo-identity fields like `pkgName`/`pkgVersion`) · `SNAPSHOT_BASE_URL` (fetch origin).

**Manifest metadata** (all greppable via `portal-cli snapshot grep "<key>=<val>"` or numeric `bias>2`):

- **Always:** `status`, `gitDirty`, `cwd`, `standalone`
- **Provenance:** `lockHash` / `lockBytes` (short sha256 + size of the text `bun.lock`), `pkgName` / `pkgVersion` (root `package.json`), `bunfigHash` (short sha256 of `bunfig.toml`) — dependency/config drift between any two snapshots
- **prediction:** `mae` `rmse` `bias` `within5Pct` `quality` `schemaVersion` · **limits:** `totalChanges` `raises` `decreases` `netDelta` `avgScore` `uniquePartners` `uniqueSportsbooks` (+ `chart.svg` from the same metadata) · **gaps:** `errors` `warnings` `total`

```bash
bun run portal-cli snapshot grep "lockHash=5d3b73c22eeb0d0d"
bun run portal-cli snapshot grep "raises>10"
```

Auto-detect: `.snapshot-scope` in report dir or cwd path (`public/registry/prediction/report/.snapshot-scope` → `prediction`).
