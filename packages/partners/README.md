# `@factorywager/partners`

Private workspace authority for partner-dashboard contracts while the MVP is
extracted from legacy portal, Telegram, accounting, limits, Tennis, and Sports
Terminal code.

The first slice exports the target package metadata, TOML-facing plan types,
and the exact unresolved semantic-gap map. It does not yet implement connector
ports, adapters, the dashboard builder, or the Sports Terminal contract.

```bash
bun --cwd=packages/partners run build
bun --cwd=packages/partners run test
bun run partner:dashboard-plan:validate -- --unregistered
```
