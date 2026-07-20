# Branded IDs — agent routing

**Canonical import:** `lib/types/branded.ts` (re-exports everything).  
**Institutional record:** `lib/types/brand-manifest.json` (generated; do not hand-edit).

## Just-in-time context

| Need | Load |
|------|------|
| Overview + empty policy | this README |
| Session / request IDs | [session](./session.ts) · [session/README](./session/README.md) |
| User / account / access keys | [identity](./identity.ts) · [identity/README](./identity/README.md) |
| Documents / DNS zones | [documents](./documents.ts) |
| Zero-trust | [security](./security.ts) |
| Jobs / pipelines / webhooks | [operations](./operations.ts) |
| Core tiers + provenance | [_core.ts](./_core.ts) |

## Constructor tiers (capability)

| Tier | When | Failure |
|------|------|---------|
| `asXId(string)` | Value known required | throws `BrandValidationError` if empty |
| `tryXId(string\|null\|undefined)` | Soft config / optional fields | returns `undefined` if blank |
| `parseXId(unknown)` | Wire / JSON / env raw | throws if not non-empty string |

## Mint authority

| Authority | Examples |
|-----------|----------|
| **system-internal** | `asSessionId(crypto.randomUUID())` in session factory |
| **user-input** | CLI argv → `asUserId` after shape checks |
| **wire-input** | API body → `parseZoneId(raw.zone_id)` only |

Never mint credentials or zone IDs from hardcoded source strings.

## Empty-brand policy

Missing is **not** a brand. Do not write `'' as AccountId`. Use `tryAccountId` or throw via `as*` / `parse*`.

## Operable commands

```bash
bun tools/branded-id-check.ts --smart          # cluster inventory
bun tools/branded-id-check.ts --smart --strict # CI gate
bun tools/brand-manifest.ts                    # regenerate manifest
bun tools/brand-manifest.ts --check            # fail if stale
```
