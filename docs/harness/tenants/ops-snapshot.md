# Tenant: ops-snapshot

**Tenant** `ops-snapshot` **Runs** `bun lib/operations/snapshot-cron.ts --once`
— every `*/10 * * * *` **UTC** via spine **in-process** `Bun.cron` complement
**Proof** `ops-snapshot-cron-v1` (claim in `lib/harness/proof.ts`)
**Catalog** `lib/harness/maintenance.ts` · `MAINTENANCE_RUNBOOKS`

Refreshes portal/Pages artifacts:

- `public/registry/ops-summary.json` (dashboard cards; embeds `proofTaxonomy` slice when taxonomy audit runs first)
- `public/registry/proof-taxonomy-audit.json` (subsystem contracts + consistency — written before ops-summary)
- `public/registry/monitoring.json`
- `public/registry/static.json`
- `public/registry/dod-queue.json` (+ bakes `#dod-embed` on `/portal/dod/`)
- `public/registry/toc-ops.json` (+ bakes `#toc-embed` on `/portal/toc/` · ops-summary `toc` slice)
- `public/registry/compliance-board.json` (+ enhancements/shadow · portal embed · ops-summary `compliance` slice; disable with `--no-compliance` / `OPS_SNAPSHOT_COMPLIANCE=0`)
- tenant slices `public/registry/{factory,science,tennis}/registry.json` (when thin)
- `@factorywager/bun-utils-test` + `routing-test` proofs
- prediction report (unless `--no-report`)
- `public/registry/release-features.json` channel meta merge (prefer-artifact;
  disable with `--no-channel-meta` / `OPS_SNAPSHOT_CHANNEL_META=0`) · claim
  `channel-meta-verification-v1`

**Populate demos (Pages “looks live”):** `bun run ops:snapshot:demo` runs
`ops:seed:all` (ops + prediction + DOD + partner profiles/channels/accounts +
TOC Ops fixture + tenants) then snapshot. Snapshot itself auto-seeds empty ops /
prediction / DOD / partner bindings / missing `toc-ops.json` unless `--no-seed`,
and always refreshes `catalog-snapshot.json` + `toc-ops.json`.

TOC board: [`toc-ops.md`](toc-ops.md) · `/portal/toc/` · concern matrix (rails/accounts/Soft/bots vs Cloudflare MCP) in that tenant.

Uses routing proof **retry + TTL cache** (`lib/routing-proof.ts` ·
`getRoutingProof`). Next fire waits for the snapshot Promise (**no overlap**).

## Signal (failure)

`bun run spine:schedule:once -- --tenant=ops-snapshot` exits non-zero.
Also: missing/stale `public/registry/ops-summary.json`, or ops dashboard
routing card shows `criticalFailed > 0` after a successful write.

Proofs green but liquidity/plays empty → read [`ops-summary-endpoint.md`](../ops-summary-endpoint.md)
(two pipelines; empty ops DB is not a failed summary assemble). Diagnose: `bun run ops:diagnose`.

## Intervention (repair)

Catalog intervention:
`bun test tests/ops-snapshot-cron.test.ts · bun lib/operations/snapshot-cron.ts --once`

1. Re-run: `bun run spine:schedule:once -- --tenant=ops-snapshot`
2. Local smoke: `bun run ops:snapshot -- --no-routing`
3. Force routing: `bun lib/operations/snapshot-cron.ts --once --force-routing`
4. Check `data/operations.db` and network reachability of the **Pages public
   origin** (`ROUTING_PROBE_BASE_URL` or default `https://score.factory-wager.com`).
   `REGISTRY_URL` is the npm registry API — not the routing probe target.

Do **not** delete the tenant to green the daemon.

## Retirement

Remove when a required CI/Pages deploy pipeline always runs `ops:snapshot`
before publish and spine is no longer the periodic owner. Keep
`spine-multi-tenant` ≥2 via another tenant.

**Retirement verified** `false` — set `tenants.ops-snapshot=true` in
[`lib/harness/ci-owned-tenants.json`](../../../lib/harness/ci-owned-tenants.json)
when CI owns the periodic refresh.

**Retirement check** ops-snapshot is owned by CI/Pages deploy pipeline →
`bun scripts/retirement-check-ci-owner.ts --tenant=ops-snapshot`

**Owner** `// owner: platform / ops portal` **Fresh-rerun**
`bun run docs:tenant-ops-snapshot`
