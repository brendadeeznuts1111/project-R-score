# Bun capability × brand cross-map

**Claim** `bun-brand-cross-map`

**Surface** `/portal/brands/` → **Relationships**

**Registry** `/registry/bun-brand-map.json`

**Owner** `runtime-tooling` plus the declared brand-domain lane

The cross-map answers both directions of the same operational question:

- which Bun APIs touch a FactoryWager brand;
- which brands, wrappers, consumers, and projects depend on a Bun API.

It is a derived join, not a second proof taxonomy. `DocTokenId` and
`tools/bun-docs-catalog.json` own API identity, version, stability, and
canonical documentation. `lib/types/brand-manifest.json` and
`public/registry/brand-keymap.json` own brand and project identity. Reviewed
declarations own semantic relationships. Exact proof references determine
evidence state.

## Evidence states

- `verified` — every declared proof reference resolved exactly and passed.
- `declared-unproven` — the relationship is reviewed but has no passing proof.
- `observed-undeclared` — tracked source uses the capability without an owning
  declaration.
- `failed` — an exact proof resolved and failed.
- `stale` — source or proof freshness exceeded its declaration.

Legacy observed-but-undeclared rows are warning-only. New staged and PR-diff
rows fail immediately. Production-approved relationships also fail deploy
verification when proof is missing, failed, stale, or conflicts with the Bun
catalog.

## Relationship vocabulary

`input`, `output`, `control`, and `evidence` describe an actual brand flow.
`none` is an explicit reviewed classification and always includes a rationale.
Native runtime values such as `Blob`, `Response`, `Uint8Array`, cron handles,
servers, and terminal objects are not brands.

Experimental Bun APIs default to `lab-only`. Production approval requires an
owner, rationale, fallback, expiry, and passing proof.

## Declaration contract

[`lib/docs/bun-brand-usages.ts`](../../../lib/docs/bun-brand-usages.ts) is the
reviewed declaration manifest. Each declaration provides:

| Field                           | Authority                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `token` + `variant`             | `DocTokenId` catalog identity and overload/context disambiguation                          |
| `implementations` + `consumers` | exact tracked paths and symbols                                                            |
| `scope` + `policy`              | runtime posture: production, tooling, test, or config                                      |
| `ownerLane`                     | brand domain or `runtime-tooling`                                                          |
| `brands`                        | `input`, `output`, `control`, `evidence`, or explained `none`                              |
| `proofs`                        | exact artifact path and proof key; fuzzy names never join                                  |
| `experimentalApproval`          | owner, rationale, fallback, expiry, and proof when experimental production use is approved |

The validator rejects unknown tokens, unknown brands, invalid owner paths,
untracked implementation paths, unexplained `none` relationships, expired
experimental approvals, and production approvals without passing proof.

## Version authority

Three version axes are deliberately separate:

1. `package.json#version` and `package.json#versioning.current` identify the
   FactoryWager artifact release.
2. `package.json#catalog` pins the compile-time Bun and TypeScript definitions.
   `@types/bun` follows the configured latest/stable wrapper channel and direct
   `bun-types` follows the configured canary declaration channel. Their versions
   are intentionally independent; [`config/bun-channels.toml`](../../../config/bun-channels.toml)
   owns the policy and `bun run bun:channel:check` proves each pin.
3. `DocTokenId` entries in `tools/bun-docs-catalog.json` own each Bun API's
   introduction version and stability. The generated cross-map copies those
   values; declarations and prose do not override them.

This is why `Bun.Image` reports its introduction version regardless of the
FactoryWager release number, the stable runtime pin, or the independently
selected wrapper/declaration type pins.
`schemaVersion` on the registry payload versions the JSON contract and is not a
package or Bun runtime version.

## Operate

```bash
bun run brand:keymap
bun run bun:brand-map
bun run ops:snapshot:bun-brand-map
bun run bun:brand-map:check
bun run check:brands:staged
bun run check:brands:diff <base-sha>
bun run verify:portal:static
```

The bake order is capability map → brand keymap → Bun/brand cross-map → ops
snapshot. The ops summary exposes a compact health slice. Legacy warnings remain
visible in the Brands **Projects** view and the Relationships **evidence**
filter (`observed-undeclared`) without degrading health; hard errors and stale
production proof do degrade health.

## Portal behavior

The **Relationships** view is the default. Filters cover API/brand search,
domain, project, policy, and evidence state. Selecting a row renders a focused
four-stage graph:

`Bun API → wrapper → branded value → project/consumer`

The equivalent table and detail panel are always present. URL-fragment state is
shareable and does not consume `?tenant=`, which remains reserved for tenant
selection. Below 760 px, the table and ordered relationship cards replace the
SVG graph.

The **Glossary** view remains the constructor/keymap reference for all canonical
brands. The **Projects** view distinguishes the 32 tracked roots from three
explicit external or untracked roots and shows observed, matched, verified, and
attention counts.

## Release acceptance

Before tagging a release that changes this contract:

```bash
bun run bun:brand-map:check
bun run brand:manifest:check
bun run check:brands:all
bun run type-check:ci
bun run type-check:full
bun run check:release-tracker
bun run docs:map:check
bun run verify:portal:static
```

The release is blocked by a stale registry bake, package/version metadata drift,
misaligned Bun definition pins, an unknown brand or token, any new undeclared
usage, a catalog conflict, or failed/stale production proof.
