# Audit findings (FactoryWager)

Repo-local audit SSOT. **Not** bun.com docs / BunToken.

| Path | Role |
|------|------|
| [`lib/audit/`](../../lib/audit/) | Types · schema · `AUDIT_REFS` · markdown render |
| [`tools/audit-findings/`](../../tools/audit-findings/) | Source finding JSON |
| [`tools/audit-concepts/`](../../tools/audit-concepts/) | Source concept JSON (`nagata-map`, …) |
| [`tools/audit-evidence/`](../../tools/audit-evidence/) | Hashed evidence (allowlisted path prefix) |
| [`tools/audit-catalog.json`](../../tools/audit-catalog.json) | Built index |
| [`tools/audit-catalog.ts`](../../tools/audit-catalog.ts) | `build` · `verify` · `get` · `list` · `search` |
| [`findings/`](./findings/) | Generated finding pages (do not hand-edit) |
| [`concepts/`](./concepts/) | Generated concept pages (do not hand-edit) |

```bash
bun tools/audit-catalog.ts build
bun tools/audit-catalog.ts verify
bun tools/bun-doc-refs.ts suggest "Nagata map"       # AuditConcept (not BunToken)
bun tools/bun-doc-refs.ts suggest --audit "fiber"  # AuditFinding
bun tools/audit-emit-stub.ts
```

Proof claim: `audit-findings-catalog` — see [`docs/harness/PROOF.md`](../harness/PROOF.md).
