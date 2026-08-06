# `@factorywager/partners`

Private workspace authority for parsed partner-domain identifiers, ingress
compatibility, and the colorless dashboard read-model contract while the MVP is
extracted from legacy portal, Telegram, accounting, limits, Tennis, and Sports
Terminal code.

The artifact-core slice exports strict `PartnerCode` and canonical `OutId`
parsers, the ingress-only `CODE-N` translator, the exhaustive v1 artifact
boundary parser, and a pure caller-timestamped assembler over already reconciled
records. It does not yet join adapters or apply source precedence. It also does
not read files or SQLite, own theme tokens, mount APIs, or bake production data.
Connector ports/adapters and the Sports Terminal transport remain separate
planned slices.

```bash
bun --cwd=packages/partners run build
bun --cwd=packages/partners run test
bun run partner:dashboard-plan:validate -- --unregistered
```

No production `partners-dashboard.json` is emitted until input profiles are
redacted, provenance-complete, and either canonical or paired with an explicit
`partner.profile.migration_required` attention item.
