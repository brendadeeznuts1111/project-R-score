# Emergency Incident Note
- capturedAtUTC: 2026-02-09T08:33:14Z
- branch: main
- sha: e52650f756dec961a978bc1548ccce224925bb2e

## search:bench:gate (pre)
$ bun run scripts/search-benchmark-pin.ts compare --strict --json
{
  "ok": false,
  "strict": true,
  "baselinePath": "/Users/nolarose/Projects/.search/search-benchmark-pinned-baseline.json",
  "currentPath": "/Users/nolarose/Projects/reports/search-benchmark/latest.json",
  "baseline": {
    "snapshot": {
      "id": "2026-02-08T15-47-11-594Z",
      "createdAt": "2026-02-08T15:47:11.594Z",
      "queryPack": "core_delivery_wide"
    },
    "strict": {
      "latencyP95Ms": 1036.84,
      "peakHeapUsedMB": 45.32,
      "peakRssMB": 223.47,
      "qualityScore": 88.72,
      "reliabilityPct": 67.76
    }
  },
  "current": {
    "snapshot": {
      "id": "2026-02-09T04-23-08-102Z",
      "createdAt": "2026-02-09T04:23:08.102Z",
      "queryPack": "core_delivery_wide"
    },
    "strict": {
      "latencyP95Ms": 1193.5,
      "peakHeapUsedMB": 43.12,
      "peakRssMB": 221.48,
      "qualityScore": 88.72,
      "reliabilityPct": 67.76
    }
  },
  "compatibility": {
    "queryPackMatch": true,
    "baselineQueryPack": "core_delivery_wide",
    "currentQueryPack": "core_delivery_wide",
    "note": "queryPack aligned"
  },
  "delta": {
    "absolute": {
      "latencyP95Ms": 156.66,
      "peakHeapUsedMB": -2.2,
      "peakRssMB": -1.99,
      "qualityScore": 0,
      "reliabilityPct": 0
    },
    "percent": {
      "latencyP95Ms": 15.1094,
      "peakHeapUsedMB": -4.8544,
      "peakRssMB": -0.8905,
      "qualityScore": 0,
      "reliabilityPct": 0
    }
  },
  "severity": {
    "latencyP95Ms": "fail",
    "peakHeapUsedMB": "ok",
    "qualityScore": "ok",
    "reliabilityPct": "ok"
  },
  "anomalyType": "latency_spike",
  "thresholds": {
    "fail": {
      "maxP95RegressionMs": 75,
      "maxHeapRegressionMB": 8,
      "minQualityDelta": -1,
      "minReliabilityDelta": -1.5
    },
    "warn": {
      "maxP95RegressionMs": 40,
      "maxHeapRegressionMB": 4,
      "minQualityDelta": -0.5,
      "minReliabilityDelta": -0.75
    }
  },
  "failures": [
    "latencyP95Ms"
  ],
  "warnings": [],
  "trend": {
    "enabled": false,
    "window": null,
    "note": "trend hook reserved for N-run rolling analysis"
  }
}
error: script "search:bench:gate" exited with code 1

