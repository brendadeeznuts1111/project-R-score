---
name: branded-ids
description: Discover and apply FactoryWager branded ID types (SessionId, AccountId, …). Use when minting IDs, fixing unbranded string fields, or choosing as*/try*/parse* constructors.
---

# Branded IDs skill

## When to use
- Adding or typing any `*Id` / `*_id` field
- Choosing between `asXId`, `tryXId`, `parseXId`
- Pre-commit / `check:brands` failures
- Auditing credential or session boundaries

## Discover (JIT — do not load the whole forge first)

```bash
bun tools/brand-catalog.ts                 # domains + brand names
bun tools/brand-catalog.ts session         # one domain
bun tools/brand-catalog.ts AccountId       # one brand (tiers + mint authority)
bun tools/brand-catalog.ts identity --json # machine-readable
```

Institutional record: `lib/types/brand-manifest.json`  
Agent map: `lib/types/branded/README.md`  
Stable import: `lib/types/branded.ts`

## Apply

| Situation | Constructor |
|-----------|-------------|
| Required string known good | `asSessionId(value)` |
| Optional / soft config merge | `tryAccountId(env)` → `undefined` if blank |
| Wire / JSON / unknown | `parseZoneId(raw.zone_id)` — may throw |
| Missing credentials | **never** `'' as AccountId` |

Mint authority (from catalog): `system-internal` · `user-input` · `wire-input`.

## Verify

```bash
bun tools/branded-id-check.ts --smart --strict
bun tools/brand-manifest.ts --check
```

## Pattern (every domain module)

`lib/types/branded/{session,identity,documents,security,deployment,audit,operations}.ts` each export:
`type` + `as*` + `try*` + `parse*` + `*_BRAND_SPECS`.
