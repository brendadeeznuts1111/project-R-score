# Harness day-loop scripts

> FactoryWager **AuditConcept** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `harness-day-loop` |
| kind | `AuditConcept` |
| publishedAt | 2026-07-21 |
| since | 2026-07-21 |
| docs | [`docs/audit/concepts/harness-day-loop.md`](./harness-day-loop.md) |

## Description

FactoryWager local day-loop: type-check, affected build/test, bun test --changed / --isolate / --parallel / --shard wrappers, and ci:harness:fast before push. Not Bun upstream CI. Docs: docs/harness/day-loop.md · curated NOTE: docs/guides/bun-test-flags-1.3.13.md.

## References

- docs/harness/day-loop.md
- docs/guides/bun-test-flags-1.3.13.md
- docs/BUN_NATIVE_CAPABILITIES.md — Day-loop tests row
- https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel

## Related (audit SSOT)

_none_

## Related docs (BunToken / curated — opaque)

- `bun test flags`
- `bun test --changed`
- `bun test --isolate`
- `bun test --parallel`
- `bun test --shard`

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest "Harness day-loop scripts"
bun tools/bun-doc-refs.ts suggest --audit "harness-day-loop"
bun tools/bun-doc-refs.ts suggest --audit --json "harness-day-loop"
```
