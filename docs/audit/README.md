# Audit findings (FactoryWager)

Repo-local audit SSOT. **Not** bun.com docs / BunToken.

| Path | Role |
|------|------|
| [`lib/audit/`](../../lib/audit/) | Types · schema · `AUDIT_REFS` · markdown render |
| [`tools/audit-findings/`](../../tools/audit-findings/) | Source finding JSON |
| [`tools/audit-concepts/`](../../tools/audit-concepts/) | Source concept JSON (`nagata-map`, `sha3-integrity`, …) |
| [`tools/audit-evidence/`](../../tools/audit-evidence/) | Hashed evidence (`algorithm` + `digest`, sha3-256) |
| [`tools/audit-catalog.json`](../../tools/audit-catalog.json) | Built index |
| [`tools/audit-catalog.ts`](../../tools/audit-catalog.ts) | `build` · `verify` · `get` · `list` · `search` |
| [`findings/`](./findings/) | Generated finding pages (do not hand-edit) |
| [`concepts/`](./concepts/) | Generated concept pages (do not hand-edit) |

## Operate

```bash
bun tools/audit-catalog.ts build
bun tools/audit-catalog.ts verify
bun tools/bun-doc-refs.ts suggest "Nagata map"       # AuditConcept (not BunToken)
bun tools/bun-doc-refs.ts suggest --audit "fiber"  # AuditFinding
bun tools/bun-doc-refs.ts suggest --audit "SHA3-256"  # → sha3-integrity (+ related finding)
bun tools/audit-emit-stub.ts
```

### npm script aliases (`package.json`)

| Script | Runs |
|--------|------|
| `bun run audit:catalog:build` | `audit-catalog.ts build` |
| `bun run audit:verify` | `audit-catalog.ts verify` |
| `bun run audit:catalog` | `audit-catalog.ts list` (list only — not build) |
| `bun run audit:emit-stub` | rewrite sample finding + evidence |
| `bun run audit:migrate:sha3` | one-shot normalize inbound/old findings → Phase 2 |

Fingerprint: `evidence.algorithm` + `evidence.digest` (Phase 2). Proof claim: `audit-findings-catalog` — see [`docs/harness/PROOF.md`](../harness/PROOF.md).
