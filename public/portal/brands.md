# FactoryWager brand keymap

Portal: [/portal/brands/](/portal/brands/)
Machine artifact: [/registry/brand-keymap.json](/registry/brand-keymap.json)

The keymap joins the canonical 57-value brand catalog with tracked-source
coverage and per-project adoption evidence.

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
bun tools/branded-id-check.ts --staged --strict
```
