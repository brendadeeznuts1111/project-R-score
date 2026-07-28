# Tenant: monorepo-health

**Tenant** `monorepo-health`  
**Runs** `bun run monorepo:health` · `bun tools/monorepo-health.ts`  
**Proof** `reports/monorepo-health-latest.json` · formula unit tests  
**Catalog** Bun-native Glob · build metafile · optional Archive  

## Formula (0–100)

```
Health = 100
  − (duplicateDepCount × 2)
  − (deadCodePercent × 0.5)
  − (largeFilePercent × 1)
  − (testFailureRate × 5)
  − (cyclicDependencyCount × 1.5)
  + (testCoveragePercent × 0.2)
```

| Grade | Score |
|-------|-------|
| healthy | ≥ 90 |
| needs-improvement | 60–89.9 |
| critical | &lt; 60 (CLI exit 1) |

## Collection (Bun APIs)

| Metric | Source |
|--------|--------|
| duplicateDepCount | workspace + root `package.json` dependency version sets |
| deadCodePercent / cycles | `Bun.build({ metafile: true })` over barrel entrypoints |
| largeFilePercent | `Bun.Glob` + line count (&gt; 200 default) |
| testFailureRate | optional `--with-tests` focused `bun test` sample |
| testCoveragePercent | reserved (0 until coverage parse wired) |

## CLI

```bash
bun run monorepo:health              # human table + latest JSON
bun run monorepo:health:json         # stdout JSON only
bun tools/monorepo-health.ts --no-build
bun tools/monorepo-health.ts --with-tests
bun tools/monorepo-health.ts --archive   # tar report when Bun.Archive available
```

## Code

| Path | Role |
|------|------|
| [`lib/harness/monorepo-health.ts`](../../../lib/harness/monorepo-health.ts) | formula + collect |
| [`tools/monorepo-health.ts`](../../../tools/monorepo-health.ts) | CLI |
| [`tests/monorepo-health.test.ts`](../../../tests/monorepo-health.test.ts) | pure formula + helpers |

## Weekly trend

Run via spine/cron host and keep `reports/monorepo-health-*.json` (or `--archive` tars). Compare score deltas after refactors.
