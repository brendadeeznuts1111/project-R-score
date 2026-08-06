# Partner dashboard semantic map

Status: proposed MVP contract (2026-08-05)

This map joins the partner dashboard's domain language, registered concepts,
parsed shapes, connectors, portal regions, and theme roles. The machine-readable
authority for this proposal is
[`partner-dashboard-mvp.toml`](./partner-dashboard-mvp.toml); the repository
gate is `bun run partner:dashboard-plan:validate`.

## Semantic order

```text
business domain → concept → parsed shape → consuming surface → theme role
```

Theme is deliberately last. A color may present a state, but it cannot create,
merge, or rename a partner, accounting, Telegram, compliance, or trading fact.
The dashboard artifact carries semantic values and labels, never raw colors.

## Canonical nomenclature

| Meaning                      | Canonical name / wire path or shape                     | Owner      | Do not use in new core contracts               |
| ---------------------------- | ------------------------------------------------------- | ---------- | ---------------------------------------------- |
| Partner join identity        | `PartnerCode` / `partnerCode`                           | partners   | bare `partnerId`, generic `code`               |
| Partner relationship state   | `PartnerLifecycleState` / `lifecycle.state`             | partners   | generic `status`, `ops.limits.lifecycle_state` |
| Derived operator roll-up     | `PartnerOperationalPhase` / `operationalPhase`          | partners   | `phase` as lifecycle authority                 |
| Sportsbook account identity  | `OutId` / `outId`                                       | partners   | `accountId`, `CODE-N` in core                  |
| Source-qualified partner ID  | `ExternalPartnerRef` / `externalPartnerRefs`            | partners   | bare remote partner ID                         |
| Source-qualified account ID  | `ExternalAccountRef` / `externalAccountRefs`            | trading    | bare remote account ID                         |
| Out operability              | `OutOperationalStatus` / `operationalStatus`            | partners   | funding or provider state                      |
| Account funding completeness | `OutFundingStatus` / `fundingStatus`                    | accounting | `fundStatus`, generic `status`                 |
| Provider connectivity        | `ProviderConnectionStatus` / `providerConnectionStatus` | trading    | out readiness                                  |
| Connector freshness          | `ConnectorDataStatus` / `dataStatus`                    | operations | lifecycle, adapter, or business status         |
| Financial value              | `MoneyAmount` / `{currency, minorUnits}`                | accounting | floating-point balance/amount                  |
| Operator action reason       | `AttentionReasonCode` / `reasonCode`                    | partners   | display message as machine key                 |

`CODE-N` is named `LegacySeatOutToken`. The implemented pure `IngressTranslator`
maps it to `out-CODE-N` before the implemented `parseCanonicalOutId` is called.
HTTP/BFF, CLI, and artifact-adapter wiring is still unwired. `TreeNodeId`
remains the operations entity primary key; it may reference a partner but never
replaces `PartnerCode`.

## Boundary vocabulary

| Term          | Exact responsibility                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Source system | Produces a fact and is named in provenance.                                                       |
| Port          | Core-owned typed interface that accepts canonical facts.                                          |
| Adapter       | Parser/normalizer that translates one source payload into canonical facts.                        |
| Connector     | Configured source + adapter binding; owns timeout, circuit breaker, and last-known-good behavior. |
| Projection    | Pure join that produces `PartnerDashboardArtifact`.                                               |
| Portal region | Consumer of artifact fields and concept IDs.                                                      |
| Theme role    | Presentation alias resolved through `public/portal/theme.jsonc`.                                  |

## State axes and theme roles

All rows require a visible text label. Theme references resolve through portal
theme v1.3.0; the artifact stores none of the resolved colors.

The TOML also binds page, panel, elevated-panel, and filter-chip recipes to the
theme's layout, spacing, radius, shadow, typography, badge, and motion tokens.
This keeps component geometry and interaction timing under the same theme SSOT
without placing presentation values in the dashboard artifact.

| Axis                      | Values → theme roles                                                                                                                              | Semantic authority |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Partner lifecycle         | `signup→neutral`, `materialized→info`, `kyc_pending→warn`, `active→ok`, `cultivating→info`, `graduated→ok`, `suspended→bad`, `terminated→neutral` | partners           |
| Partner operational phase | `operator_ready→ok`, `onboarding→warn`, `incomplete→bad`, `paused→neutral`                                                                        | partners, derived  |
| Out operational status    | `unknown→neutral`, `ready→ok`, `deferred→warn`, `paused→neutral`, `blocked→bad`                                                                   | partners           |
| Out funding status        | `unknown→neutral`, `unfunded→bad`, `partial→warn`, `funded→ok`                                                                                    | accounting         |
| Provider connection       | `unknown→neutral`, `active→ok`, `inactive→bad`, `pending→warn`                                                                                    | trading            |
| Connector data            | `ok→fresh`, `stale→stale`, `unavailable→critical`                                                                                                 | operations         |
| Attention severity        | `info→info`, `warn→warn`, `block→bad`                                                                                                             | partner projection |

Existing `out.status.partial` and `out.status.funded` are presentation-only
compatibility concepts. The exact accounting concept gap is
`accounting.funding_status`; it must be registered before those compatibility
references are retired.

## Portal region map

