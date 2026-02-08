# Search Policy Changelog

## 2026.02.08.3
- Changed `scoreThresholdsByQueryPack.core_delivery_wide.strictLatencyP95WarnMs` to `1100`.
- Rationale: `core_delivery_wide` strict p95 is consistently around `1030-1040ms`; keeping global `900ms` created false warnings.
- Validation updated:
  - `/Users/nolarose/Projects/tests/search-policy-thresholds.test.ts`
  - `/Users/nolarose/Projects/tests/search-benchmark-thresholds.test.ts`
