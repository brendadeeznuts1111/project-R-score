# Tenant: ops-snapshot

**Tenant** `ops-snapshot` **Runs** `bun lib/operations/snapshot-cron.ts --once`
— every `*/10 * * * *` **UTC** via spine **in-process** `Bun.cron` complement
**Proof** `ops-snapshot-cron-v1` (claim in `lib/harness/proof.ts`)
**Catalog** `lib/harness/maintenance.ts` · `MAINTENANCE_RUNBOOKS`

Refreshes portal/Pages artifacts:

- `public/registry/ops-summary.json` (dashboard cards)
- `public/registry/monitoring.json`
- `public/registry/static.json`
- `@factorywager/bun-utils-test` + `routing-test` proofs
- prediction report (unless `--no-report`)

Uses routing proof **retry + TTL cache** (`lib/routing-proof.ts` ·
`getRoutingProof`). Next fire waits for the snapshot Promise (**no overlap**).

## Signal (failure)

`bun run spine:schedule:once -- --tenant=ops-snapshot` exits non-zero.
Also: missing/stale `public/registry/ops-summary.json`, or ops dashboard
routing card shows `criticalFailed > 0` after a successful write.

## Intervention (repair)

Catalog intervention:
`bun test tests/ops-snapshot-cron.test.ts · bun lib/operations/snapshot-cron.ts --once`

1. Re-run: `bun run spine:schedule:once -- --tenant=ops-snapshot`
2. Local smoke: `bun run ops:snapshot -- --no-routing`
3. Force routing: `bun lib/operations/snapshot-cron.ts --once --force-routing`
4. Check `data/operations.db` and network reachability of
   `REGISTRY_URL` / `FACTORY_REGISTRY_URL` (default score.factory-wager.com)

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
