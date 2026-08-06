# `@factorywager/partners`

<!-- REF:ID 0.1.partners-package-readme -->
<a id="0.1.partners-package-readme"></a>

Private workspace authority for parsed partner-domain identifiers, ingress
compatibility, and the colorless dashboard read-model contract while the MVP is
extracted from legacy portal, Telegram, accounting, limits, Tennis, and Sports
Terminal code.

The artifact-core slice exports strict `PartnerCode` and canonical `OutId`
parsers, the ingress-only `CODE-N` translator, the exhaustive v1 artifact
boundary parser, and a pure caller-timestamped assembler over already reconciled
records. It does not yet join adapters or apply source precedence. It also does
not read files or SQLite, own theme tokens, mount APIs, or bake production data.
The redacted `profile-coverage-artifact` adapter and its
`PartnerProfileCoverageArtifactReader` boundary contract are implemented; its
connector I/O/resilience wiring, canonical source ports/adapters, and the Sports
Terminal transport are planned slices. Coverage is an implementation-readiness
input, not the final `profiles` dashboard snapshot or lifecycle authority. The
implemented `partners-ops.v2` compatibility projection drops credentials,
payment targets, money, Telegram IDs, limits, and presentation fields rather
than promoting them into partner-domain truth. Its output is a narrow
observation shape, not `PartnerDashboardRecord[]`.

The package also exports the implemented private `PartnerOutCapabilitySnapshot`
boundary and pure `evaluateExecutionConstraints` preflight. It models sanitized
sportsbook/skin resolution, straight/parlay/SGP support, wager catalogs
separately from promotions, and provenance-complete stake, gross-payout, and
net-win ceilings. Unknown evidence produces `manual_review`; the core does not
fetch providers, read secrets, reserve liquidity, post accounting entries, or
send Telegram.

The implemented `./adapters/bookmaker-account` resolver joins a submitted PPH
account URL to the bookmaker registry without probing the provider. Exact hosts
resolve directly, alternate hosts require an explicit alias, and unknown hosts
stop for manual review. A manual selection must still name a registered
`SportsbookId`; URL credentials, query tokens, fragments, ambiguous hosts, and
substring guesses are rejected. Loading `/registry/bookmakers.json` remains the
planned bookmakers connector's responsibility.

The implemented `./adapters/bookmakers` boundary parses the checked-in public
v0.4 catalog and projects only canonical sportsbook identity, label, skin, brand
group, and sanitized web URL. It enforces `object key === id === slug`, rejects
duplicate normalized hosts, and fails if ops-only fields appear. Catalog
loading, timeout, and last-known-good behavior remain connector
responsibilities; public display limits never become executable account limits.

Three implemented observation adapters now parse the existing integration
artifacts without taking over their domains:

- `./adapters/tennis-capacity` accepts only the pinned
  `https://tennis.factory-wager.com/api/v1` contract paths. Live bakes may emit
  credential and integer `max_stake` evidence; offline joins are visibility only
  and require explicit book-reference mapping.
- `./adapters/telegram-handshake` emits handshake phase, DM linkage, gaps, and
  next steps. It drops invite URLs and does not invent membership counts or
  configured topics absent from the artifact.
- `./adapters/limit-changes` maps tree nodes and sportsbook references
  explicitly, converts exact USD values to integer cents, and marks every row
  `currentExecutionCeiling: false`.

Connector loading, last-known-good resilience, reconciliation into the public
dashboard artifact, liquidity reservation, accounting posting, and Telegram
delivery remain outside these pure adapters.

The browser-neutral `./portal` contract now owns the current input inventory,
the canonical artifact path, and the future query-only `?compare=legacy` policy.
The canonical single-artifact browser loader and generated public modules remain
planned; canonical load failure must never fall back to legacy rendering. The
current 7+1 compatibility fetches already use the shared `/portal/fetch-json.js`
transport for timeout, JSON `Accept`, same-origin credentials, advisory
debug-gated MIME diagnostics, and structured transport results. Required board
loads convert failures to path-qualified thrown errors. The helper's five-second
browser timeout is separate from the target three-second connector/bake
resilience policy.

No canonical inbound partner HTTP route, authentication integration, accepted
media-type list, or multipart/FormData contract exists yet. The browser GET
transport is outbound compatibility behavior, not an API ingress contract.

Contract authority:

- [`docs/design/partner-dashboard-mvp.toml`](../../docs/design/partner-dashboard-mvp.toml)
- [`docs/design/partner-dashboard-semantic-map.md`](../../docs/design/partner-dashboard-semantic-map.md)
- [`docs/design/partner-type-reference-map.md`](../../docs/design/partner-type-reference-map.md)
- [`docs/design/partner-dashboard-field-lineage.md`](../../docs/design/partner-dashboard-field-lineage.md)

Operator mesh (portal · Telegram · inventory · REF:ID):

| Concern | Path / command |
| ------- | -------------- |
| Portal board | [`/portal/partners/`](../../public/portal/partners/) · [`public/portal/partners.md`](../../public/portal/partners.md) |
| Handshake runbook | [`partner-package-group-handshake.md`](../../docs/harness/tenants/partner-package-group-handshake.md) · `bun run telegram:handshake:catalog` |
| Factory Telegram | [`telegram-factory.md`](../../docs/harness/tenants/telegram-factory.md) |
| Surface inventory | [`partner-surface-inventory.md`](../../docs/design/partner-surface-inventory.md) · `bun run partner-surface-inventory:validate` |
| Documentation register REF:IDs | `PARTNER_DOCUMENTATION_REFS` · `bun run docs:refid:check` · `docs:refid:audit` |
| Wiki tenant map | [wiki-index § Operator · portal · Telegram](../../wiki-index.md#operator--portal--telegram) |
- [`docs/design/partner-code-consolidation.md`](../../docs/design/partner-code-consolidation.md)
- [`public/registry/partner-profile-coverage.json`](../../public/registry/partner-profile-coverage.json)

```bash
bun --cwd=packages/partners run build
bun --cwd=packages/partners run test
bun run partner:dashboard-plan:validate -- --unregistered
bun run partner-profile:coverage:bake:check
```

No production `partners-dashboard.json` is emitted until profile coverage is
complete, lifecycle and other contested canonical facts carry sufficient source
evidence, freshness is computed rather than caller-asserted, and any non-profile
record carries an explicit `partner.profile.migration_required` attention item.
The legacy adapter cannot create a record by itself because lifecycle remains a
mandatory canonical fact.
