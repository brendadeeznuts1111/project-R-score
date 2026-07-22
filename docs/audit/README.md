# Audit findings + concepts (FactoryWager)

Repo-local audit SSOT. **Not** bun.com docs / BunToken.

| Path | Role |
|------|------|
| [`lib/audit/`](../../lib/audit/) | Types · schema · `AUDIT_REFS` · markdown render |
| [`tools/audit-findings/`](../../tools/audit-findings/) | Source finding JSON |
| [`tools/audit-concepts/`](../../tools/audit-concepts/) | Source concept JSON (`nagata-map`, `sha3-integrity`, …) |
| [`tools/audit-evidence/`](../../tools/audit-evidence/) | Hashed evidence (`algorithm` + `digest`; SSOT requires `sha3-256`) |
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

Prefer `bun run audit:catalog:build`. `bun tools/bun-doc-refs.ts index-audit` is the same rebuild (not the Bun docs `audit` command).

**Load contract:** missing `tools/audit-catalog.json` → auto-build on `suggest --audit` / `list`/`get`/`search`. Corrupt catalog → throw (repair with `bun run audit:catalog:build`); no silent rewrite.

### npm script aliases (`package.json`)

| Script | Runs |
|--------|------|
| `bun run audit:catalog:build` | `audit-catalog.ts build` |
| `bun run audit:verify` | `audit-catalog.ts verify` (evidence · graph · relatedDocs · pages · orphans · catalog parity) |
| `bun run audit:catalog` | `audit-catalog.ts list` (list only — not build) |
| `bun run audit:get -- <id>` | `audit-catalog.ts get` (all hits / co-hits) |
| `bun run audit:search -- <q>` | `audit-catalog.ts search` |
| `bun run audit:emit-stub` | rewrite sample finding + evidence |
| `bun run audit:migrate:sha3` | one-shot normalize inbound/old findings → Phase 2 |

Fingerprint: `evidence.algorithm` + `evidence.digest` (Phase 2; SSOT verify requires `sha3-256`; parse still accepts inbound `sha256` for `audit:migrate:sha3`). Proof claim: `audit-findings-catalog` (continuous — pre-commit when audit SSOT staged · `ci:harness` CHEAP) — see [`docs/harness/PROOF.md`](../harness/PROOF.md).
