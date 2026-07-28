# Partner account limits

Multi-factor account limit raises for partners.

**Tenant SSOT:** [`docs/harness/tenants/partner-limits.md`](../../docs/harness/tenants/partner-limits.md)

| Surface | Path |
|---------|------|
| Portal UI | `/portal/limits/` |
| Registry bake | `/registry/limit-raises.json` (`bun run ops:snapshot`) |
| Live ops summary | `ops-summary.limitChanges` · `/api/operations/summary` |
| Agent raises | `/api/agents/v1/limits/raises?node_id=partner-42` · `?format=table` |
| Public summary | `/api/limits/summary` · `?format=table` |
| Record (local) | `POST /api/agents/v1/limits/record` (Pages → 503 stub) |
| Analyze / predict (local) | `/api/limits/analyze` · `/api/limits/predictions` |

```bash
bun run ops:limits:demo
bun tools/seed-limit-patterns.ts --force --bake
bun run ops:limits:check --multi
bun run ops:limits:predict
bun run ops:limits:analyze
```

Drivers include handle, CLV, KYC, violations, chargebacks, volatility, and profitability.
