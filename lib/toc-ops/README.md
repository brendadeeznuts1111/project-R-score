# TOC Ops — Pages fixture plane

Fixture-first Drum / Buffer / Rope surface for Cloudflare Pages + portal.
Theory SSOT stays in `toc-ops-repo` (TOC-REF · ACCOUNTING · SOPs).

## Files

| File | Purpose |
|------|---------|
| [`types.ts`](types.ts) | Snapshot + ops-summary slice types |
| [`fixture.ts`](fixture.ts) | Deterministic ASH + PAT demo partners/rails/tasks |
| [`export-snapshot.ts`](export-snapshot.ts) | Bake `public/registry/toc-ops.json` + summary slice |
| [`index.ts`](index.ts) | Barrel exports |

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

Runbook: [`docs/harness/tenants/toc-ops.md`](../../docs/harness/tenants/toc-ops.md)
