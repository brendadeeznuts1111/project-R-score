# Audit evidence artefacts

Hashed proof payloads for `AuditFinding` entries. Paths here are the only allowlisted evidence root (`tools/audit-evidence/**`).

## Rotor contract (schemas)

| Schema | Path |
|--------|------|
| `AuditFinding` | [`lib/audit/audit-finding.schema.json`](../../lib/audit/audit-finding.schema.json) |
| `AuditConcept` | [`lib/audit/audit-concept.schema.json`](../../lib/audit/audit-concept.schema.json) |

Findings live in [`tools/audit-findings/*.json`](../audit-findings/). Phase 1 fingerprint: `evidence.algorithm` + `evidence.digest` (primary `sha3-256`), optional `sha256` companion for dual-write. Legacy `{ sha256 }` only still parses. Catalog build / `verify` fails on mismatch.

```bash
bun tools/audit-catalog.ts build     # or: bun tools/bun-doc-refs.ts index-audit
bun tools/audit-catalog.ts verify
bun tools/bun-doc-refs.ts suggest --audit --json "fiber"
```

Do not put findings in `CANONICAL_REFS` / BunToken.
