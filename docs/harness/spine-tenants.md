# Spine tenants (index)

Continuous-maintenance index for in-process spine tenants.  
Typed catalog: [`lib/harness/maintenance.ts`](../../lib/harness/maintenance.ts) · registry: [`spine/tenants.ts`](../../spine/tenants.ts).

Daemon: `bun run spine:schedule` · once: `bun run spine:schedule:once` · `--tenant=<id>`

## Per-tenant runbooks

Each active tenant **must** have signal · intervention · proof · retirement:

- [`tenants/docs-integrity.md`](tenants/docs-integrity.md) — claim `docs-integrity`
- [`tenants/install-verify.md`](tenants/install-verify.md) — claim `install-verify-journey`

## Ratchet

- **Catalog ↔ tenants** — every `SPINE_TENANTS` id has a `TenantRunbook`  
  *Ratchet* → `bun run test:tenant-runbooks` · claim `spine-maintenance-runbooks`
- **Docs render** — `bun run docs:spine-tenants` (this index + live registry)

## Lookup

```bash
bun run docs:spine-tenants
bun run test:tenant-runbooks
bun run docs:tenant-install-verify
bun run docs:tenant-docs-integrity
```
