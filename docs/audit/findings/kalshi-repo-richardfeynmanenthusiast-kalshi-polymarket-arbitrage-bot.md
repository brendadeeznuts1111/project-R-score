# Kalshi bot candidate: RichardFeynmanEnthusiast/kalshi-polymarket-arbitrage-bot

> FactoryWager **AuditFinding** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `kalshi-repo-richardfeynmanenthusiast-kalshi-polymarket-arbitrage-bot` |
| kind | `AuditFinding` |
| status | `open` |
| publishedAt | 2026-07-22 |
| since | _unknown_ |
| discoveredIn | 2026-07-22T06-19-51-053Z |
| mitigatedIn | _n/a_ |
| docs | [`docs/audit/findings/kalshi-repo-richardfeynmanenthusiast-kalshi-polymarket-arbitrage-bot.md`](./kalshi-repo-richardfeynmanenthusiast-kalshi-polymarket-arbitrage-bot.md) |

## Description

Quality score 69.5/100. Strategy: market_making, arb, news_event. Auth + order paths present — candidate for lifting signing and execution modules separately. Dry-run default detected — safe to sandbox.  Watchlist tier — below high-value export threshold; verify before lift.

## Evidence

| Field | Value |
|-------|-------|
| path | [`tools/audit-evidence/kalshi/richardfeynmanenthusiast__kalshi-polymarket-arbitrage-bot.ndjson`](../../../tools/audit-evidence/kalshi/richardfeynmanenthusiast__kalshi-polymarket-arbitrage-bot.ndjson) |
| algorithm | `sha3-256` |
| digest | `e3ba946f0e10f7927086bd0a996aedce7dbb7d80ebd614fc9bc9f29eb443eb57` |
| mediaType | `application/x-ndjson` |

Verify:

```bash
bun tools/audit-catalog.ts verify
```

## Related (audit SSOT)

- [`kalshi-shortlist-diversity`](../concepts/kalshi-shortlist-diversity.md)
- [`sha3-integrity`](../concepts/sha3-integrity.md)
- [`nagata-map`](../concepts/nagata-map.md)

## Related docs (BunToken / curated — opaque)

- `SHA3-256`

## Meta

- emitter: `kalshi-bot-research`
- buildPin: `0.2.0`

## Suggest

```bash
bun tools/bun-doc-refs.ts suggest --audit "kalshi-repo-richardfeynmanenthusiast-kalshi-polymarket-arbitrage-bot"
bun tools/bun-doc-refs.ts suggest --audit --json "kalshi-repo-richardfeynmanenthusiast-kalshi-polymarket-arbitrage-bot"
bun tools/bun-doc-refs.ts suggest "Nagata map"
```
