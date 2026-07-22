# Synthetic Nagata-type fiber in demo risk scores

> FactoryWager **AuditFinding** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `sample-fiber-demo-2026-07-21` |
| kind | `AuditFinding` |
| status | `confirmed` |
| publishedAt | 2026-07-21 |
| since | 2026-07-21 |
| discoveredIn | 1.4.0 |
| mitigatedIn | _n/a_ |
| docs | [`docs/audit/findings/sample-fiber-demo-2026-07-21.md`](./sample-fiber-demo-2026-07-21.md) |

## Description

Two distinct profile triples (10,5,2) and (8,7,2) yield the same demo risk score while the local Jacobian nullspace is trivial (constant non-zero Jac). Pedagogical stand-in for a Nagata map fiber — not a production sportsbook claim. See concept nagata-map.

## Evidence

| Field | Value |
|-------|-------|
| path | [`tools/audit-evidence/sample-fiber-demo.ndjson`](../../../tools/audit-evidence/sample-fiber-demo.ndjson) |
| algorithm | `sha3-256` |
| digest | `c2373eb12af5ba1f0bc5bd5d3ffd8da5e3caf614b4d7adb2355db276a8fb387f` |
| sha256 companion | `56bf03637d94eb64b3b22ccd7bc379ef53830937ef704838f2aff188b28a4658` |
| mediaType | `application/x-ndjson` |

Verify:

```bash
bun tools/audit-catalog.ts verify
```

## Related (audit SSOT)

- [`nagata-map`](../concepts/nagata-map.md)
- [`jacobian-nullspace`](../concepts/jacobian-nullspace.md)

## Related docs (BunToken / curated — opaque)

_none_

## Meta

- emitter: `audit-emit-stub`
- buildPin: `1.4.0`

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest --audit "sample-fiber-demo-2026-07-21"
bun tools/bun-doc-refs.ts suggest --audit --json "sample-fiber-demo-2026-07-21"
bun tools/bun-doc-refs.ts suggest "Nagata map"
```
