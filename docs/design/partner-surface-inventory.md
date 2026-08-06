# Partner surface inventory

**Claim** `partner-surface-inventory`

**Principle** `map-before-rename` — inventory joins overloaded “partner”
surfaces before any token rename.

**Schema** v2 — structured bags: `brand` · `registry` · `wireField` · `chromeNav` ·
`taxonomy` (aspect-conditional).

**SSOT (rows)** [`lib/docs/partner-surface-inventory.ts`](../../lib/docs/partner-surface-inventory.ts)

**Registry** [`/registry/partner-surface-inventory.json`](../../public/registry/partner-surface-inventory.json)

This inventory answers: **what kind of partner is this, where does it live, what
shape does it have?** It does **not** replace:

| Existing SSOT | Owns |
| ------------- | ---- |
| [partner-type-reference-map.md](./partner-type-reference-map.md) | Identity graph (`PartnerCode`, `OutId`, …) |
| [partner-domain-map.md](../harness/tenants/partner-domain-map.md) | Glossary concepts (`partner.phase.*`, Soft overlay) |
| [workspace-lane-cross-map.md](../harness/tenants/workspace-lane-cross-map.md) | Session ↔ chrome ↔ ConceptDomain correlations |

## Homonym machines (do not nest)

| Machine | Token | Label / notes |
| ------- | ----- | ------------- |
| Session archive lane | `partner` | filename `<lane>` in naming-grammar |
| Chrome Domain lane | `partner` | ISSUE-ROUTING **Domain** · label “Partner desk” |
| ConceptDomain | `partners` | plural · prefixes `partner.` / `out.` |
| Commit scope | `partner` · `partners` · `ops` | open-set `type(scope):` hints |

```bash
bun tools/workspace-taxonomy.ts explain partner
bun run partner-surface-inventory:bake
bun run partner-surface-inventory:check
bun run partner-surface-inventory:validate
bun test tests/partner-surface-inventory.test.ts
```

Compact table (bags):

```bash
bun -e 'const inv=await Bun.file("public/registry/partner-surface-inventory.json").json(); console.log(Bun.inspect.table(inv.rows.filter(r=>r.brand||r.registry||r.wireField).map(r=>({aspect:r.aspect,token:r.token,bag:r.brand?"brand":r.registry?"registry":"wire",detail:JSON.stringify(r.brand??r.registry??r.wireField)})),["aspect","token","bag","detail"],{colors:true}))'
```

## Row schema

Each row in the lib SSOT / registry bake:

| Field | Meaning |
| ----- | ------- |
| `aspect` | taxonomy · chrome-nav · portal-board · registry · brand · package · lib-module · wire-field · doc-tenant · cross-repo |
| `machine` | optional: sessionLane · chromeDomain · conceptDomain · commitScope · identity · artifact · nav |
| `token` | English / id as agents see it |
| `typeOrExport` | TypeScript export or wire label when known |
| `repo` | project-R-score · Kalshi-bot · toc-ops · sports-terminal |
| `path` | source path or package |
| `href` | public URL when applicable |
| `properties` | key attrs (domain, registry, brand shape, cli) |
| `owner` | owning lane / doc |
| `brand` | (brand only) pattern · mintAuthority · module · interiorOnly · replaces |
| `registry` | (registry only) schemaId · artifactPath · omits · moneyPolicy |
| `wireField` | (wire-field only) wireName · sourceSystemId · resolvesTo · quarantineOnFail |
| `chromeNav` | (chrome-nav / portal-board) domain · group · tier · registryArtifact |
| `taxonomy` | (taxonomy) homonymDistinct · conceptDomain |

Chrome-nav and portal-board rows for Domain `partner` are **derived live** from
[`chrome-catalog.ts`](../../lib/portal/chrome-catalog.ts) so board adds cannot
drift silently. Validate bags with
`bun run partner-surface-inventory:validate` (brand-manifest + `Bun.file.exists`
— not `lib:domains:check`).

## Minimum surface set (summary)

### Partner desk boards (`data-domain=partner`)

| Nav id | Href | Registry |
| ------ | ---- | -------- |
| `partners` | `/portal/partners/` | `/registry/partners-ops.json` |
| `partner-health` | `/portal/partner/` | `/registry/partner-health.json` |
| `account` | `/portal/account/` | partners-ops |
| `partner-history` | `/portal/partner-history/` | limit-raises |
| `limits` | `/portal/limits/` | limit-raises |
| `limits-lab` | `/portal/limits-lab/` | limit-forecast-lab |
| `bookmakers` | `/portal/bookmakers/` | bookmakers |
| `factory` | `/portal/factory/` | telegram-handshake |

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

- **Kalshi-bot** — glossary cores `partner.phase.*` (Factory must not re-declare)
- **toc-ops** — Soft Balance / MessageLog (not Factory partner boards)
- **sports-terminal** — React `/partners` IA only; connector blocked

## Full table

Regenerate from lib (TTY):

```bash
bun -e 'import { formatPartnerSurfaceMarkdown } from "./lib/docs/partner-surface-inventory.ts"; console.log(formatPartnerSurfaceMarkdown())'
```

Or read the bake: [`/registry/partner-surface-inventory.json`](../../public/registry/partner-surface-inventory.json).

## Out of scope

- Renaming session / chrome / ConceptDomain tokens
- Changing `PartnerCode` / `OutId` grammar
- Sports Terminal connector cutover
- Full glossary concept dump (domain-map owns that)
