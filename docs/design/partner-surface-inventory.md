# Partner surface inventory

**Claim** `partner-surface-inventory`

**Principle** `map-before-rename` — inventory joins overloaded “partner”
surfaces before any token rename.

**Schema** v2 — aspect-conditional bags: `brand` · `partnerCode` · `outId` ·
`registry` · `wireField` · `chromeNav` · `taxonomy`

|                   | Path                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **SSOT (rows)**   | [`lib/docs/partner-surface-inventory.ts`](../../lib/docs/partner-surface-inventory.ts)             |
| **Registry bake** | [`/registry/partner-surface-inventory.json`](../../public/registry/partner-surface-inventory.json) |

Answers: **what kind of partner is this, where does it live, what shape does it
have?** It joins sibling maps; it does **not** replace them.

## Contents

1. [What this owns](#what-this-owns)
2. [Homonym machines](#homonym-machines-do-not-nest)
3. [Validation layers A–D](#validation-layers-ad)
4. [Row + bag schema](#row--bag-schema)
5. [Example rows (ASH)](#example-rows-ash-from-partners-ops)
6. [Live-derived rows](#live-derived-rows)
7. [Operator commands](#operator-commands)
8. [Minimum surface set](#minimum-surface-set-summary)
9. [Generated full table](#generated-full-table)
10. [Out of scope](#out-of-scope)

## What this owns

| Existing SSOT                                                                 | Owns                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- |
| [partner-type-reference-map.md](./partner-type-reference-map.md)              | Identity graph (`PartnerCode`, `OutId`, …)          |
| [partner-domain-map.md](../harness/tenants/partner-domain-map.md)             | Glossary concepts (`partner.phase.*`, Soft overlay) |
| [workspace-lane-cross-map.md](../harness/tenants/workspace-lane-cross-map.md) | Session ↔ chrome ↔ ConceptDomain correlations       |

## Homonym machines (do not nest)

Same English token can mean different machines. Rows always set `machine` when
the token is shared.

| Label                | `machine`       | Token                          | Notes                                           |
| -------------------- | --------------- | ------------------------------ | ----------------------------------------------- |
| Session archive lane | `sessionLane`   | `partner`                      | filename `<lane>` in naming-grammar             |
| Chrome Domain lane   | `chromeDomain`  | `partner`                      | ISSUE-ROUTING **Domain** · label “Partner desk” |
| ConceptDomain        | `conceptDomain` | `partners`                     | plural · prefixes `partner.` / `out.`           |
| Commit scope         | `commitScope`   | `partner` · `partners` · `ops` | open-set `type(scope):` hints                   |

```bash
bun tools/workspace-taxonomy.ts explain partner
```

## Validation layers A–D

Do **not** alias validate → wire/domain lints. Each layer has its own command.

| Layer              | Command                                  | Checks                                                                                                                                                                                                                                                           | Default severity                                  |
| ------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| A — bags / linking | `partner-surface-inventory:validate`     | Logical correctness of inventory rows: brand-manifest membership · bag linking (`domain` · `registryRef` · `isActive`) · lifecycle · fitness · live `partner-code` / `out-id` ↔ `partners-ops` · mintAuthority in `brand.module` · test-corpus `hasTestCoverage` | **error** (many drifts **warn**)                  |
| B — registry shape | `partner-surface-inventory:validate`     | Physical correctness of **registry artifacts** named by `registry` bags (e.g. `partners-ops.json`): schema identity · `requiredTopKeys` · omitted **key names** absent · `moneyPolicy`                                                                           | **error**                                         |
| C — wire lint      | `partner-surface-inventory:lint-wires`   | Naked brand annotations outside `boundaryPathGlobs` — [wire-lint.md](./wire-lint.md)                                                                                                                                                                             | **error** (empty optional checkout glob **warn**) |
| D — domain lint    | `partner-surface-inventory:lint-domains` | Brand types used outside home path globs                                                                                                                                                                                                                         | **warn** (`--strict` → **error**)                 |

**A vs B (same command):** Layer A asks whether the inventory’s labels and
cross-refs make sense (wrong `brandRef`, missing `callSign`, mint symbol not in
`brand.module`). Layer B asks whether each **baked registry JSON** still matches
its `registry` bag contract (schema id, required keys, forbidden money keys).
When `validate` fails, the message prefix / wording tells you which: fix a bag
link (A) or an artifact / bag omit list (B). Neither layer re-validates the
serialised `partner-surface-inventory.json` bake itself — that is
`partner-surface-inventory:check` (deep-equal).

Pre-commit (`scripts/pre-commit.ts`):

| Gate                                                           | When                                      | Escape                                  |
| -------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| Layer C `--scan` (+ `--strict-globs` if inventory SSOT staged) | staged `.ts`/`.tsx` or inventory bake/doc | `SKIP_WIRE_LINT=1` (reason in commit)   |
| Layer D `--scan` (+ `--strict` if domain-lint SSOT staged)     | staged `.ts`/`.tsx` or inventory bake/doc | `SKIP_DOMAIN_LINT=1` (reason in commit) |

Inactive / deprecated brands still referenced by wire-field, portal-board /
chrome-nav, or registry consumers emit **warn**. Generated docs include **Brand
status**, **Brand health**, **Partner codes**, and **OutIds**.

### `lint-wires` flags

| Flag                                    | Meaning                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| _(no args)_ · `-h` · `--help` · `--hlp` | Usage (teaching default; no scan)                                        |
| `--scan`                                | Run the wire-trap scan (`package.json` passes this)                      |
| `--why`                                 | Claim / allowlist rationale                                              |
| `--document`                            | Path + wire-bag excerpt from this design doc                             |
| `--strict-globs`                        | Fail when an allowlist glob matches 0 files (`WIRE_TRAP_STRICT_GLOBS=1`) |

## Row + bag schema

Each row in the lib SSOT / registry bake has core fields plus at most one aspect
bag.

### Core row fields

| Field          | Required | Meaning                                                          |
| -------------- | -------- | ---------------------------------------------------------------- |
| `id`           | yes      | Opaque inventory row key                                         |
| `aspect`       | yes      | Kind of surface (see Aspects)                                    |
| `machine`      | no       | Homonym / identity machine (see Machines)                        |
| `token`        | yes      | English / id as agents see it                                    |
| `typeOrExport` | no       | TypeScript export or wire label when known                       |
| `repo`         | yes      | `project-R-score` · `Kalshi-bot` · `toc-ops` · `sports-terminal` |
| `path`         | yes      | Source path or package                                           |
| `href`         | no       | Portal/registry URL when applicable                              |
| `properties`   | yes      | Key attrs (domain, registry, brand shape, cli)                   |
| `owner`        | yes      | Owning lane / doc                                                |
| `notes`        | no       | Free-form caveat                                                 |

### Aspects

| `aspect`       | Role                            | Bag           |
| -------------- | ------------------------------- | ------------- |
| `taxonomy`     | Homonym / machine map           | `taxonomy`    |
| `chrome-nav`   | Partner desk chrome item        | `chromeNav`   |
| `portal-board` | Board under `/portal/`          | `chromeNav`   |
| `registry`     | Baked JSON artifact contract    | `registry`    |
| `brand`        | Branded identity / profile type | `brand`       |
| `partner-code` | Live desk PartnerCode instance  | `partnerCode` |
| `out-id`       | Live OutId seat                 | `outId`       |
| `package`      | npm / workspace package         | —             |
| `lib-module`   | High-signal lib path            | —             |
| `wire-field`   | Naked wire trap / allowlist     | `wireField`   |
| `doc-tenant`   | Design / tenant doc pointer     | —             |
| `cross-repo`   | External repo surface           | —             |

### Machines

| `machine`       | Role                                 |
| --------------- | ------------------------------------ |
| `sessionLane`   | Session archive `<lane>`             |
| `chromeDomain`  | ISSUE-ROUTING Domain / chrome lane   |
| `conceptDomain` | Glossary ConceptDomain               |
| `commitScope`   | Conventional-commit scope hint       |
| `identity`      | Brand / PartnerCode / OutId identity |
| `artifact`      | Registry or package artifact         |
| `nav`           | Chrome / board navigation            |

### Bag: `brand`

Layer A cross-checks these against brand-manifest and inventory registries.

| Field               | Required | Meaning                                                       |
| ------------------- | -------- | ------------------------------------------------------------- |
| `mintAuthority`     | yes      | Constructor label (`parseX` / `asX`; may list several)        |
| `module`            | yes      | Source module path (mint terms must appear here)              |
| `interiorOnly`      | yes      | True when brand must not cross the wire boundary              |
| `domain`            | yes      | Brand-catalog domain, taxonomy token, or `cross-domain`       |
| `isActive`          | yes      | Live brand vs deprecated/legacy                               |
| `category`          | yes      | `identity` · `profile` · `template` · `external` · `node`     |
| `pattern`           | no       | Regex string when shape is fixed                              |
| `replaces`          | no       | Legacy wire names this brand supersedes                       |
| `registryRef`       | no       | Inventory `registry` row `token` that holds instances         |
| `deprecatedAt`      | no       | ISO date when sunsetting started                              |
| `deprecationReason` | no       | Why (required when `deprecatedAt`; recommended when inactive) |
| `replacedBy`        | no       | Successor brand token                                         |
| `fitnessScore`      | no       | 1–5 reuse fitness (type-reference-map scale)                  |
| `hasTestCoverage`   | no       | Whether mint/parse constructors have focused tests            |

Evidence (Layer A **warn** on drift):

- `hasTestCoverage` ↔ mintAuthority hits in `tests/**` and `packages/**`
  `*.{test,spec,test-d}.*`
- mintAuthority terms ↔ text of `brand.module`

### Bag: `partnerCode`

| Field         | Required | Meaning                                           |
| ------------- | -------- | ------------------------------------------------- |
| `brandRef`    | yes      | Active inventory brand (`PartnerCode`)            |
| `registryRef` | yes      | Inventory registry token (usually `partners-ops`) |
| `phase`       | no       | Operator phase (e.g. `operator_ready`)            |
| `callSign`    | no       | Desk call sign (`CODE-NNN`)                       |

### Bag: `outId`

| Field         | Required | Meaning                                           |
| ------------- | -------- | ------------------------------------------------- |
| `brandRef`    | yes      | Active inventory brand (`OutId`)                  |
| `registryRef` | yes      | Inventory registry token (usually `partners-ops`) |
| `partnerCode` | yes      | Owning PartnerCode                                |
| `status`      | no       | `outs[].status` when present                      |

### Bag: `registry`

| Field             | Meaning                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `schemaId`        | Expected schema / kind label                                          |
| `schemaIdField`   | `schema` · `kind` · `schemaVersion` · `none`                          |
| `artifactPath`    | Path under repo to baked JSON                                         |
| `omits`           | Object **key names** that must be absent anywhere in the artifact     |
| `moneyPolicy`     | `integerMinorUnits` · `forbidden` · `unset`                           |
| `requiredTopKeys` | Top-level keys that must exist                                        |
| `conceptIds`      | Glossary / relatedConcept refs (may include `*`) — **not** JSON paths |

Notes:

- `omits` walks key names only (string values inside an `omits` array do not
  count as present keys).
- partners-ops may expose `credentials.username` as a public board label; vault
  secrets (`password`, `vaultKey`, `apiKey`) stay in `omits`.

### Bag: `wireField`

Full guide: [wire-lint.md](./wire-lint.md).

| Field                  | Meaning                                             |
| ---------------------- | --------------------------------------------------- |
| `wireName`             | Wire field label                                    |
| `sourceSystemId`       | Adapter source (`kalshi` · `sports` · …)            |
| `resolvesTo`           | Target brand / ref family                           |
| `brandedType`          | Error display type (defaults to `resolvesTo`)       |
| `pattern` / `patterns` | TypeScript identifier(s) to match                   |
| `nakedType`            | Annotation RHS — `string` (default) or `number`     |
| `boundaryPathGlobs`    | Allowlist where naked annotations are OK            |
| `strict`               | Default true: allowlisted hits silent; false → warn |
| `requireReason`        | `// wire-ok` must include a reason                  |
| `quarantineOnFail`     | Whether failed parse should quarantine              |

Notes:

- Rules are **inventory-driven** (same engine for `partnerId`, `outId`, …).
- `ExternalPartnerRef` rows are allowlists for raw wire strings — **not**
  skipped.
- Glob coverage: 0 matches + empty/missing tree → **warn**; 0 matches + tree has
  files → **error**.
- Interior code uses brands / refs, or `// wire-ok` / `// brand-ok` (same / prev
  / next line).
- Money (`money: number`) deferred — no `MoneyAmount` brand yet.

### Bag: `chromeNav`

| Field              | Meaning                                                |
| ------------------ | ------------------------------------------------------ |
| `domain`           | Chrome Domain lane (`partner`, …)                      |
| `group`            | Nav group                                              |
| `tier`             | Priority / overflow tier                               |
| `registryArtifact` | Inventory registry token when board is artifact-backed |
| `cli`              | Optional bake / ops CLI hint                           |

### Bag: `taxonomy`

| Field             | Meaning                                              |
| ----------------- | ---------------------------------------------------- |
| `homonymDistinct` | Must be true when the token collides across machines |
| `conceptDomain`   | Related ConceptDomain token when applicable          |

## Example rows (ASH from partners-ops)

Live rows are **separate aspects** (not one mega-row). Values below match the
current `partners-ops` bake for partner **ASH**.

### `partner-code` row

| Field                     | Value                           |
| ------------------------- | ------------------------------- |
| `id`                      | `partner-code.ASH`              |
| `aspect`                  | `partner-code`                  |
| `machine`                 | `identity`                      |
| `token`                   | `ASH`                           |
| `href`                    | `/portal/partners/#partner/ASH` |
| `partnerCode.brandRef`    | `PartnerCode`                   |
| `partnerCode.registryRef` | `partners-ops`                  |
| `partnerCode.phase`       | `operator_ready`                |
| `partnerCode.callSign`    | `ASH-001`                       |

`ASH` is the PartnerCode; `ASH-001` is the call sign (`PartnerCallSignCode`
shape `CODE-NNN`) — not the partner code itself.

### `out-id` rows (two seats)

| Field               | `out-ASH-1`        | `out-ASH-2`        |
| ------------------- | ------------------ | ------------------ |
| `id`                | `out-id.out-ASH-1` | `out-id.out-ASH-2` |
| `aspect`            | `out-id`           | `out-id`           |
| `machine`           | `identity`         | `identity`         |
| `token`             | `out-ASH-1`        | `out-ASH-2`        |
| `outId.brandRef`    | `OutId`            | `OutId`            |
| `outId.registryRef` | `partners-ops`     | `partners-ops`     |
| `outId.partnerCode` | `ASH`              | `ASH`              |
| `outId.status`      | `ready`            | `deferred`         |

### How Layers A/B read this

| Layer | What it proves for ASH                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A     | `brandRef` → active `PartnerCode` / `OutId` brands · codes/outs exist in `partners-ops` · `callSign` matches `^[A-Z]{3,6}-[0-9]{3}$` · phase/status drift warns    |
| B     | `partners-ops.json` still satisfies the `registry` bag for token `partners-ops` (schema · top keys · omits · money policy) — independent of any single partner row |

## Live-derived rows

These aspects are **not** hand-listed static seeds; bake/validate pass live
inputs (same pattern as chrome-nav).

| Aspect                                           | Source                                                    | Rules                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `chrome-nav` / `portal-board` (Domain `partner`) | [`chrome-catalog.ts`](../../lib/portal/chrome-catalog.ts) | Board adds cannot drift silently                                                                                                           |
| `partner-code`                                   | `partners-ops.json` → `partners[].code`                   | Active `brandRef` + `registryRef`; code must exist; `callSign` must match `CODE-NNN` (**warn** if missing/malformed); phase drift **warn** |
| `out-id`                                         | `partners-ops.json` → `partners[].outs[].id`              | Active `brandRef=OutId`; out must exist; owning `partnerCode` required; status drift **warn**                                              |

Empty partners-ops → zero `partner-code` / `out-id` rows.

## Operator commands

### Bake / check

```bash
bun run partner-surface-inventory:bake
bun run partner-surface-inventory:check
```

### Validate (Layers A + B)

```bash
bun run partner-surface-inventory:validate
```

### Lint wires (Layer C)

```bash
bun run partner-surface-inventory:lint-wires
bun scripts/validate-wire-traps.ts --hlp
bun scripts/validate-wire-traps.ts --why
bun scripts/validate-wire-traps.ts --document
bun scripts/validate-wire-traps.ts --scan
```

### Lint domains (Layer D)

```bash
bun run partner-surface-inventory:lint-domains
bun scripts/validate-partner-domain-isolation.ts --rules
bun scripts/validate-partner-domain-isolation.ts --scan --strict
```

### Generated docs

```bash
bun run partner-surface-inventory:docs
bun run partner-surface-inventory:docs:check
```

### Tests / TTY

```bash
bun test tests/partner-surface-inventory.test.ts tests/partner-surface-wire-lint.test.ts
bun -e 'import { formatPartnerSurfaceMarkdown } from "./lib/docs/partner-surface-inventory.ts"; console.log(formatPartnerSurfaceMarkdown())'
bun -e 'const inv=await Bun.file("public/registry/partner-surface-inventory.json").json(); console.log(Bun.inspect.table(inv.rows.filter(r=>r.brand||r.registry||r.wireField).map(r=>({aspect:r.aspect,token:r.token,bag:r.brand?"brand":r.registry?"registry":"wire",detail:JSON.stringify(r.brand??r.registry??r.wireField)})),["aspect","token","bag","detail"],{colors:true}))'
```

## Minimum surface set (summary)

### Partner desk boards (`data-domain=partner`)

Registry column uses inventory **tokens** (not mixed file paths).

| Nav id            | Href                       | Registry token       |
| ----------------- | -------------------------- | -------------------- |
| `partners`        | `/portal/partners/`        | `partners-ops`       |
| `partner-health`  | `/portal/partner/`         | `partner-health`     |
| `account`         | `/portal/account/`         | `partners-ops`       |
| `partner-history` | `/portal/partner-history/` | `limit-raises`       |
| `limits`          | `/portal/limits/`          | `limit-raises`       |
| `limits-lab`      | `/portal/limits-lab/`      | `limit-forecast-lab` |
| `bookmakers`      | `/portal/bookmakers/`      | `bookmakers`         |
| `factory`         | `/portal/factory/`         | `telegram-handshake` |

Knowledge board `/portal/lanes/` explains the homonym (chrome Domain
`knowledge`, not partner desk).

### Identity brands (pointer)

Canonical join key is `PartnerCode`. See type-reference-map for fitness scores.
Brands listed in inventory: `PartnerCode`, `PartnerCallSignCode`,
`PartnerProfileKey`, `PartnerTemplateId`, `OutId`, `ExternalPartnerId`,
`TreeNodeId` (+ parsers under `packages/partners/src/core/identifiers.ts`).

### Wire traps

Unqualified `partnerId` / Sports `partner_id` / Kalshi registry `id` / Pandora
`partnerId` → `ExternalPartnerRef` until resolved to `PartnerCode`.

### Cross-repo

| Repo                | Notes                                                          |
| ------------------- | -------------------------------------------------------------- |
| **Kalshi-bot**      | Glossary cores `partner.phase.*` (Factory must not re-declare) |
| **toc-ops**         | Soft Balance / MessageLog (not Factory partner boards)         |
| **sports-terminal** | React `/partners` IA only; connector blocked                   |

## Generated full table

Committed tables (domains · brands · boards · live PartnerCodes · OutIds):
[`partner-surface-inventory.generated.md`](./partner-surface-inventory.generated.md).

Or read the bake:
[`/registry/partner-surface-inventory.json`](../../public/registry/partner-surface-inventory.json).

## Out of scope

- Renaming session / chrome / ConceptDomain tokens
- Changing `PartnerCode` / `OutId` grammar
- Sports Terminal connector cutover
- Full glossary concept dump (domain-map owns that)
