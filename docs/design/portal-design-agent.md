# Portal design agent

Status: operator contract (2026-08-07)

Skill: [`.agents/skills/portal-design/`](../../.agents/skills/portal-design/) · Foundation:
[`docs/portal-foundation.md`](../portal-foundation.md) · Area map:
[`lib/portal/README.md`](../../lib/portal/README.md)

## Outcome

Agents improve FactoryWager portal UI by extending the existing Bun-native
stack — not by inventing a second design system. Visual identity (theme · color
kernels · venue marks) stays unified across ~36 portal boards while DNS dual
planes (Pages vs tennis Worker) stay distinct.

## SSOT boundary

| Artifact | Authority |
| -------- | --------- |
| `public/portal/theme.jsonc` | Design tokens / colorKernel SSOT (Bun **jsonc** loader) |
| `lib/portal/theme.ts` | Typed load + `renderThemeTokensCss` |
| `lib/portal/color-kernel-align.ts` | Theme-dark alias Claim (`color-kernel-theme-aliases`) |
| `lib/portal/ui-html.ts` ↔ `public/portal/components/portal-ui.js` | Shared HTML builders (keep API aligned) |
| `public/portal/style.css` | Board primitives (`.portal-*`) |
| `public/portal/_page-template.html` | Page starting shell |
| `config/surfaces.toml` | Hostname / backend inventory (TOML — not palettes) |
| This document | Operator Flags + dual-plane / concept disambiguation |

## Template split

| Concern | Use | Do not |
| ------- | --- | ------ |
| Palette + tokens | `theme.jsonc` → `portal:theme:sync` | Parallel `design.toml` colors / hand-edit `theme-tokens.css` |
| Page start | Copy `_page-template.html` · `portal:chrome:apply` | Per-board invented chrome |
| Component blocks | Grow `ui-html` / `portal-ui.js` + `.portal-*` | React kit / second component tree |
| Host inventory | `surfaces.toml` | Encoding colors in TOML |

`Bun.color(…, '{rgba}')` validates kernel/component aliases — HEX drops alpha.

## Dual-plane hosts

Hostname SSOT: [`config/surfaces.toml`](../../config/surfaces.toml). Tennis
tenant: [`docs/harness/tenants/tennis-hq-registry.md`](../harness/tenants/tennis-hq-registry.md).

| Host / path | Backend | Auth | Role |
| ----------- | ------- | ---- | ---- |
| `score.factory-wager.com/portal/*` | Pages `project-r-score` | Access on `/portal` | Operator boards |
| `tennis.factory-wager.com` | Worker `tennis-hq` | Public shell; `PARTNER_API_TOKEN` on `/api/v1/*` | Live Market Desk |
| `score…/portal/tennis/` | Pages evidence | Access | Baked KPIs / agent-auth / partner-contracts |
| `registry.factory-wager.com` | Pages → R2 allowlist | `FACTORY_WAGER_TOKEN` (agent) | Packages — not Worker auth |

Never collapse Worker desk into Pages evidence. Never send registry token to
tennis v1.

## Concept disambiguation

Thesis: [`docs/DOMAIN_CONCEPT_SHAPE.md`](../DOMAIN_CONCEPT_SHAPE.md) · lanes board
[`/portal/lanes/`](../../public/portal/lanes/).

| Machine | Examples |
| ------- | -------- |
| DNS hostname | `tennis.*`, `score.*` ([`surfaces.toml`](../../config/surfaces.toml)) |
| ConceptDomain | `trading`, `partners`, `portal` ([`concept-domains.ts`](../../lib/portal/concept-domains.ts)) |
| Vocabulary namespace | `page.` · `ops.` · `ui.` · `api.` |
| Chrome Domain lane | `partner` · `trading` · `control` |
| Session archive lane | `tennis-hq` · `partner` (not a ConceptDomain) |

Portal semantic vocabulary (~145) binds chrome. Domain glossary (~460) holds
sports/partner/telegram meaning. Tennis board surface map is intentionally thin
(`page.tennis` · `api.partner` · `ui.semantic.*`) — expand only with product
intent. Typed branded IDs (`SessionId`, `/portal/brands/` Bun×brand map) are a
separate plane — hand off to [`branded-ids`](../../.agents/skills/branded-ids/).

## Building blocks

Priority backlog lives in the skill. Existing builders: `renderToneChip` ·
`renderPortalChip` · `renderPortalStatGrid` · `renderPortalTable` /
`renderPortalTableRows` · `renderPortalPanel` · `renderPortalError` ·
`renderPortalSkeleton` · `renderPortalGate`.

