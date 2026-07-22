# audit-evidence

Opaque evidence blobs for FactoryWager [`AuditFinding`](../../lib/audit/audit-finding.ts) records.

Findings live in [`tools/audit-findings/*.json`](../audit-findings/). Phase 2 fingerprint: `evidence.algorithm` + `evidence.digest` (primary `sha3-256`). Legacy `{ sha256 }` and dual-write companions are rejected — run `bun run audit:migrate:sha3` to normalize. Catalog build / `verify` fails on mismatch.

Schema pointer: [`schema.json`](./schema.json) → canonical contracts under `lib/audit/`.
