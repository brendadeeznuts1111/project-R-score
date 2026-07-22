# Jacobian nullspace

> FactoryWager **AuditConcept** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `jacobian-nullspace` |
| kind | `AuditConcept` |
| publishedAt | 2026-07-21 |
| since | 2026-07-21 |
| docs | [`docs/audit/concepts/jacobian-nullspace.md`](./jacobian-nullspace.md) |

## Description

Local linear-algebra check on DF(x): a non-trivial null vector would indicate a first-order blind direction. For Nagata-type maps the Jacobian determinant is constant and non-zero, so the nullspace is trivial everywhere — yet a global fiber can still exist. Local gradient checks therefore cannot certify injectivity.

**Proof integrity** — evidence blobs are fingerprinted via `evidence.sha256` (AuditFinding schema) using Bun's native crypto (`node:crypto` / WebCrypto / `Bun.CryptoHasher`; SHA-3 family since Bun 1.3.13 — `crypto.sha3`). Tamper-*authentication* (HMAC/signing) is a separate, unimplemented lane.

## References

_none_

## Related (audit SSOT)

- [`nagata-map`](./nagata-map.md)
- [`sample-fiber-demo-2026-07-21`](../findings/sample-fiber-demo-2026-07-21.md)

## Related docs (BunToken / curated — opaque)

_none_

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest "Jacobian nullspace"
bun tools/bun-doc-refs.ts suggest --audit "jacobian-nullspace"
bun tools/bun-doc-refs.ts suggest --audit --json "jacobian-nullspace"
```
