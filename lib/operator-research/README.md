# Operator research

Pure research-domain helpers used by local operator tooling and portal mock
surfaces. This directory owns calculations and typed projections; HTTP ingress
and static delivery remain under `tools/` and `public/portal/`.

| Module | Role |
|--------|------|
| [`edge-engine.ts`](./edge-engine.ts) | Generate typed event snapshots and detect arbitrage, value, and steam opportunities with Kelly and latency adjustments |

The edge engine consumes merged bookmaker health from
[`../bookmakers/merged-registry.ts`](../bookmakers/merged-registry.ts). Event,
edge, rule, and sportsbook identities use the canonical brands exported by
[`../types/branded.ts`](../types/branded.ts).

```bash
bun test tests/edge-engine.test.ts
bun tools/branded-id-check.ts --strict lib/operator-research
```

There is no barrel; import the module directly.