## Contents

1. [Outcome](#outcome)
2. [SSOT boundary](#ssot-boundary)
3. [Template split](#template-split)
4. [Dual-plane hosts](#dual-plane-hosts)
5. [Concept disambiguation](#concept-disambiguation)
6. [Building blocks](#building-blocks)
7. [Doctor / proof](#doctor--proof)
8. [Flags / settings](#41-flags--settings) · [`4.1`](#4.1)

## Doctor / proof

```bash
bun run portal:theme:check
bun run validate:colors          # Claim/Evidence paste
bun run test:colors              # claim color-kernel-theme-aliases
bun run verify:portal:static
bun run portal:css:score:power
bun run surfaces:check           # when surfaces.toml / dual-plane notes change
bun run tennis:agent-auth:check  # when tennis registry evidence touched
bun run verify:weave -- --subdomains  # cross-host tennis + score probes
bun run skills:validate          # when the skill changes
```

<a id="4.1.theme-sync"></a> <a id="4.1.theme-check"></a>
<a id="4.1.validate-colors"></a> <a id="4.1.test-colors"></a>
<a id="4.1.power-ui"></a> <a id="4.1.verify-static"></a>
<a id="4.1.chrome-apply"></a> <a id="4.1.surfaces-check"></a>
<a id="4.1.tennis-agent-auth"></a> <a id="4.1.verify-weave-subdomains"></a>
<a id="4.1.skills-validate"></a>
<a id="4.1"></a>

### Flags / settings

**REF:ID** (v2) = Contents section number path under §4 (`4.1.<leaf>`). **href**
MUST be `#` + REF:ID (or empty/`—`/`auto`). Section id `4.1` sits on the line
immediately above this heading. Validate: `bun run docs:refid:check`. Suggest:
`bun run docs:refid:suggest --section=4.1 --flag=--foo`.

| Script | REF:ID | href | --flag | shortcode | default | current |
| ------ | ------ | ---- | ------ | --------- | ------- | ------- |
| `portal:theme:sync` | `4.1.theme-sync` | [`#4.1.theme-sync`](#4.1.theme-sync) | — | — | write CSS | `bun run portal:theme:sync` |
| `portal:theme:check` | `4.1.theme-check` | [`#4.1.theme-check`](#4.1.theme-check) | — | — | fail if stale | `bun run portal:theme:check` |
| `validate:colors` | `4.1.validate-colors` | [`#4.1.validate-colors`](#4.1.validate-colors) | — | — | Claim paste | `bun run validate:colors` |
| `test:colors` | `4.1.test-colors` | [`#4.1.test-colors`](#4.1.test-colors) | — | — | claim suite | `bun run test:colors` |
| `portal:css:score:power` | `4.1.power-ui` | [`#4.1.power-ui`](#4.1.power-ui) | — | — | score matrix | `bun run portal:css:score:power` |
| `verify:portal:static` | `4.1.verify-static` | [`#4.1.verify-static`](#4.1.verify-static) | — | — | structural gate | `bun run verify:portal:static` |
| `portal:chrome:apply` | `4.1.chrome-apply` | [`#4.1.chrome-apply`](#4.1.chrome-apply) | — | — | rewrite chrome | `bun run portal:chrome:apply` |
| `surfaces:check` | `4.1.surfaces-check` | [`#4.1.surfaces-check`](#4.1.surfaces-check) | — | — | bake drift | `bun run surfaces:check` |
| `tennis:agent-auth:check` | `4.1.tennis-agent-auth` | [`#4.1.tennis-agent-auth`](#4.1.tennis-agent-auth) | — | — | status artifact | `bun run tennis:agent-auth:check` |
| `verify:weave` | `4.1.verify-weave-subdomains` | [`#4.1.verify-weave-subdomains`](#4.1.verify-weave-subdomains) | `--subdomains` | — | off | `bun run verify:weave -- --subdomains` |
| `skills:validate` | `4.1.skills-validate` | [`#4.1.skills-validate`](#4.1.skills-validate) | — | — | skill layout | `bun run skills:validate` |

## Do not

- Second palette or `colorkernal` CLI
- Conflate visual identity with typed branded IDs / `/portal/brands/`
- Deploy the tennis Worker from this monorepo lane (producer owns Wrangler)
- Weaken color-kernel floors to make a board pass
