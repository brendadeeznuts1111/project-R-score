# Nagata map

> FactoryWager **AuditConcept** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `nagata-map` |
| kind | `AuditConcept` |
| publishedAt | 2026-07-21 |
| since | 2026-07-21 |
| docs | [`docs/audit/concepts/nagata-map.md`](./nagata-map.md) |

## Description

The Nagata automorphism of affine 3-space: a polynomial automorphism with Jacobian determinant identically 1 that is wild (not tame). Often cited alongside the Jacobian conjecture; as an automorphism it is bijective, not a non-injective fiber counterexample. FactoryWager uses the name for related audit-graph edges (sample finding ↔ concepts).

## References

- Masayoshi Nagata — wild (non-tame) polynomial automorphism of A^3 with Jac ≡ 1
- Jacobian conjecture (Keller) — open for dim ≥ 2; Nagata automorphism illustrates tameness vs Jacobian-determinant questions

## Related (audit SSOT)

- [`sample-fiber-demo-2026-07-21`](../findings/sample-fiber-demo-2026-07-21.md)
- [`jacobian-nullspace`](./jacobian-nullspace.md)
- [`sha3-integrity`](./sha3-integrity.md)

## Related docs (BunToken / curated — opaque)

_none_

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest "Nagata map"
bun tools/bun-doc-refs.ts suggest --audit "nagata-map"
bun tools/bun-doc-refs.ts suggest --audit --json "nagata-map"
```
