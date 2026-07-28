# Bun capability × FactoryWager brand map

Portal: [/portal/brands/](/portal/brands/)
Relationship artifact: [/registry/bun-brand-map.json](/registry/bun-brand-map.json)
Glossary artifact: [/registry/brand-keymap.json](/registry/brand-keymap.json)

The relationship map joins canonical Bun API tokens with reviewed wrappers,
branded domain values, tracked projects, and exact runtime proof. The glossary
keeps the canonical 57-value brand catalog, constructor tiers, tracked-source
coverage, and per-project adoption evidence.

## Views

- **Relationships** — focused API → wrapper/consumer → brand → project/proof
  graph with an equivalent table and detail panel.
- **Glossary** — domain definitions, constructors, validation, and coverage.
- **Projects** — brand adoption joined with Bun capability and proof counts.

Filters and the selected relationship are stored in the URL fragment so views
can be shared without replacing the tenant query parameter.

## Constructor tiers

- `asX(value)` — required trusted interior value or owned mint.
- `tryX(value)` — optional config or soft merge; blank becomes `undefined`.
- `parseX(value)` — wire, JSON, CLI, form, or environment ingress.
- `BRAND_GUARDS.isX(value)` — narrow an already-canonical unknown value.

Guards prove canonical shape, not provenance or entity existence.

## Operate

```bash
bun tools/brand-catalog.ts
bun tools/brand-coverage.ts --attention
bun tools/brand-keymap.ts
bun tools/brand-keymap.ts --check
bun run bun:brand-map
bun run bun:brand-map:check
bun tools/branded-id-check.ts --staged --strict
```
