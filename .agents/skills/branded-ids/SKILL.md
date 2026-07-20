---
name: branded-ids
description: Discover and apply FactoryWager branded ID types (SessionId, AccountId, …). Use when minting IDs, fixing unbranded string fields, or choosing as*/try*/parse* constructors. MANDATORY for any domain *Id — pre-commit blocks bare string.
---

# Branded IDs skill

## Hard rule (agents)

**Domain ID types MUST be branded strings.** Do not write:

```ts
sessionId: string
userId?: string
function f(accountId: string) { … }
```

Write:

```ts
import { asSessionId, parseUserId, type AccountId, type SessionId } from "lib/types/branded";

sessionId: SessionId
userId?: UserId
function f(accountId: AccountId) { … }
```

Pre-commit runs `bun tools/branded-id-check.ts --staged --strict` with **no baseline**. Mid-line function parameters are detected. Commits that add bare-string domain IDs fail.

## When to use

- Adding or typing any `*Id` / `*_id` field or parameter
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
Agent entry: `AGENTS.md` (branded IDs are mandatory)  
Standards: `.custom-instructions.md` · `docs/DEVELOPMENT-STANDARDS.md` (domain strings)  
Wire boundary: `docs/WIRE_BOUNDARY.md` (`parse*` is the edge; brands travel after it)

## Apply

| Situation | Constructor |
|-----------|-------------|
| Required string known good | `asSessionId(value)` |
| Optional / soft config merge | `tryAccountId(env)` → `undefined` if blank |
| Wire / JSON / unknown | `parseZoneId(raw.zone_id)` — may throw |
| Missing credentials | **never** `'' as AccountId` |

Mint authority (from catalog): `system-internal` · `user-input` · `wire-input`.

## Mandatory check before commit

Run this on your diff **before** committing. Pre-commit runs the same command with **no baseline**, so any new bare-string domain ID blocks the commit.

```bash
bun tools/branded-id-check.ts --staged --strict
```

If it fails, either brand the field/parameter or explicitly suppress an opaque primary key:

```ts
id: string; // brand-ok — opaque entity primary key
```

Bare `id: string` / `_id: string` is no longer silently auto-suppressed — every opaque primary key must carry an explicit `// brand-ok` decision.

## Verify

```bash
bun tools/branded-id-check.ts --staged --strict   # your diff (what hooks run)
bun tools/branded-id-check.ts --smart --strict    # repo-wide
bun tools/brand-manifest.ts --check
bun run check:brands:all
```

Intentional opaque passthrough only: end the line with `// brand-ok`.

## Pattern (every domain module)

`lib/types/branded/{session,identity,documents,security,deployment,audit,operations}.ts` each export:
`type` + `as*` + `try*` + `parse*` + `*_BRAND_SPECS`.
