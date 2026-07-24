# TOC Ops — Pages fixture plane

Fixture-first Drum / Buffer / Rope surface for Cloudflare Pages + portal.
Theory SSOT stays in `toc-ops-repo` (TOC-REF · ACCOUNTING · SOPs).

**Schema** `factorywager.toc-ops.portal-fixture.v2` — ONB→FUND→LIMIT→WARM→PLAY→WD,
account limits, rails, Soft/Gate 12, recent plays, switchback experiments.

## Files

| File | Purpose |
|------|---------|
| [`types.ts`](types.ts) | Snapshot + ops-summary slice types |
| [`fixture.ts`](fixture.ts) | ASH (Drum) · PAT (PLAY) · NOV (ONB); bottleneck keys (`reconcile_*` is CT-only) |
| [`identity.ts`](identity.ts) | TOC ↔ ops binding types |
| [`export-snapshot.ts`](export-snapshot.ts) | Bake `public/registry/toc-ops.json` + summary slice |
| [`index.ts`](index.ts) | Barrel exports |
| [`../operations/toc-identity-bridge.ts`](../operations/toc-identity-bridge.ts) | Seed/bind `tree_nodes.call_sign` · hardrock `sb_accounts` |

## Commands

```bash
bun run ops:seed:toc
bun run ops:snapshot --no-routing
bun test tests/toc-ops-fixture.test.ts
```

## Portal

- Board: `/portal/toc/`
- Artifact: `/registry/toc-ops.json`
- Edge GET: `/api/toc` (POST → 503)
- Ops card: `ops-summary.toc`

## Planes (do not conflate)

| Plane | Owns |
|-------|------|
| This fixture (`lib/toc-ops`) | Pages-safe mirror for `/portal/toc` |
| `toc-ops-repo` Central Tool | Live Soft, Gate 12, MessageLog, phones, rails confirm, package bot |
| `/portal/ops` FactoryWager | Partner-profile bridge, channel outbox, phone inventory + TOC rollup card |
| Cloudflare MCP | Pages/account deploy + observability — **not** TOC desk |

Runbook + full concern matrix: [`docs/harness/tenants/toc-ops.md`](../../docs/harness/tenants/toc-ops.md)
