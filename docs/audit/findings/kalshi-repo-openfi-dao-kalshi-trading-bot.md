# Kalshi bot candidate: openfi-dao/kalshi-trading-bot

> FactoryWager **AuditFinding** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `kalshi-repo-openfi-dao-kalshi-trading-bot` |
| kind | `AuditFinding` |
| status | `confirmed` |
| publishedAt | 2026-07-22 |
| since | _unknown_ |
| discoveredIn | 2026-07-22T05-50-48-875Z |
| mitigatedIn | _n/a_ |
| docs | [`docs/audit/findings/kalshi-repo-openfi-dao-kalshi-trading-bot.md`](./kalshi-repo-openfi-dao-kalshi-trading-bot.md) |

## Description

Quality score 67.5/100. Strategy: news_event, llm_ensemble. Auth + order paths present — candidate for lifting signing and execution modules separately. Dry-run default detected — safe to sandbox. Watchlist tier — below high-value export threshold; verify before lift. Triaged 2026-08-05 audit-gap batch: confirmed as watchlist (not high-value export); keep under kalshi-shortlist-diversity until re-score.

## Evidence

| Field | Value |
|-------|-------|
| path | [`tools/audit-evidence/kalshi/openfi-dao__kalshi-trading-bot.ndjson`](../../../tools/audit-evidence/kalshi/openfi-dao__kalshi-trading-bot.ndjson) |
| algorithm | `sha3-256` |
| digest | `b15d67acaf6c837f32bb7df08f4324582cdc5e462ec105df44569ec10fc0d96d` |
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
bun tools/bun-doc-refs.ts suggest --audit "kalshi-repo-openfi-dao-kalshi-trading-bot"
bun tools/bun-doc-refs.ts suggest --audit --json "kalshi-repo-openfi-dao-kalshi-trading-bot"
bun tools/bun-doc-refs.ts suggest "Nagata map"
```
