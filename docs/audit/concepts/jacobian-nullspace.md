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

Local linear-algebra check on DF(x): a non-trivial null vector would indicate a first-order blind direction. For Nagata-type automorphisms the Jacobian determinant is constant and non-zero, so the nullspace is trivial everywhere — local invertibility does not by itself settle tameness or Jacobian-conjecture questions. Local gradient checks therefore cannot certify the global picture.

**Proof integrity** — evidence blobs are fingerprinted via evidence.algorithm + evidence.digest (primary sha3-256). See concept sha3-integrity. Tamper-*authentication* (HMAC/signing) is a separate, unimplemented lane.

## References

_none_

## Related (audit SSOT)

- [`nagata-map`](./nagata-map.md)
- [`sample-fiber-demo-2026-07-21`](../findings/sample-fiber-demo-2026-07-21.md)
- [`sha3-integrity`](./sha3-integrity.md)

## Related docs (BunToken / curated — opaque)

_none_

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest "Jacobian nullspace"
bun tools/bun-doc-refs.ts suggest --audit "jacobian-nullspace"
bun tools/bun-doc-refs.ts suggest --audit --json "jacobian-nullspace"
```
