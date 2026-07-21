# Spine tenants (index)

Continuous-maintenance index for in-process spine tenants.  
Typed catalog: [`lib/harness/maintenance.ts`](../../lib/harness/maintenance.ts) · registry: [`spine/tenants.ts`](../../spine/tenants.ts).

Daemon: `bun run spine:schedule` · once: `bun run spine:schedule:once` · `--tenant=<id>`

## Per-tenant runbooks

Each active tenant **must** have signal · intervention · proof · retirement:

- [`tenants/docs-integrity.md`](tenants/docs-integrity.md) — claim `docs-integrity`
- [`tenants/install-verify.md`](tenants/install-verify.md) — claim `install-verify-journey`

## Cross-references

Closed maintenance loop — each edge is machine-checked by `bun run test:tenant-runbooks`:

- **`TenantRunbook.proofId` → `ProofPath.id`** — why the tenant exists  
  *Ratchet* → `assertRunbookProofLinks`
- **`TenantRunbook.tenant` ↔ `SPINE_TENANTS`** — no orphan docs, no undocumented tenant  
  *Ratchet* → `assertRunbookTenantLinks`
- **`docPath` markdown** — human signal · intervention · retirement sections  
  *Ratchet* → file exists + `## Signal` / `## Intervention` / `## Retirement`
- **`intervention` contains linked proof `freshRerun`** — first repair step is the claim command  
  *Ratchet* → `assertRunbookInterventionContainsProofFreshRerun`
- **Catalog fields non-empty** — `signal` · `intervention` · `retirement`  
  *Ratchet* → `assertRunbookFieldsNonEmpty`

## Ratchet

- **Catalog ↔ tenants ↔ proofs ↔ docs** — full cross-ref set above  
  *Ratchet* → `bun run test:tenant-runbooks` · claim `spine-maintenance-runbooks`
- **Docs render** — `bun run docs:spine-tenants` (this index + live registry)

## Lookup

```bash
bun run docs:spine-tenants
bun run test:tenant-runbooks
bun run docs:tenant-install-verify
bun run docs:tenant-docs-integrity
```
