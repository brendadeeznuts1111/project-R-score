# FactoryWager domain glossary

Portal: [/portal/glossary/](/portal/glossary/)
Machine artifact:
[/registry/domain-glossary.json](/registry/domain-glossary.json)

The schema-v2 portal projection combines the canonical Kalshi-bot domain
glossary with the typed portal field vocabulary from
`lib/portal/semantic-vocabulary.ts`. It includes market, model, tournament,
warehouse, trading, UI, and pipeline concepts, plus registry-column lineage
and cross-portal semantic types and UI roles.

`Concept kind` describes provenance (`ui`, `registry`, `composite`).
`Semantic type` describes the stable data role. `UI role` describes rendering.
Operational kinds such as `edge-health` are governed values of the Kind
concept rather than glossary concept kinds.

## Deep links

Use `#glossary:<concept-id>` to open a definition directly:

- [/portal/glossary/#glossary:kalshi_mu](/portal/glossary/#glossary:kalshi_mu)
- [/portal/glossary/#glossary:eff_edge](/portal/glossary/#glossary:eff_edge)
- [/portal/glossary/#glossary:ui.semantic.status](/portal/glossary/#glossary:ui.semantic.status)
- [/portal/glossary/#glossary:ui.semantic.kind](/portal/glossary/#glossary:ui.semantic.kind)

The board resolves the hash with `URLPattern.hash`; the literal colon in the
pattern is escaped as `glossary\::concept`.

## Operate

```bash
bun run glossary:portal
bun run glossary:portal:check
bun test tests/domain-glossary-portal.test.ts
```
