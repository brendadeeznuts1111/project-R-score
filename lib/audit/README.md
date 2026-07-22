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
bun tools/audit-catalog.ts build    # catalog + docs/audit/{findings,concepts}/*.md
bun tools/audit-catalog.ts verify   # evidence + graph + relatedDocs + catalog parity
bun tools/audit-catalog.ts list
bun tools/bun-doc-refs.ts suggest --audit "fiber"
bun tools/audit-emit-stub.ts
bun run audit:migrate:sha3        # one-shot normalize inbound/old findings → Phase 2 (SSOT sample already clean)
```

| Script | Meaning |
|--------|---------|
| `bun run audit:catalog:build` | build |
| `bun run audit:verify` | verify (sources + built catalog parity) |
| `bun run audit:catalog` | **list only** |
| `bun run audit:get -- <id>` | get (prints co-hits) |
| `bun run audit:search -- <q>` | search |
| `bun run audit:emit-stub` | sample emitter |
| `bun run audit:migrate:sha3` | inbound Phase 2 normalize |

Evidence lives under `tools/audit-evidence/` (committed). Source findings: `tools/audit-findings/*.json`. Concepts: `tools/audit-concepts/*.json`. Built index: `tools/audit-catalog.json`. Fingerprint: `evidence.algorithm` + `evidence.digest` (Phase 2 — primary `sha3-256`; enum still allows `sha256`; no legacy `sha256`-only wire field, no companion). Prefer `bun run audit:catalog:build`; `bun-doc-refs index-audit` is the same rebuild.
