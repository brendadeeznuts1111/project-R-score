# Partner surface inventory

**Claim** `partner-surface-inventory`

**Principle** `map-before-rename` — inventory joins overloaded “partner”
surfaces before any token rename.

**Schema** v2 — structured bags: `brand` · `registry` · `wireField` ·
`chromeNav` · `taxonomy` (aspect-conditional).

**SSOT (rows)**
[`lib/docs/partner-surface-inventory.ts`](../../lib/docs/partner-surface-inventory.ts)

**Registry**
[`/registry/partner-surface-inventory.json`](../../public/registry/partner-surface-inventory.json)

This inventory answers: **what kind of partner is this, where does it live, what
shape does it have?** It does **not** replace:

| Existing SSOT                                                                 | Owns                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------- |
| [partner-type-reference-map.md](./partner-type-reference-map.md)              | Identity graph (`PartnerCode`, `OutId`, …)          |
| [partner-domain-map.md](../harness/tenants/partner-domain-map.md)             | Glossary concepts (`partner.phase.*`, Soft overlay) |
| [workspace-lane-cross-map.md](../harness/tenants/workspace-lane-cross-map.md) | Session ↔ chrome ↔ ConceptDomain correlations       |

## Homonym machines (do not nest)

| Machine              | Token                          | Label / notes                                   |
| -------------------- | ------------------------------ | ----------------------------------------------- |
| Session archive lane | `partner`                      | filename `<lane>` in naming-grammar             |
| Chrome Domain lane   | `partner`                      | ISSUE-ROUTING **Domain** · label “Partner desk” |
| ConceptDomain        | `partners`                     | plural · prefixes `partner.` / `out.`           |
| Commit scope         | `partner` · `partners` · `ops` | open-set `type(scope):` hints                   |

```bash
bun tools/workspace-taxonomy.ts explain partner
bun run partner-surface-inventory:bake
bun run partner-surface-inventory:check
bun run partner-surface-inventory:validate
bun run partner-surface-inventory:lint-wires
bun scripts/validate-wire-traps.ts
bun scripts/validate-wire-traps.ts --hlp
bun scripts/validate-wire-traps.ts --why
bun scripts/validate-wire-traps.ts --document
bun test tests/partner-surface-inventory.test.ts tests/partner-surface-wire-lint.test.ts
```

### `lint-wires` CLI flags

| Flag                                    | Meaning                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| _(no args)_ · `-h` · `--help` · `--hlp` | Usage (teaching default; no scan)                                        |
| `--scan`                                | Run the wire-trap scan (`package.json` passes this)                      |
| `--why`                                 | Claim / allowlist rationale (ANSI markdown when available)               |
| `--document`                            | Path + wire-bag excerpt from this design doc                             |
| `--strict-globs`                        | Fail when an allowlist glob matches 0 files (`WIRE_TRAP_STRICT_GLOBS=1`) |

Pre-commit (`scripts/pre-commit.ts`): runs `--scan` when staged `.ts`/`.tsx` or
inventory bake/doc changes; adds `--strict-globs` when inventory/lint SSOT is
staged. Escape: `SKIP_WIRE_LINT=1` (reason in commit message).

Compact table (bags):

```bash
bun -e 'const inv=await Bun.file("public/registry/partner-surface-inventory.json").json(); console.log(Bun.inspect.table(inv.rows.filter(r=>r.brand||r.registry||r.wireField).map(r=>({aspect:r.aspect,token:r.token,bag:r.brand?"brand":r.registry?"registry":"wire",detail:JSON.stringify(r.brand??r.registry??r.wireField)})),["aspect","token","bag","detail"],{colors:true}))'
```

## Row schema

Each row in the lib SSOT / registry bake:

| Field          | Meaning                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `aspect`       | taxonomy · chrome-nav · portal-board · registry · brand · package · lib-module · wire-field · doc-tenant · cross-repo |
| `machine`      | optional: sessionLane · chromeDomain · conceptDomain · commitScope · identity · artifact · nav                        |
| `token`        | English / id as agents see it                                                                                         |
| `typeOrExport` | TypeScript export or wire label when known                                                                            |
| `repo`         | project-R-score · Kalshi-bot · toc-ops · sports-terminal                                                              |
| `path`         | source path or package                                                                                                |
| `href`         | public URL when applicable                                                                                            |
| `properties`   | key attrs (domain, registry, brand shape, cli)                                                                        |
| `owner`        | owning lane / doc                                                                                                     |
| `brand`        | (brand only) pattern · mintAuthority · module · interiorOnly · replaces · domain · registryRef? · isActive · category |
| `registry`     | (registry only) schemaId · schemaIdField · artifactPath · omits · moneyPolicy · requiredTopKeys · conceptIds          |
| `wireField`    | (wire-field only) wireName · sourceSystemId · resolvesTo · quarantineOnFail · boundaryPathGlobs                       |
| `chromeNav`    | (chrome-nav / portal-board) domain · group · tier · registryArtifact                                                  |
| `taxonomy`     | (taxonomy) homonymDistinct · conceptDomain                                                                            |

Brand linking metadata (Layer A cross-checks):

