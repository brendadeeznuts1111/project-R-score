# TOC Ops — Pages fixture plane

Fixture-first Drum / Buffer / Rope surface for Cloudflare Pages + portal.
Theory SSOT stays in `toc-ops-repo` (TOC-REF · ACCOUNTING · SOPs).

**Schema** `factorywager.toc-ops.portal-fixture.v2` — ONB→FUND→LIMIT→WARM→PLAY→WD,
account limits, rails, Soft/Gate 12, recent plays, switchback experiments,
operate-lite Hard Gate bake (`enforcement` slice).

## Files

| File | Purpose |
|------|---------|
| [`types.ts`](types.ts) | Snapshot + ops-summary slice types |
| [`fixture.ts`](fixture.ts) | ASH (Drum) · PAT (PLAY) · NOV (ONB); bottleneck keys (`reconcile_*` is CT-only) |
| [`enforcement.ts`](enforcement.ts) | Operate-lite Hard Gates · T/I/OE · Rope→Drum→Buffer diagnosis |
| [`return-efficiency.ts`](return-efficiency.ts) | R_P / CE / LE · dynamic buffer · ranked next actions |
| [`identity.ts`](identity.ts) | TOC ↔ ops binding types |
| [`export-snapshot.ts`](export-snapshot.ts) | Bake via `withTocMetrics` + summary slice |
| [`index.ts`](index.ts) | Barrel exports |
| [`../operations/toc-identity-bridge.ts`](../operations/toc-identity-bridge.ts) | Seed/bind `tree_nodes.call_sign` · hardrock `sb_accounts` |
| [`../operations/toc-soft-balance.ts`](../operations/toc-soft-balance.ts) | Append-only Soft journal in ops SQLite |

## Commands

```bash
bun run ops:seed:toc
bun run ops:snapshot --no-routing
bun test tests/toc-ops-fixture.test.ts tests/toc-ops-enforcement.test.ts tests/toc-ops-return-efficiency.test.ts
```

## Return efficiency

`return-efficiency.ts` bakes R_P / CE_asset / LE, dynamic buffer (`floatTarget`, `settlementFloatRatio`, `throttleOnboarding`), and `rankedActions` into the fixture at export. Theory SSOT: `toc-ops-repo/docs/system/ACCOUNTING.md`.

## Portal

- Board: `/portal/toc/`
- Artifact: `/registry/toc-ops.json`
- Edge GET: `/api/toc` (POST → 503)
- Ops card: `ops-summary.toc`

## Planes (do not conflate)

| Plane | Owns |
|-------|------|
| This fixture (`lib/toc-ops`) | Pages-safe mirror for `/portal/toc` |
| Operate-lite bake | Hard Gate eval + Soft seed (local); no Pages mutations |
| `toc-ops-repo` Central Tool | Live Soft, Gate 12, MessageLog, phones, rails confirm, package bot |
| `/portal/ops` FactoryWager | Partner-profile bridge, channel outbox, phone inventory + TOC rollup card |
| Cloudflare MCP | Pages/account deploy + observability — **not** TOC desk |

Runbook + full concern matrix: [`docs/harness/tenants/toc-ops.md`](../../docs/harness/tenants/toc-ops.md)
