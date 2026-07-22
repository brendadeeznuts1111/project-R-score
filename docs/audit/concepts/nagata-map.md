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

A polynomial automorphism of affine 3-space with constant non-zero Jacobian determinant that is not globally injective. Distinct inputs can share an output along a 1-dimensional algebraic curve (the Nagata fiber). Classical counterexample context for the Jacobian conjecture in dimension ≥ 3 (Masayoshi Nagata, 1972).

## References

- Masayoshi Nagata (1972), On Hilbert's fourteenth problem — polynomial automorphisms with Jac ≡ 1 that are not injective
- Jacobian conjecture (Keller) — open for dim ≥ 2; Nagata-type maps illustrate local invertibility ≠ global injectivity

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
