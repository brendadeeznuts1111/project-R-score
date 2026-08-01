# FactoryWager domain glossary

Portal: [/portal/glossary/](/portal/glossary/) Machine artifact:
[/registry/domain-glossary.json](/registry/domain-glossary.json)

The schema-v3 portal projection combines the canonical Kalshi-bot domain
glossary with the typed portal field vocabulary from
`lib/portal/semantic-vocabulary.ts`, plus governed sports-betting concepts from
`lib/operations/sports-betting-glossary.ts` (`sport.*` · `league.*` · `event.*`
· `market.*` · `metric.*` · `cross_market.*` · `evidence.*` · `multi.*`). It
includes market, model, tournament, warehouse, trading, UI, and pipeline
concepts, plus registry-column lineage and cross-portal semantic types and UI
roles. Surface mounts are first-class: `surfaces[].sections` is
`{ hash, domId, conceptId }[]` (SSOT: `lib/portal/page-glossary.ts`).

`Concept kind` describes provenance (`ui`, `registry`, `composite`).
`Semantic type` describes the stable data role. `UI role` describes rendering.
Operational kinds such as `edge-health` are governed values of the Kind concept
rather than glossary concept kinds.

## Deep links

Use `#glossary:<concept-id>` to open a definition directly:

- [/portal/glossary/#glossary:kalshi_mu](/portal/glossary/#glossary:kalshi_mu)
- [/portal/glossary/#glossary:eff_edge](/portal/glossary/#glossary:eff_edge)
- [/portal/glossary/#glossary:ui.semantic.status](/portal/glossary/#glossary:ui.semantic.status)
- [/portal/glossary/#glossary:ui.semantic.kind](/portal/glossary/#glossary:ui.semantic.kind)

The board resolves the hash with `URLPattern.hash`; the literal colon in the
pattern is escaped as `glossary\::concept`.

## Partner-tree identity (disambiguation)

Overloaded terms are pinned in `lib/portal/semantic-vocabulary.ts`:

| Wire               | Glossary                           |
| ------------------ | ---------------------------------- |
| `node_id`          | `ops.limits.node` (= account)      |
| `node_type: agent` | `ops.limits.agent` (downline role) |
| `/api/agents/v1/…` | `api.agent` (HTTP for bots/tools)  |

## UX helpers

Shared progressive enhancement lives in
[`/portal/components/glossary-ux.js`](/portal/components/glossary-ux.js):

- hover/focus tooltips for `data-glossary-concept` and `#glossary:` links
- search autocomplete on the glossary board
- breadcrumbs on glossary + limits (`URLPattern` section/concept hashes)
- aggregate-only usage counts in `localStorage` (`fw.glossary.usage.v1`, no PII)

## Operate

```bash
bun run glossary:portal
bun run glossary:portal:check
bun test tests/domain-glossary-portal.test.ts
```
