# Bookmakers

Bookmaker catalog v0.4 contracts and the v0.3 migration boundary.

| Module | Role |
|--------|------|
| [`v04-types.ts`](./v04-types.ts) | Public and operator catalog shapes, fetcher/lifecycle values, regions, and enrichment defaults |
| [`migrate-v03-to-v04.ts`](./migrate-v03-to-v04.ts) | Splits a legacy catalog into public-safe and operator-only artifacts and audits the public projection |
| [`resolve.ts`](./resolve.ts) | Resolve id/slug/label/skin/host against the public mirror (partner register CLI) |

## Data boundary

- Public catalog: `public/registry/bookmakers.json` and
  `artifact-registry/bookmakers/v0.4.0/public/books.json`.
- Operator catalog: `artifact-registry/bookmakers/v0.4.0/ops/books.json`; it is
  never included in the Cloudflare Pages output.
- `restBaseUrl`, credentials/env references, balances, health, and contacts stay
  on the operator side of the split.

## Operate

```bash
bun run bookmakers:migrate
bun test tests/bookmakers-registry-bake.test.ts
bun run lib:domains:check
```

Human runbook: [`docs/harness/tenants/bookmakers-registry.md`](../../docs/harness/tenants/bookmakers-registry.md).
