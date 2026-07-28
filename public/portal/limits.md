# Partner account limits

Multi-factor account limit raises for partners.

- Portal UI: `/portal/limits/`
- Live summary: `ops-summary.limitChanges`
- Agent API: `/api/agents/v1/limits/raises?node_id=partner-42`
- Bake: `/registry/limit-raises.json` (`bun run ops:snapshot`)
- CLI: `bun run ops:limits:demo` · `bun run ops:limits:check --multi`

Drivers include handle, CLV, KYC, violations, chargebacks, volatility, and profitability.
