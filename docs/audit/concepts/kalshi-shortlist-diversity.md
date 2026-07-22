# Kalshi bot shortlist diversity constraints

> FactoryWager **AuditConcept** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `kalshi-shortlist-diversity` |
| kind | `AuditConcept` |
| publishedAt | 2026-07-22 |
| since | _unknown_ |
| docs | [`docs/audit/concepts/kalshi-shortlist-diversity.md`](./kalshi-shortlist-diversity.md) |

## Description

Portfolio selection over scored repos: size 12, max 4 per strategy tag, min 1 per major tag (market_making, arb, sports, news_event, momentum, mean_reversion, llm_ensemble), TS/JS tiebreak within 5 points. Operates above single-repo RepoReport — see docs/FACTOR_STACK.md shortlist scope.

## References

_none_

## Related (audit SSOT)

- [`sha3-integrity`](./sha3-integrity.md)

## Related docs (BunToken / curated — opaque)

- `SHA3-256`

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest "Kalshi bot shortlist diversity constraints"
bun tools/bun-doc-refs.ts suggest --audit "kalshi-shortlist-diversity"
bun tools/bun-doc-refs.ts suggest --audit --json "kalshi-shortlist-diversity"
```
