# Operator research

Research-domain helpers for bookmaker discovery, live odds monitoring, and
portal agent-odds surfaces. HTTP ingress and static delivery remain under
`tools/` and `public/portal/`.

| Module | Role |
|--------|------|
| [`edge-engine.ts`](./edge-engine.ts) | Portal agent-odds uncovered edges: arb/value/steam, Kelly, latency (brands) |
| [`odds/`](./odds/) | Bun-native live odds pipeline: prewarm, fetch, diff, store, patterns, cron, WS |
| [`matching/`](./matching/) | Cross-book matching, line movement, arbitrage, alerts |
| [`normalization/`](./normalization/) | Odds format conversion, team/market seed store |
| [`doctor.ts`](./doctor.ts) · [`platform.ts`](./platform.ts) | Runtime/capability checks |

Event, edge, rule, sportsbook, and host identities use brands from
[`../types/branded.ts`](../types/branded.ts).

```bash
bun test tests/edge-engine.test.ts
bun test tests/operator-odds-pipeline.test.ts
bun run agent detect-edges --host hardrock.bet --seed-fixtures
bun run agent monitor-odds --once --hosts hardrock.bet
bun tools/branded-id-check.ts --strict lib/operator-research
```

CLI: [`tools/operator-agent.ts`](../../tools/operator-agent.ts) (`bun run agent …`).
Portal dashboard serve (separate): `bun run agent:odds-dashboard`.
