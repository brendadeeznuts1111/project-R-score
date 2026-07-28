---
title: Registry index
---

# Registry bake index

Machine-readable proofs and operator bakes live on **Cloudflare Pages** (not this wiki host).

**Base:** [score.factory-wager.com/registry/](https://score.factory-wager.com/registry/)

**Cross-links SSOT:** [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json) · human hub: [`wiki-index.md`](wiki-index.md)

## Operator bakes

| Artifact | JSON | Bake |
|----------|------|------|
| Ops summary | [ops-summary.json](https://score.factory-wager.com/registry/ops-summary.json) | `bun run ops:snapshot` |
| Portal weave | [portal-weave.json](https://score.factory-wager.com/registry/portal-weave.json) | `ops:snapshot` / `compliance:bake` |
| Compliance board | [compliance-board.json](https://score.factory-wager.com/registry/compliance-board.json) | `bun run compliance:bake` |
| Telegram handshake | [telegram-handshake.json](https://score.factory-wager.com/registry/telegram-handshake.json) | `telegram:handshake:readiness --deep` |
| Seat capital desk | [seat-capital-desk.json](https://score.factory-wager.com/registry/seat-capital-desk.json) | `seat:desk:refresh` |
| TOC Ops | [toc-ops.json](https://score.factory-wager.com/registry/toc-ops.json) | `ops:seed:toc` |
| Monitoring | [monitoring.json](https://score.factory-wager.com/registry/monitoring.json) | `ops:snapshot` |
| Limit raises | [limit-raises.json](https://score.factory-wager.com/registry/limit-raises.json) | `ops:snapshot` · multi-factor · [`partner-limits.md`](docs/harness/tenants/partner-limits.md) |
| Doc index | [doc-index.json](https://score.factory-wager.com/registry/doc-index.json) | `bun run build:doc-index` |
| Verification | [verification-index.json](https://score.factory-wager.com/registry/verification-index.json) | `bun run verify-all` |

## Portal boards (consume registry)

| Board | URL |
|-------|-----|
| Ops | [/portal/ops/](https://score.factory-wager.com/portal/ops/) |
| Compliance | [/portal/compliance/](https://score.factory-wager.com/portal/compliance/) |
| Partner limits | [/portal/limits/](https://score.factory-wager.com/portal/limits/) |
| Partner history | [/portal/partner-history/](https://score.factory-wager.com/portal/partner-history/) |
| TOC Ops | [/portal/toc/](https://score.factory-wager.com/portal/toc/) |
| Monitoring | [/monitoring/](https://score.factory-wager.com/monitoring/) |

Routing: [`docs/platform-routing.md`](docs/platform-routing.md)
