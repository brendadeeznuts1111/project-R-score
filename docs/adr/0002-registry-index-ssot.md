# ADR-0002: Registry index — R2 is the SSOT, the file is a snapshot

> Status: **decided** (2026-07-24) · Supersedes the P3 discovery finding "two sources of truth"  
> **Linked from:** [`registry-index.md`](../../registry-index.md) · [`docs/README.md`](../README.md) · guides registry stack

## Context

Three writers touched two registry indexes:

- `RegistryClient` (CLI/SDK) → R2 `registry.json` (canonical, etag-guarded)
- serve-public PUT endpoints (`publishVersion`, `npmPublish`) → `public/registry/registry.json` + local `storage/` only, **never R2**

Consequences observed during the alignment sweep: double-scoped r2Keys
(`@factorywager/@factorywager/...`), phantom versions (versions listed with no
release — removed 2026-07-24), fake seed checksums, divergent package sets per
consumer (portal reads file, Pages Functions read R2, monitoring reads file).

## Decision

1. **R2 is the single source of truth** for the registry index and artifacts.
2. **`public/registry/registry.json` is a generated snapshot**, refreshed by
   `bun run factory:snapshot` / `ops:snapshot` — never hand-edited, never a
   write target for new writers.
3. **serve-public PUT endpoints** are a **local dev lane** (loopback only).
   They may keep writing the local file for dev, but every response must say so
   (`X-Registry-Lane: local-dev`) and docs must not present them as the
   production path.
4. **Production publish** goes through `RegistryClient.publish` (R2), then a
   snapshot refresh. The Pages Functions stay read-only (405 for non-GET)
   until an authenticated edge writer is deliberately designed.

## Consequences

- `lib/registry/contracts.ts` `validateRegistryIndex` (with the
  versions↔releases invariant) is the guard: `bun run integrity:check` fails if
  the snapshot and the invariant diverge.
- serve-public metadata encoding is aligned with the SDK (`%40` + preserved `/`)
  — fixed in `f4aaafbf4`.
- Docs claiming `bun publish --registry https://registry.factory-wager.com`
  works must be corrected to name the local lane until the edge writer exists.

## Follow-ups (not in scope here)

- Serve-public PUTs call `RegistryClient.publish` when R2 env is present
  (single-writer consolidation).
- `factory:snapshot` merge/warn instead of blind overwrite when the file has
  local-only packages.
- Authenticated `PUT` in Pages Functions (design doc required — token scope,
  replay protection, R2 write perms).

## Addendum — 2026-07-28 bucket audit (B4/B5/B6 of `docs/harness/tenants/remaining-work.md`)

Verified via SigV4 `ListObjectsV2` against `factory-wager-registry`:

1. **The R2 artifact plane was activated on 2026-08-04.** The first canonical
   object is `@tennis-hq/ssot/1.5.0.tgz`: 11,204 bytes with SHA-256
   `a6c0e9502cdb1c30d37e7579ed3d90e475cc28e6e0f46e0837394524f8cc8f55`.
   A direct `RegistryClient.install()` download verified the stored byte length
   and checksum after `factory publish`; the R2 index now resolves `latest` to
   `1.5.0`. The committed static snapshot remains the Pages fallback, refreshed
   from R2 with `factory snapshot`.
2. **Bucket multi-tenancy is accepted.** The registry index and the telegram
   event channels share the bucket. The enforced read boundary is the edge
   allowlist (`lib/factory/http-keys.ts`) — `channels/*` keys can never be
   served publicly; anonymous reads only get allowlisted keys. Split into a
   dedicated channels bucket only if write-scope separation is ever required.
3. **`registry-write.internal.factory-wager.com` is retired.** The documented
   private publish plane was never provisioned (no DNS, no server). The surface
   is `status = "retired"` in `config/surfaces.toml`; write origins remain the
   local gateway (`:3000`, Bearer) and direct-to-R2 SigV4 (`factory publish`).
4. **Housekeeping:** `channels/_probe/channel-plane.txt` (leftover probe) was
   deleted from the bucket 2026-07-28 (12 → 11 objects).
