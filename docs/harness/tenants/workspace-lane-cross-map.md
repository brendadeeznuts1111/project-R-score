# Workspace lane cross-map

**Claim** `workspace-lane-cross-map`

**Surface** `/portal/lanes/`

**Registry** `/registry/workspace-lane-map.json`

**Owner** harness docs + portal knowledge chrome

Crosswalk of overloaded “lane / domain / scope” machines. Declares
**correlations, not containment** — session archive lanes do not parent chrome
Domain lanes or ConceptDomains.

## Machines (do not nest)

| Machine | Frozen? | SSOT |
| ------- | ------- | ---- |
| Session archive lane | Yes (9) | [`lib/docs/workspace-taxonomy.ts`](../../../lib/docs/workspace-taxonomy.ts) `SESSION_LANES` · [`naming-grammar.md`](../../organization/naming-grammar.md) |
| Chrome Domain lane | Yes (6) | [`chrome-catalog.ts`](../../../lib/portal/chrome-catalog.ts) `PORTAL_DOMAIN_LANE_META` · [`ISSUE-ROUTING.md`](../ISSUE-ROUTING.md) |
| ConceptDomain | Yes (15+) | [`concept-domains.ts`](../../../lib/portal/concept-domains.ts) · [`DOMAIN_CONCEPT_SHAPE.md`](../../DOMAIN_CONCEPT_SHAPE.md) |
| Git commit scope | Open set | conventional `type(scope):` — hints only in correlations |
| Parallel git lane | Process | AGENTS worktree hygiene (disjoint dirty files) |

Session ∩ chrome token overlap is essentially `{partner}` (string homonym only).
Chrome `partner` ≠ ConceptDomain `partners` ≠ commit scope `ops`/`partners`.

Full partner surface join (boards · brands · wire traps · docs):
[`docs/design/partner-surface-inventory.md`](../../design/partner-surface-inventory.md)
· `/registry/partner-surface-inventory.json`.

## Lib contract

[`lib/docs/workspace-taxonomy.ts`](../../../lib/docs/workspace-taxonomy.ts):

- `SESSION_LANES` / `isSessionLane`
- `WORKSPACE_TAXONOMY_CORRELATIONS` (reviewed `correlates` rows + rationale)
- `explainHomonym(token)` / `formatHomonymMarkdown(token)`
- `buildWorkspaceTaxonomyMap()` → bake payload

```bash
bun test tests/workspace-taxonomy.test.ts
bun run workspace-taxonomy:bake
bun run workspace-taxonomy:check
```

Agent TTY:

```bash
bun -e 'import { formatHomonymMarkdown } from "./lib/docs/workspace-taxonomy.ts"; console.log(Bun.markdown.ansi(formatHomonymMarkdown("partner"), { columns: 100, hyperlinks: true }))'
```

## Archive filenames

Still `<t>-<lane>-<slug>` only — see
[`docs/organization/naming-grammar.md`](../../organization/naming-grammar.md).
Finer product cuts stay in slug prose + Domain / ConceptDomain / commit scope
SSOTs, not as a fourth filename token.

## Proof

| Kind | Evidence |
| ---- | -------- |
| unit | `bun test tests/workspace-taxonomy.test.ts` |
| journey | `bun run workspace-taxonomy:check` (bake deep-equal) · board at `/portal/lanes/` |

_Ratchet_ → unit test on changed lib; bake check when taxonomy or board staged.