| Field         | Meaning                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `domain`      | Brand-catalog domain (`operations`, …), taxonomy `conceptDomain`/`chromeDomain` token, or sentinel `cross-domain` |
| `registryRef` | Inventory `registry` row `token` that holds instances (omit when none / external)                                 |
| `isActive`    | Live brand vs deprecated/legacy                                                                                   |
| `category`    | `identity` · `profile` · `template` · `external` · `node`                                                         |

`bun run partner-surface-inventory:validate` enforces domain ∈ allowlist and
`registryRef` → existing registry row when set.

Chrome-nav and portal-board rows for Domain `partner` are **derived live** from
[`chrome-catalog.ts`](../../lib/portal/chrome-catalog.ts) so board adds cannot
drift silently. Validate bags with `bun run partner-surface-inventory:validate`
and wire traps with `bun run partner-surface-inventory:lint-wires`:

| Layer | Check                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------- |
| A     | brand-manifest + `Bun.file.exists` + brand linking (`domain` · `registryRef` · `isActive` · `category`)   |
| B     | baked JSON vs bag: schema identity · `requiredTopKeys` · omitted **key names** absent · `moneyPolicy`     |
| C     | `lint-wires`: glob coverage + naked `partnerId` / `partner_id` `: string` outside `boundaryPathGlobs`     |
| D     | `lint-domains`: inventory brand types used outside home path globs (default **warn**; `--strict` → error) |

Layer A/B stay on `partner-surface-inventory:validate`. Layer C is
`partner-surface-inventory:lint-wires`. Layer D is
`partner-surface-inventory:lint-domains` (do not alias validate → wire/domain
lints).

```bash
bun run partner-surface-inventory:lint-domains
bun scripts/validate-partner-domain-isolation.ts --rules
bun scripts/validate-partner-domain-isolation.ts --scan --strict
```

Registry bag notes:

- `conceptIds` are glossary / relatedConcept refs (may include `*`) — **not**
  JSON path walks.
- `omits` are enforced by walking object **key names** (string values in an
  `omits` array do not count as present keys).
- partners-ops may expose `credentials.username` as a public board label; vault
  secrets (`password`, `vaultKey`, `apiKey`) stay in `omits`.

Wire bag notes:

- `boundaryPathGlobs` allowlists adapter trees (e.g. `Kalshi-bot/**`,
  `projects/active/sports-terminal-os/**`) where raw wire ids are parsed.
- Glob coverage: 0 matches + empty/missing tree → **warn** (optional nested
  checkout); 0 matches + tree has files → **error**. Pass `--strict-globs` (or
  `WIRE_TRAP_STRICT_GLOBS=1`) to fail empty checkouts too.
- `strict` (default true): allowlisted hits silent; `strict: false` warns on
  allowlisted naked annotations (migration).
- `requireReason`: `// wire-ok` on matching files must include
  `// wire-ok: <reason>`.
- Interior code must use `PartnerCode` / `ExternalPartnerRef`, or suppress with
  `// wire-ok` / `// brand-ok` (same / prev / next line).
- Adding a new external client = add a `wire-field` row with
  `resolvesTo: ExternalPartnerRef` + `boundaryPathGlobs` — no separate ast-grep
  allowlist.

## Minimum surface set (summary)

### Partner desk boards (`data-domain=partner`)

| Nav id            | Href                       | Registry                        |
| ----------------- | -------------------------- | ------------------------------- |
| `partners`        | `/portal/partners/`        | `/registry/partners-ops.json`   |
| `partner-health`  | `/portal/partner/`         | `/registry/partner-health.json` |
| `account`         | `/portal/account/`         | partners-ops                    |
| `partner-history` | `/portal/partner-history/` | limit-raises                    |
| `limits`          | `/portal/limits/`          | limit-raises                    |
| `limits-lab`      | `/portal/limits-lab/`      | limit-forecast-lab              |
| `bookmakers`      | `/portal/bookmakers/`      | bookmakers                      |
| `factory`         | `/portal/factory/`         | telegram-handshake              |

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

- **Kalshi-bot** — glossary cores `partner.phase.*` (Factory must not
  re-declare)
- **toc-ops** — Soft Balance / MessageLog (not Factory partner boards)
- **sports-terminal** — React `/partners` IA only; connector blocked

## Full table

Generated tables (domains · brands with linking metadata · boards · live
PartnerCodes) are committed at
[`partner-surface-inventory.generated.md`](./partner-surface-inventory.generated.md):

```bash
bun run partner-surface-inventory:docs
bun run partner-surface-inventory:docs:check
```

TTY dump of every inventory row:

```bash
bun -e 'import { formatPartnerSurfaceMarkdown } from "./lib/docs/partner-surface-inventory.ts"; console.log(formatPartnerSurfaceMarkdown())'
```

Or read the bake:
[`/registry/partner-surface-inventory.json`](../../public/registry/partner-surface-inventory.json).

## Out of scope

- Renaming session / chrome / ConceptDomain tokens
- Changing `PartnerCode` / `OutId` grammar
- Sports Terminal connector cutover
- Full glossary concept dump (domain-map owns that)