## search:status:unified:strict (pre)
$ bun run scripts/search-unified-status.ts --json --strict
{
  "generatedAt": "2026-02-09T08:33:15.207Z",
  "latestSnapshotId": "2026-02-09T04-23-08-102Z",
  "loopSnapshotId": "2026-02-08T15-47-11-594Z",
  "freshness": {
    "latestSnapshotIdSeen": "2026-02-09T04-23-08-102Z",
    "loopStatusSnapshotId": "2026-02-08T15-47-11-594Z",
    "isAligned": false,
    "staleMinutes": 0,
    "windowMinutes": 15,
    "status": "fail"
  },
  "warnings": [
    "latency_p95_warn"
  ],
  "stages": [
    {
      "id": "cli_search",
      "status": "pass",
      "reason": "Strict profile found in latest snapshot.",
      "evidence": [
        "/Users/nolarose/Projects/reports/search-benchmark/latest.json",
        "strict.quality=88.72"
      ]
    },
    {
      "id": "benchmark_snapshot",
      "status": "pass",
      "reason": "Latest snapshot has same-pack baseline lineage.",
      "evidence": [
        "/Users/nolarose/Projects/reports/search-benchmark/latest.json",
        "baseline=2026-02-08T14-43-58-324Z"
      ]
    },
    {
      "id": "coverage_kpi",
      "status": "pass",
      "reason": "Searchable LOC coverage is available.",
      "evidence": [
        "/Users/nolarose/Projects/reports/search-coverage-loc-latest.json",
        "lines=141757",
        "roots=./lib,./packages/docs-tools/src"
      ]
    },
    {
      "id": "signal_quality",
      "status": "pass",
      "reason": "Quality signal stable.",
      "evidence": [
        "quality=88.72",
        "reliability=67.76"
      ]
    },
    {
      "id": "signal_latency",
      "status": "pass",
      "reason": "Latency signal stable.",
      "evidence": [
        "strict.p95=1036.84ms"
      ]
    },
    {
      "id": "signal_memory",
      "status": "pass",
      "reason": "Memory signal stable.",
      "evidence": [
        "strict.peakHeap=45.32MB",
        "strict.peakRss=223.47MB"
      ]
    },
    {
      "id": "dashboard_parity",
      "status": "pass",
      "reason": "Loop status includes snapshot/warnings/coverage for dashboard parity checks.",
      "evidence": [
        "/Users/nolarose/Projects/reports/search-benchmark/latest.json",
        "/Users/nolarose/Projects/reports/search-coverage-loc-latest.json"
      ]
    },
    {
      "id": "status_freshness",
      "status": "pass",
      "reason": "Loop status snapshot is aligned and fresh.",
      "evidence": [
        "staleMinutes=0.00"
      ]
    }
  ],
  "domainReadiness": {
    "totalDomains": 18,
    "tokenConfigured": 18,
    "tokenMissing": 0,
    "onlineRows": 2,
    "checkedRows": 10,
    "onlineRatio": 0.2,
    "blocked": false,
    "reasons": [
      "online_rows=2/10"
    ]
  },
  "contractChecks": [
    {
      "id": "latest_exists",
      "ok": true,
      "detail": "/Users/nolarose/Projects/reports/search-benchmark/latest.json",
      "status": "ok"
    },
    {
      "id": "loop_exists",
      "ok": true,
      "detail": "/Users/nolarose/Projects/reports/search-loop-status-latest.json",
      "status": "ok"
    },
    {
      "id": "rss_exists",
      "ok": true,
      "detail": "/Users/nolarose/Projects/reports/search-benchmark/rss.xml",
      "status": "ok"
    },
    {
      "id": "latest_loop_id_alignment",
      "ok": false,
      "detail": "latest=2026-02-09T04-23-08-102Z loop=2026-02-08T15-47-11-594Z",
      "status": "fail"
    },
    {
      "id": "latest_loop_warning_alignment",
      "ok": false,
      "detail": "latest=[latency_p95_warn] loop=[]",
      "status": "fail"
    },
    {
      "id": "latest_loop_coverage_alignment",
      "ok": true,
      "detail": "latest=141757 loop=141757",
      "status": "ok"
    },
    {
      "id": "rss_latest_guid_alignment",
      "ok": true,
      "detail": "latest=2026-02-09T04-23-08-102Z rssGuid=2026-02-09T04-23-08-102Z",
      "status": "ok"
    }
  ],
  "overall": {
    "status": "fail",
    "loopClosed": true,
    "reason": "All stages passed or are allowed warning states (latency/memory/status_freshness), including dashboard parity inputs."
  }
}
error: script "search:status:unified:strict" exited with code 3

## security:audit (pre)
$ bun audit
[0.31ms] ".env.production", ".env"
[0m[1mbun audit [0m[2mv1.3.10-canary.4 (68f2ea4b)[0m
aws-sdk  >=2.0.0 <=3.0.0
  (direct dependency)
  low: JavaScript SDK v2 users should add validation to the region parameter value in or migrate to v3 - https://github.com/advisories/GHSA-j965-2qgj-vjmq

1 vulnerabilities (1 low)

To update all dependencies to the latest compatible versions:
  bun update

To update all dependencies to the latest versions (including breaking changes):
  bun update --latest

error: script "security:audit" exited with code 1
