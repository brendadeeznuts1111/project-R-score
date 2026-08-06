# Kalshi bot candidate: OctagonAI/kalshi-trading-bot-cli

> FactoryWager **AuditFinding** — sibling SSOT (not BunToken / bun.com).

| Field | Value |
|-------|-------|
| id | `kalshi-repo-octagonai-kalshi-trading-bot-cli` |
| kind | `AuditFinding` |
| status | `confirmed` |
| publishedAt | 2026-07-22 |
| since | _unknown_ |
| discoveredIn | 2026-07-22T05-50-48-875Z |
| mitigatedIn | _n/a_ |
| docs | [`docs/audit/findings/kalshi-repo-octagonai-kalshi-trading-bot-cli.md`](./kalshi-repo-octagonai-kalshi-trading-bot-cli.md) |

## Description

Quality score 84.75/100. Strategy: market_making, sports, news_event, momentum, llm_ensemble. Auth + order paths present — candidate for lifting signing and execution modules separately. Dry-run default detected — safe to sandbox. Missing test coverage on extracted paths. Triaged 2026-08-05 audit-gap batch: confirmed as high-value shortlist candidate under kalshi-shortlist-diversity (lift signing/execution modules separately; do not wholesale-vend).

## Evidence

| Field | Value |
|-------|-------|
| path | [`tools/audit-evidence/kalshi/octagonai__kalshi-trading-bot-cli.ndjson`](../../../tools/audit-evidence/kalshi/octagonai__kalshi-trading-bot-cli.ndjson) |
| algorithm | `sha3-256` |
| digest | `ff8b653fd1b3d22e440f93e59b18be5daf5cda65196533f65e2768bbec2238c1` |
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
