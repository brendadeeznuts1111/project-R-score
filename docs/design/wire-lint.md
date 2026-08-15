# Wire lint (Layer C)

**Claim** `partner-surface-inventory` · script
`bun run partner-surface-inventory:lint-wires`

Inventory-driven ban on naked branded annotations (`outId: string`,
`partnerId: string`, …) outside registered adapter paths.

## Purpose

Prevent bare wire / identity fields from leaking past the parse boundary.
Interior code should use brands (`OutId`, `PartnerCode`, `ExternalPartnerId`, …)
or an explicit `ExternalPartnerRef` quarantine — not unqualified `*: string`.

## How it works

1. Every `aspect: wire-field` row contributes:
   - **patterns** — TypeScript identifiers (`pattern` / `patterns`, else simple
     `wireName` / `token`)
   - **brandedType** — expected type in errors (defaults to `resolvesTo`)
   - **boundaryPathGlobs** — allowlist where naked annotations are OK
2. Rows with the same `brandedType` **merge** (union of patterns + globs).
3. Complex wire names (`partners[].id`) contribute globs only; sibling rows
   supply simple patterns for that brand family.
4. `ExternalPartnerRef` rows are **not** skipped — they define raw-string
   allowlists for `partnerId` / `partner_id`.

Trap rows (empty globs, e.g. unqualified `partnerId`, `externalRef`) document
unregistered adapters and shape the fix text.

## Adding a new rule

In
[`lib/docs/partner-surface-inventory.ts`](../../lib/docs/partner-surface-inventory.ts):

```ts
row({
  id: 'wire.outId',
  aspect: 'wire-field',
  token: 'outId',
  typeOrExport: 'OutId',
  // …
  wireField: {
    wireName: 'outId',
    sourceSystemId: 'seat-desk',
    resolvesTo: 'OutId',
    brandedType: 'OutId',
    pattern: 'outId',
    quarantineOnFail: true,
    boundaryPathGlobs: ['lib/telegram/seat-intake.ts'],
  },
});
```

Then `bun run partner-surface-inventory:bake`.

## Suppressing violations

```ts
partnerId: string; // wire-ok: sports API parse
// brand-ok — opaque research wire
outId: string;
```

Same / previous / next line. Optional `: reason`; required when the bag sets
`requireReason: true`.

## Running locally

```bash
bun run partner-surface-inventory:lint-wires          # --scan via package.json
bun scripts/validate-wire-traps.ts                   # help
bun scripts/validate-wire-traps.ts --why
bun scripts/validate-wire-traps.ts --document        # inventory + this guide
bun scripts/validate-wire-traps.ts --rules           # dump rule families
bun scripts/validate-wire-traps.ts --scan --strict-globs
bun scripts/validate-wire-traps.ts --scan --fix     # non-strict allowlist only
```

`--fix` appends `// wire-ok: <brandedType> boundary` on **non-strict**
allowlisted naked hits. It never rewrites trap-row or outside-allowlist errors
(those need a brand, a new glob, or a hand-written suppression).

Pre-commit uses `--scan --staged` for ordinary TypeScript changes, a full
non-strict scan for lint-engine changes, and a full `--strict-globs` scan when
the inventory SSOT changes. Optional checkout absence therefore cannot block an
engine fix, while allowlist drift still fails closed at its owning boundary.
Escape: `SKIP_WIRE_LINT=1`.

Inventory validate also checks wire bags (`pattern` / `patterns` / `nakedType` /
`resolvesTo`) so bad rows fail at Layer A/B before Layer C.

## Deferred

| Topic                   | Why                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `money: number` → brand | No `MoneyAmount` brand yet; ledger uses `_minor` integers — see [partner-money-integer-migration.md](./partner-money-integer-migration.md) |

## Related

- [partner-surface-inventory.md](./partner-surface-inventory.md)
- [partner-type-reference-map.md](./partner-type-reference-map.md)
- Engine:
  [`lib/docs/partner-surface-wire-lint.ts`](../../lib/docs/partner-surface-wire-lint.ts)
