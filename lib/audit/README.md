# audit

FactoryWager audit findings — sibling SSOT to Bun docs tokens.

**Not** [`BunToken`](../docs/bun-token.ts) / `CANONICAL_REFS`. Findings stay repo-local with hashed evidence.

Inventory: [`../README.md`](../README.md).

| Entry |
|-------|
| [`index.ts`](./index.ts) |
| [`audit-finding.ts`](./audit-finding.ts) |
| [`audit-finding.schema.json`](./audit-finding.schema.json) |
| [`audit-concept.ts`](./audit-concept.ts) |
| [`audit-concept.schema.json`](./audit-concept.schema.json) |
| [`audit-refs.ts`](./audit-refs.ts) | `AUDIT_REFS` aliases → finding/concept id |
| [`render-finding.ts`](./render-finding.ts) | Markdown under `docs/audit/findings/` · `concepts/` |

## Operate

```bash
bun tools/audit-catalog.ts build    # catalog + docs/audit/findings/*.md
bun tools/audit-catalog.ts verify   # re-check hashes without rewrite
bun tools/audit-catalog.ts list
bun tools/bun-doc-refs.ts suggest --audit "fiber"
bun tools/audit-emit-stub.ts
bun run audit:migrate:sha3        # Phase 2 normalize: sha3-256 + strip companion
```

Evidence lives under `tools/audit-evidence/` (committed). Source findings: `tools/audit-findings/*.json`. Built index: `tools/audit-catalog.json`. Pages: `docs/audit/findings/`. Fingerprint: `evidence.algorithm` + `evidence.digest` (Phase 2 — no legacy `sha256`-only wire, no companion).
