# FactoryWager domain glossary

Portal: [/portal/glossary/](/portal/glossary/)
Machine artifact:
[/registry/domain-glossary.json](/registry/domain-glossary.json)

The portal projection exposes the canonical Kalshi-bot semantic glossary without
forking definitions into browser code. It includes market, model, tournament,
warehouse, trading, UI, and pipeline concepts, plus registry-column lineage.

## Deep links

Use `#glossary:<concept-id>` to open a definition directly:

- [/portal/glossary/#glossary:kalshi_mu](/portal/glossary/#glossary:kalshi_mu)
- [/portal/glossary/#glossary:eff_edge](/portal/glossary/#glossary:eff_edge)

The board resolves the hash with `URLPattern.hash`; the literal colon in the
pattern is escaped as `glossary\::concept`.

## Operate

```bash
bun run glossary:portal
bun run glossary:portal:check
bun test tests/domain-glossary-portal.test.ts
```
