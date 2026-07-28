---
name: branded-ids
description:
  Discover, add, and apply FactoryWager branded domain values (IDs, keys, and
  validated codes). Use for any domain *Id, constructor-tier or guard choice,
  brand coverage, catalog or manifest maintenance, and branded-ID gate failures.
---

# Branded domain values

## Invariant

Domain identities must not travel as bare strings after the wire, CLI, form, or
environment boundary.

```ts
// Wrong
sessionId: string;
function load(accountId: string) {}

// Right
sessionId: SessionId;
function load(accountId: AccountId) {}
```

Import consumers from `lib/types/branded.ts`. The forge itself is split across
eight domain modules under `lib/types/branded/`.

## Start with live discovery

Do not infer a constructor from memory or load every module first.

```bash
bun tools/brand-catalog.ts
bun tools/brand-catalog.ts operations
bun tools/brand-catalog.ts AccountId
bun tools/brand-catalog.ts StateCode --json
```

The current contract is 55 branded values across 9 domains:

- 50 IDs represented by `AnyId` (surfaces: `HostId`, `ApexDomainId`, `SubdomainId`, `SurfaceId`, `PagesProjectId`, `AccessDomainId`)
- `PartnerProfileKey`
- codes: `StateCode`, `ZipCode`, `SurfaceStatusCode`, `SurfaceAccessCode`
- all 55 represented by `AnyBrandedValue`

`lib/types/branded/index.ts#BRAND_CATALOG` is the source catalog.
`lib/types/brand-manifest.json` is generated and must not be hand-edited.

## Choose the constructor tier

| Situation                                             | Tier                      |
| ----------------------------------------------------- | ------------------------- |
| Required, trusted interior value or owned system mint | `asX(value)`              |
| Optional config or soft merge                         | `tryX(value)`             |
| Wire, JSON, CLI, form, or environment ingress         | `parseX(value)`           |
| Already-canonical unknown value that must be narrowed | `BRAND_GUARDS.isX(value)` |

`as*` and `parse*` throw `BrandValidationError` on invalid input. `try*` returns
`undefined`. Missing is never represented by an empty branded string.

Format-aware brands retain their owned constructors. For example,
`asStateCode('ma')` normalizes to `MA`, while `asZipCode` enforces ZIP/ZIP+4.
Guards validate canonical shape only; they do not prove provenance or entity
existence.

## Apply at the boundary

1. Parse once at ingress with `parse*` or the domain-specific boundary parser.
2. Keep the branded type through interior APIs, persistence models, and events.
3. Use `unbrand()` only at an outbound serialization boundary.
4. Do not cast one brand to another. Convert through an owned domain function.
5. Do not forge with `as Type` or `'' as Type`.

Mint authority is catalog metadata:

- `system-internal`: owned generators and factories
- `user-input`: validated user or operator input
- `wire-input`: external payloads through `parse*`

## Add or change a brand

1. Confirm no existing brand has the same meaning.
2. Edit the owning domain module: type, `as*`, `try*`, `parse*`, and
   `*_BRAND_SPECS`.
3. Add the type to `AnyId` when its name ends in `Id`; otherwise add it to
   `AnyBrandedValue`.
4. Extend the compile-only type proof and runtime catalog test.
5. Regenerate the manifest.
6. Run the full brand gate.

```bash
bun tools/brand-manifest.ts
bun test tests/branded-catalog.test.ts
bun run check:brands:all
```

## Audit adoption before migration

Use the read-only coverage report before adding a brand or planning a migration:

```bash
bun tools/brand-coverage.ts
bun tools/brand-coverage.ts --attention
bun tools/brand-coverage.ts --json
```

- `unused`: no consumer reference, constructor, parse, or guard was found.
- `referenced-unconstructed`: consumers name the type but no constructor tier is
  called; inspect for a missing boundary parse.
- `covered`: at least one construction path or guard exists.

The report is evidence for investigation, not permission for bulk deletion.

## Fix gate failures

Run the staged gate before commit:

```bash
bun tools/branded-id-check.ts --staged --strict
```

Brand an owned domain field. Suppress only a genuinely opaque provider key and
record the reason on the declaration line:

```ts
id: string; // brand-ok — opaque provider primary key
```

The staged strict gate has no baseline. The smart repository gate may
grandfather legacy lines only; it never permits a new bare-string ID.

## References

- `lib/types/branded/README.md` — complete maintainer contract
- `lib/types/branded.ts` — stable public import
- `lib/types/branded/_core.ts` — nominal and constructor semantics
- `lib/types/brand-manifest.json` — generated machine record
- `docs/WIRE_BOUNDARY.md` — parse-once boundary policy
- `tests/branded-types.test-d.ts` — nominal type proof
- `tests/branded-catalog.test.ts` — catalog and runtime proof
- `tools/brand-coverage.ts` — read-only adoption and boundary report
- [`../references/agent-tooling.md`](../references/agent-tooling.md) — shared
  scan and commit gates
