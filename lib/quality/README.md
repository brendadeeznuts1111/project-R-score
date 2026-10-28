# Quality primitives

This directory contains domain-neutral composition only:

- `result.ts` derives the categorical verdict lattice from independent checks;
- `property.ts` provides reproducible generated cases and shrinking;
- `canonical-json.ts` produces stable JSON bytes plus SHA-256 and SHA3-256;
- `semantic-diff.ts` reports bounded JSON Pointer changes.

Domain formulas, generators, policy thresholds, storage, reports, baseline
acceptance, and notification stay with their owning modules. Architecture:
[`docs/design/bun-test-invariant-snapshot-architecture.md`](../../docs/design/bun-test-invariant-snapshot-architecture.md).
