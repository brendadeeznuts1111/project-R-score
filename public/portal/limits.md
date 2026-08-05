# Partner account limits

Multi-factor **account limit raises** for partners — handle, CLV, KYC,
violations, chargebacks, volatility, profitability. Board is snapshot-first on
Pages; record/analyze mutations need local Bun + SQLite.

**Tenant SSOT:** [`docs/harness/tenants/partner-limits.md`](../../docs/harness/tenants/partner-limits.md)

| Surface | Path |
|---------|------|
| Portal UI | [`/portal/limits/`](./limits/) |
| Limits lab (forecast) | [`/portal/limits-lab/`](./limits-lab/) |
| Registry bake | [`/registry/limit-raises.json`](../registry/limit-raises.json) (`bun run ops:snapshot`) |
| Forecast bake | [`/registry/limit-forecast-lab.json`](../registry/limit-forecast-lab.json) |
| Scraped observed | [`/registry/scraped-limits-observed.json`](../registry/scraped-limits-observed.json) |
| Live ops summary | `ops-summary.limitChanges` · `/api/operations/summary` |
| Agent raises | `/api/agents/v1/limits/raises?node_id=…` · `?format=table` |
| Public summary | `/api/limits/summary` · `?format=table` |
| Record (local) | `POST /api/agents/v1/limits/record` (Pages → 503 stub) |
| Analyze / predict (local) | `/api/limits/analyze` · `/api/limits/predictions` |
| Routing audit | [routing.md](./routing.md) |

## Related partner domain

| Concern | Where |
|---------|--------|
| Book / sportsbook SSOT | [Bookmakers](./bookmakers/) · [bookmakers.md](./bookmakers.md) · `bookmakers.json` |
| Partner outs · max bet · rails | [Partners](./partners/) · seat-capital-desk |
| Per-account dossier | [Account](./account/) · partner-history |
| Slip / balance **image proof** | [DOD](./dod/) · [dod.md](./dod.md) (confirm amount in Telegram Accounting) |
| Telegram package forums | [telegram.md](./telegram.md) · Factory handshake |
| Soft plays / weeks | Soft export · Partners Soft tables |

Limit raises often key by **node / book** — keep book ids aligned with the
bookmakers registry when correlating coverage.

## CLI

```bash
bun run ops:limits:demo
bun tools/seed-limit-patterns.ts --force --bake
bun run ops:limits:check --multi
bun run ops:limits:predict
bun run ops:limits:analyze
bun run ops:limits:capture          # missing raise context rows
bun run ops:snapshot --no-seed      # limit-raises + embeds
```

## Audit · failure paths

| Symptom | Fix |
|---------|-----|
| Pages agent raises **503** / empty `byNode` | Rebake `limit-raises.json` · demo seed · check lookback window |
| Board metrics zero after deploy | Stale bake · `ops:snapshot` · Pages cache |
| Predict / analyze 503 on Pages | Expected — run local `serve:public` or lab board |
| Book id mismatch vs outs | [bookmakers.md](./bookmakers.md) · seat desk BOOK column |
| Coverage % incomplete | Bind more accounts · `ops:limits:capture` · partners-ops |
| Routing probe miss | [routing.md](./routing.md) · `bun run check:routes` · catalog row present |

## Tests

```bash
bun test tests/limit-raises-ui.test.ts
bun test tests/limit-raise-agent-api.test.ts
bun test tests/pages-local-only-limits.test.ts
bun test tests/portal-domain-gap-map.test.ts
```
