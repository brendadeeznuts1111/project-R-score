# harness

Harness proof paths.

Inventory: [`../README.md`](../README.md). Do not treat nested dumps as new API surface.

- **`proof.ts`** — critical proof-path catalog (`evidence` + `freshRerun`)  
  *Ratchet* → [`docs/harness/PROOF.md`](../../docs/harness/PROOF.md) · [`docs/harness/FRESH-RERUN.md`](../../docs/harness/FRESH-RERUN.md) · `bun run harness:status`
- **`maintenance.ts`** — `TenantRunbook` catalog (signal · intervention · proof · retirement)  
  *Ratchet* → `bun run test:tenant-runbooks` · [`docs/harness/spine-tenants.md`](../../docs/harness/spine-tenants.md)
- **`cron.ts`** — Bun.cron surface (OS-persistent primary · in-process complement)  
  *Ratchet* → `bun run test:cron` · [`docs/harness/cron.md`](../../docs/harness/cron.md)

Daemon: [`spine/scheduler.ts`](../../spine/scheduler.ts) · tenants: [`spine/tenants.ts`](../../spine/tenants.ts).
