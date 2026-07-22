# Kalshi bot candidate: OctagonAI/kalshi-trading-bot-cli

> FactoryWager **AuditFinding** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `kalshi-repo-octagonai-kalshi-trading-bot-cli` |
| kind | `AuditFinding` |
| status | `open` |
| publishedAt | 2026-07-22 |
| since | _unknown_ |
| discoveredIn | 2026-07-22T04-59-00-818Z |
| mitigatedIn | _n/a_ |
| docs | [`docs/audit/findings/kalshi-repo-octagonai-kalshi-trading-bot-cli.md`](./kalshi-repo-octagonai-kalshi-trading-bot-cli.md) |

## Description

Quality score 84.75/100. Strategy: market_making, sports, news_event, momentum, llm_ensemble. Auth + order paths present — candidate for lifting signing and execution modules separately. Dry-run default detected — safe to sandbox. Missing test coverage on extracted paths.

## Evidence

| Field | Value |
|-------|-------|
| path | [`tools/audit-evidence/kalshi/octagonai__kalshi-trading-bot-cli.ndjson`](../../../tools/audit-evidence/kalshi/octagonai__kalshi-trading-bot-cli.ndjson) |
| algorithm | `sha3-256` |
| digest | `6e7e4934e59648439a3a89fcbbfb4542dc3fe1b07f76fc1c0b763654851b70d4` |
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
bun tools/bun-doc-refs.ts suggest --audit "kalshi-repo-octagonai-kalshi-trading-bot-cli"
bun tools/bun-doc-refs.ts suggest --audit --json "kalshi-repo-octagonai-kalshi-trading-bot-cli"
bun tools/bun-doc-refs.ts suggest "Nagata map"
```
