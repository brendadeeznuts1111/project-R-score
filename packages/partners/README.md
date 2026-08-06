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
