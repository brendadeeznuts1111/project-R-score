# SHA3 evidence integrity

> FactoryWager **AuditConcept** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `sha3-integrity` |
| kind | `AuditConcept` |
| publishedAt | 2026-07-21 |
| since | 1.3.13 |
| docs | [`docs/audit/concepts/sha3-integrity.md`](./sha3-integrity.md) |

## Description

FactoryWager AuditFinding evidence blobs are fingerprinted primarily with SHA3-256 via Bun.CryptoHasher('sha3-256') (algorithm enum still allows sha256 for inbound). Wire shape is evidence.algorithm + evidence.digest (Phase 2). This is tamper-detection only — keyed authentication (HMAC/signing) is a separate, unimplemented lane.

Bun shipped native SHA-3 support in v1.3.13 (WebCrypto SHA3-* + node:crypto / CryptoHasher). See relatedDocs SHA3-256 for the ship note.

## References

- https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto
- lib/audit/audit-finding.ts — hashFile / verifyEvidenceHash

## Related (audit SSOT)

- [`sample-fiber-demo-2026-07-21`](../findings/sample-fiber-demo-2026-07-21.md)
- [`jacobian-nullspace`](./jacobian-nullspace.md)
- [`nagata-map`](./nagata-map.md)

## Related docs (BunToken / curated — opaque)

- `SHA3-256`

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest "SHA3 evidence integrity"
bun tools/bun-doc-refs.ts suggest --audit "sha3-integrity"
bun tools/bun-doc-refs.ts suggest --audit --json "sha3-integrity"
```