| Region              | Domain facts consumed                               | Concept decision                                                  | Connectors                                                 |
| ------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Summary             | partner, accounting, Telegram, compliance           | propose `section.partnersSummary`                                 | profiles, accounting, legacy ops                           |
| Roster              | partner identity and roll-ups                       | propose `section.partnersRoster`                                  | profiles, accounting, Telegram, limits, Tennis, legacy ops |
| Profile             | partner identity, lifecycle, provenance             | propose `section.partnersProfile`                                 | profiles, Sports Terminal                                  |
| Accounts and limits | partner outs, compliance limits, bookmaker metadata | reuse `section.partnersAccountsLimits` and `section.partnersOuts` | profiles, limits, bookmakers                               |
| Accounting          | scoped balances and ledger entries                  | reuse `section.partnersAccounting`                                | accounting                                                 |
| Telegram            | handshake and membership readiness                  | reuse `section.partnersTelegram`                                  | Telegram                                                   |
| Attention           | deterministic cross-domain actions                  | propose `section.partnersAttention`                               | all except bookmakers-only metadata                        |
| Integrations        | source availability and freshness                   | propose `section.partnersIntegrations`                            | Tennis, Sports Terminal                                    |

The registered section mounts remain unchanged: `telegram`, `accounting`,
`accounts-limits`, `onboard`, `deposits`, `partner-message`, `outs`, `books`,
and `tag-filter-bar` retain their existing DOM IDs and concept IDs.

Partner hash routes are a separate compatibility plane: `#partners`,
`#partner/:code`, `#partner/:code/out/:outId`, `#partner/:code/accounting`,
`#partner/:code/telegram/:topic`, and `#book/:bookId` remain tied to
`PARTNER_HASH_PATTERN_INITS`.

## Connector map

| Snapshot key     | Connector             | Source owner | Adapter → core port                                      | Authority                       |
| ---------------- | --------------------- | ------------ | -------------------------------------------------------- | ------------------------------- |
| `profiles`       | `profile-coverage-registry` | partners | `profile-coverage-artifact` v1 → `PartnerProfileCoverageReadPort` | identity coverage only          |
| `accounting`     | `accounting-ledger`   | accounting   | `accounting-ledger` v1 → `AccountingReadPort`            | scoped balances, ledger         |
| `telegram`       | `telegram-handshake`  | telegram     | `telegram-handshake` v1 → `CommunicationReadPort`        | handshake, membership           |
| `limits`         | `limits-registry`     | compliance   | `limits-artifact` v1 → `LimitReadPort`                   | effective limits, coverage      |
| `bookmakers`     | `bookmakers-registry` | trading      | `bookmakers-registry` v1 → `BookmakerCatalogPort`        | book identity, display metadata |
| `tennis`         | `tennis-contract`     | trading      | `tennis-contract` v1 → `CapacityReadPort`                | executable capacity             |
| `sportsTerminal` | `sports-terminal`     | trading      | blocked until one exact input is selected                | no current authority            |
| `legacyOps`      | `legacy-ops-registry` | partners     | `legacy-partners-ops` v2 → `LegacyPartnerProjectionPort` | compatibility observations only |

The private `packages/partners` workspace now exports the TOML-facing plan
types, semantic-gap map, canonical identifier parsers, ingress-only out
translation, v1 artifact boundary, pure artifact assembler, and the redacted
profile-coverage adapter/read-port contract. Its remaining connector ports and
canonical source adapters are still planned. The selective legacy ops
compatibility adapter is implemented; it preserves partner/out visibility while
dropping non-authoritative and sensitive source fields, and it returns narrow
observations rather than canonical dashboard records. Profile coverage is the
first implemented connector; the other non-legacy source adapters remain
planned. Sports Terminal is disabled and blocked on one exact parsed input. The
required coverage artifact currently has zero entries and reports all four
current CODEs missing, so the plan must remain `proposal` until coverage is
materialized. The portal consumer contract is package-owned, but its browser
loader and generated public delivery modules remain planned.

Resilience belongs to connectors, not pure adapters. Defaults are a three-second
timeout, three-failure circuit threshold, five-minute stale window, and a
24-hour maximum last-known-good window for optional sources. `legacyOps` has a
hard cutoff of 2026-11-03. Active status requires eight connector snapshots;
retired status requires the v2 artifact schema and forbids the `legacyOps`
snapshot, connector, adapter, port, and region references. Weekly scheduling and
Slack delivery remain requirements that are not yet wired. Final removal still
requires zero legacy translations for 30 days and canonical profile coverage for
all four current partners.

## Concept gaps

The TOML records 15 proposed concepts. The most important semantic gaps are:

- partner profile, lifecycle state/provenance, source conflict, and attention;
- accounting funding status and scoped balance;
- trading provider connection status;
- connector data freshness status;
- the five new portal regions; and
- `ui.filter.partnerCode`, which replaces the misleading UI-only
  `ui.filter.partnerId` after consumer migration.

These gaps are proposals, not aliases. In particular, partner lifecycle must
never map to `ops.limits.lifecycle_state`, and partner profile must never map to
`ops.limits.profile`; both limits concepts describe enforceability, not the
partner relationship.

## Validation

```bash
bun run partner:dashboard-plan:validate
bun test tests/validate-partner-dashboard-plan.test.ts
bun run partners:governance
```

The validator rejects unknown or retired concepts, stale concept-gap entries,
unresolvable or wrong-kind theme tokens, stale generated theme CSS, raw colors,
incomplete or invented state axes, invalid business domains, connector/region
asymmetry, dishonest implementation status, and drift from the active/retired
snapshot contracts, nine section mounts, or six partner hash routes.
