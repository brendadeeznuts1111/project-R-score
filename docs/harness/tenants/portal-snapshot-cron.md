# Tenant: portal-snapshot

**Tenant** `portal-snapshot` **Runs**
`bun lib/operations/portal-snapshot-cron.ts --once` — every `0 */6 * * *`
**UTC** through the spine in-process complement. The reboot-persistent primary
is managed by `bun run portal:snapshot:cron:register`.

**Proof** `portal-snapshot-cron-v1` (claim in `lib/harness/proof.ts`)
**Catalog** `lib/harness/maintenance.ts` · `MAINTENANCE_RUNBOOKS`

The tenant captures the configured `prediction`, `portal`, `gaps`, or `limits`
data-plane scopes. Scope and schedule resolution live in
`tools/portal-snapshot-cron-constants.ts`; both OS and in-process entrypoints
delegate to `runPortalSnapshotCycle`.

## Signal

`bun run spine:schedule:once -- --tenant=portal-snapshot` exits non-zero.
The same failure appears as a failed scope in the snapshot cycle output or a
missing expected manifest.

## Intervention

Catalog intervention:
`bun test tests/portal-snapshot-cron.test.ts · bun lib/operations/portal-snapshot-cron.ts --once --dry-run`

1. Prove schedule parsing and the dry-run capture:
   `bun test tests/portal-snapshot-cron.test.ts`
2. Inspect the effective scopes:
   `PORTAL_SNAPSHOT_SCOPES=prediction,portal bun lib/operations/portal-snapshot-cron.ts --once --dry-run`
3. Re-run the owned tenant:
   `bun run spine:schedule:once -- --tenant=portal-snapshot`
4. Repair the OS schedule, when needed:
   `bun run portal:snapshot:cron:preview` then
   `bun run portal:snapshot:cron:register`

Do **not** remove the tenant or suppress a scope to make a failed capture green.

## Retirement

Remove the spine complement only when OS scheduling and required deploy
verification both own the portal snapshot proof.

**Retirement verified** `false` — set `tenants.portal-snapshot=true` in
`lib/harness/ci-owned-tenants.json` only after that ownership is operational.

**Retirement check** portal-snapshot is owned by a required deploy or operate
schedule →
`bun scripts/retirement-check-ci-owner.ts --tenant=portal-snapshot`

**Owner** `// owner: platform / portal data plane` **Fresh-rerun**
`bun run docs:tenant-portal-snapshot`
