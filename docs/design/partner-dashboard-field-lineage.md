# Partner dashboard field lineage and risk audit

Status: executable-contract audit (2026-08-06)

This document maps the implemented `PartnerDashboardArtifact` v1 wire to its
intended source, adapter, reconciliation owner, and portal use. It is
subordinate to `partner-dashboard-mvp.toml`: the TOML remains the
machine-readable plan, while
`PARTNER_DASHBOARD_CONNECTOR_AUTHORITATIVE_FACT_PATHS` in
`packages/partners/src/dashboard-plan.ts` prevents the plan from naming fields
that the implemented artifact does not accept.

## Audit result

The artifact parser and assembler are a sound structural starting point, but the
end-to-end read model is not implementation-ready. The parser validates a strict
JSON shape, identifiers, integer money, scoped accounts, uniqueness, and derived
counts. Only lifecycle has field-level provenance. Source adapters, field
reconciliation, freshness calculation, conflict redaction, artifact I/O, and the
single-artifact portal loader remain planned.

Three path claims were removed because they do not exist on the v1 wire:

- `partners[].policy` — profile policy may inform derived facts and attention,
  but policy is deliberately not public dashboard data;
- `partners[].accounting.fundingPositions` — funding is represented by
  `partners[].outs[].fundingStatus`, not a second accounting collection;
- `partners[].outs[].sportsbookDisplayMetadata` and
  `partners[].outs[].activeCapacity` — the current wire exposes `sportsbookId`,
  `activeOutIds`, `maxBet`, operational status, and integration freshness
  instead.

The validator now requires each connector's `authoritative_fact_paths` to match
the package-owned map exactly. `provides` remains the broader adapter capability
inventory; it is not permission to serialize a field.

## End-to-end stages

```text
source payload
  -> source-owned parser
  -> typed adapter observations
  -> field reconciliation and conflict/redaction policy
  -> PartnerDashboardBuildInput
  -> assemblePartnerDashboardArtifact
  -> parsePartnerDashboardArtifact
  -> /registry/partners-dashboard.json
  -> portal single-artifact loader
```

Only the final two in-memory functions are implemented for the canonical
artifact. Profile coverage and legacy partners-ops have deliberately narrow
implemented adapters, but neither produces canonical dashboard records.

## Canonical connector authority

| Connector           | Artifact paths it may author                                                 | Current source evidence                                                                                      | Boundary status        | Fallback rule                                                                                            |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| canonical profile   | CODE, call sign, lifecycle, identity, OutId, qualified external account refs | private TOML glob is planned; the public redacted coverage artifact is 0/4 and proves only identity coverage | parser/adapter planned | required source may use last-known-good only inside the stale window; coverage never supplies lifecycle  |
| accounting ledger   | scoped balances, recent entries, out funding status                          | `partner_ledger` is named, but the canonical port and adapter are planned                                    | planned                | optional last-known-good up to 24 hours, then unavailable; never source finance from Telegram or profile |
| Telegram handshake  | communication readiness aggregate                                            | public handshake artifact exists for four rows                                                               | planned                | optional last-known-good; no accounting mutations                                                        |
| limits registry     | partner limit coverage and per-out coverage ratio                            | public registry exists but is node/account oriented and needs explicit partner/out resolution                | planned                | optional last-known-good; must not own bookmaker identity                                                |
| bookmakers registry | canonical `sportsbookId`                                                     | public bookmaker catalog exists and includes aliases/display fields                                          | planned                | aliases normalize identity; display metadata is not on artifact v1                                       |
| Tennis contract     | active OutIds, per-bet `maxBet`, out operational status, Tennis freshness    | public contract has four partner rows and explicit `perBetMaxCents`                                          | planned                | preferred fresh capacity source; stale/offline must remain visible                                       |
| Sports Terminal     | none while blocked                                                           | candidate routes are unmounted, unauthenticated at the handler boundary, and use unqualified IDs/float money | blocked                | no source promotion or silent fallback                                                                   |
| legacy partners-ops | none                                                                         | selective observation adapter is implemented for four partners and ten outs                                  | compatibility only     | may support comparison during migration; cannot author canonical truth or appear in source precedence    |

Connector snapshots are assembler metadata, not connector-authored business
facts. Summary fields and attention rows are derived by the projection.

## Field lineage

| Artifact field                               | Semantic owner        | Target input                                                              | Reconciliation/derivation                                                              | Implemented guard                                                | Remaining gap                                                                                          |
| -------------------------------------------- | --------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `schema`                                     | partners package      | package constant                                                          | fixed v1 literal                                                                       | exact literal                                                    | v2 retirement change is planned                                                                        |
| `generatedAt`                                | projection            | bake clock                                                                | one build timestamp                                                                    | canonical UTC ISO                                                | no future/skew policy                                                                                  |
| `connectorSnapshots.*`                       | operations/projection | connector executions                                                      | calculate `ok`, `stale`, or `unavailable` from observed time and resilience policy     | exact eight-key shape; timestamp required for ok/stale           | status is caller-asserted; input ref is not pinned to connector; no age calculation                    |
| `activeOutIds`                               | trading/capacity      | Tennis first, then approved Sports source                                 | reconcile observed active set; never infer from registered count                       | canonical IDs, unique, registered, and `operationalStatus=ready` | no per-fact provenance or observation time                                                             |
| `summary.*Count`                             | projection            | canonical partner records                                                 | deterministic aggregation                                                              | parser recomputes all six counts                                 | none for counts                                                                                        |
| `summary.balancePositions`                   | accounting/projection | partner accounting records                                                | exact flattened copy                                                                   | parser compares exact JSON                                       | rail-scoped positions lose enclosing partner context; duplicated data increases drift risk             |
| `conflicts[]`                                | reconciliation        | two or more adapter observations                                          | emit disagreement after precedence; never latest-write wins                            | scalar values and aligned array lengths                          | arbitrary field paths/adapter strings; values need not differ; string values are not actually redacted |
| `partners[].partnerCode`                     | partners              | canonical profile                                                         | exact canonical identity                                                               | strict `^[A-Z]{3,6}$`, unique                                    | profile adapter absent                                                                                 |
| `partners[].callSign`                        | partners              | canonical profile                                                         | must be base call sign for CODE                                                        | parsed against PartnerCode                                       | profile adapter absent                                                                                 |
| `partners[].lifecycle`                       | partners              | canonical profile; declared Sports translation only after boundary exists | source fact with effective time and mapping provenance                                 | full provenance block and eight-state enum                       | canonical adapter absent; legacy observations cannot supply it                                         |
| `partners[].operationalPhase`                | partners/projection   | lifecycle plus readiness facts                                            | derived, not source-authored                                                           | four-state enum                                                  | derivation and provenance/explanation absent                                                           |
| `partners[].identity`                        | partners              | canonical profile                                                         | qualified refs only                                                                    | branded source/tree/external IDs and global uniqueness           | profile adapter absent                                                                                 |
| `partners[].outs[].outId`                    | partners              | canonical profile account declarations                                    | ingress translator may convert `CODE-N` before core                                    | canonical `out-CODE-N`, ownership and uniqueness                 | profile adapter absent                                                                                 |
| `partners[].outs[].sportsbookId`             | bookmakers            | bookmaker catalog plus declared book ref                                  | resolve aliases to canonical ID                                                        | branded non-empty ID                                             | alias resolver adapter absent                                                                          |
| `partners[].outs[].operationalStatus`        | trading/capacity      | Tennis, later authenticated Sports                                        | precedence is Tennis then Sports then labeled legacy observation                       | enum; active IDs must reference ready outs                       | adapter/reconciliation absent; source lineage not serialized                                           |
| `partners[].outs[].fundingStatus`            | accounting            | accounting adapter                                                        | accounting-only projection                                                             | separate enum                                                    | source adapter and field provenance absent                                                             |
| `partners[].outs[].providerConnectionStatus` | trading               | authenticated provider/Sports adapter                                     | optional external connection observation                                               | separate enum                                                    | no approved source currently; Sports is blocked                                                        |
| `partners[].outs[].externalAccountRefs`      | partners/trading      | profile declarations and qualified execution refs                         | reconcile by source-system namespace                                                   | branded refs and global uniqueness                               | ownership between profile and execution needs a per-source rule                                        |
| `partners[].outs[].maxBet`                   | trading/capacity      | Tennis `perBetMaxCents` for MVP                                           | integer cents to `MoneyAmount`; do not use bookmaker display limits as execution truth | safe integer and currency                                        | naming is ambiguous; provenance/freshness absent                                                       |
| `partners[].outs[].limitCoverageRatio`       | compliance            | limits adapter                                                            | tracked/expected coverage in `[0,1]`                                                   | finite ratio                                                     | denominator evidence and source time absent                                                            |
| `partners[].accounting.balancePositions`     | accounting            | accounting adapter                                                        | exact scope/currency positions, no cross-currency total                                | structured scope, safe integer money, partner/out ownership      | rail scope does not prove partner ownership; provenance absent                                         |
| `partners[].accounting.recentEntries`        | accounting            | accounting adapter                                                        | bounded, deterministic recent window                                                   | ID uniqueness, scope, time, money                                | `entryType` and `proofRef` are free strings; window policy absent                                      |
| `partners[].communication`                   | Telegram              | handshake/forum adapter                                                   | readiness summary only                                                                 | exact keys, unique topic strings, nonnegative count              | handshake/topic vocabularies and provenance are unconstrained                                          |
| `partners[].limits`                          | compliance            | limits adapter                                                            | derived tracked/missing counts                                                         | exact ratio consistency                                          | coverage subject/denominator is implicit                                                               |
| `partners[].integrations.tennis`             | trading/operations    | Tennis connector snapshot                                                 | partner-keyed availability                                                             | status/time shape                                                | duplicates global snapshot without an explicit linkage invariant                                       |
| `partners[].integrations.sportsTerminal`     | trading/operations    | future authenticated adapter                                              | partner-keyed availability                                                             | status/time shape                                                | must remain absent/unavailable while source is blocked                                                 |
| `partners[].attention[]`                     | projection            | validation, freshness, conflicts, missing facts                           | deterministic reason catalog and action mapping                                        | reason ID, severity, exact keys                                  | label/action strings are unconstrained; action command allow-list absent                               |

## Type fitness

| Type or shape                                     | Fitness | Keep                                                  | Improve before canonical bake                                                                      |
| ------------------------------------------------- | ------: | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `PartnerCode`, `PartnerCallSign`, `OutId` parsers |     5/5 | strict brands and cross-field ownership checks        | add only source-specific translation outside core                                                  |
| `MoneyAmount`                                     |     5/5 | currency plus safe integer minor units                | reject unsupported currencies at an owning boundary if required                                    |
| `AccountScope`                                    |     4/5 | discriminated partner/out/rail union                  | retain partner context when positions are copied to summary                                        |
| lifecycle source fact                             |     4/5 | effective time plus source/adapter/mapping/confidence | enforce source-specific adapter IDs and observed-time bounds                                       |
| separate operational/funding/provider statuses    |     5/5 | prevents collapsed ambiguous status                   | attach provenance to reconciled facts                                                              |
| connector snapshot                                |     2/5 | compact dataset-level availability                    | compute freshness, pin expected input ref, reject future observations, record last-known-good use  |
| source conflict                                   |     2/5 | explicit disagreement is better than silent overwrite | constrain field path and `AdapterId`, require distinct values, redact with field-specific encoders |
| communication aggregate                           |     2/5 | safe transport-free projection                        | typed handshake/topic vocabularies and fact provenance                                             |
| ledger entry                                      |     3/5 | scoped integer money and stable ID                    | typed entry kind, proof-reference grammar, deterministic recent-window contract                    |
| attention item                                    |     3/5 | reason code and severity are useful                   | command/action allow-list; generate labels in portal where possible                                |

## Blocking risks and MVP decisions

| Priority | Risk                                                                                                                                | Decision                                                                                                                                                                                                                        |
| -------: | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|       P0 | The system can label stale data `ok` because freshness is caller supplied.                                                          | Build one resilience evaluator that derives status from `generatedAt`, `observedAt`, 300-second stale policy, and 24-hour optional last-known-good limit. Reject future observations outside a documented clock-skew allowance. |
|       P0 | Most reconciled fields cannot answer “which source won?”                                                                            | Keep lifecycle's envelope and add typed source evidence to contested status, capacity, finance, and communication projections before emitting production data. Dataset snapshots alone are insufficient.                        |
|       P0 | Conflict strings can leak secrets despite the `redacted` label.                                                                     | Permit only registered conflict paths and per-path redacted scalar encoders. Require branded adapter IDs and at least two distinct normalized values.                                                                           |
|       P0 | A legacy observation cannot honestly become a dashboard record because lifecycle is mandatory and legacy is forbidden to author it. | Preserve legacy rows as reconciliation observations only. A partner appears in the canonical artifact only after a defensible lifecycle fact exists; a migration attention item does not replace that fact.                     |
|       P1 | `maxBet` conflates a bookmaker limit, an operator-entered desk limit, and executable per-bet capacity.                              | For MVP, Tennis owns this artifact path and maps `perBetMaxCents`; document the UI label as “observed per-bet capacity.” Rename the field in the next wire revision if other limit meanings are needed.                         |
|       P1 | Flattened summary balances discard enclosing partner context for rail scope.                                                        | Remove `summary.balancePositions` or wrap each copied position with `partnerCode` before production bake. Do not aggregate rail positions across partners implicitly.                                                           |
|       P1 | Bookmaker display data is needed for friendly UI labels but absent from the one-artifact contract.                                  | Render canonical `sportsbookId` in the first loader, or add a small artifact-owned catalog projection explicitly. Do not make the browser fetch the bookmaker registry again.                                                   |
|       P1 | Free-string handshake, ledger kind, proof link, and action command weaken the boundary.                                             | Introduce bounded vocabularies/grammars in owning adapters before wiring operator actions.                                                                                                                                      |

## Recommended next implementation slice

1. Implement the canonical profile adapter and an observation type that carries
   profile identity/lifecycle evidence without exposing private policy.
2. Implement the shared freshness/last-known-good evaluator and make connector
   snapshots its output rather than caller-authored data.
3. Implement Tennis normalization for active OutIds, operational status,
   `perBetMaxCents -> MoneyAmount`, and partner-level freshness.
4. Add reconciliation with a registered field-path table, distinct conflict
   values, and redaction functions.
5. Resolve the summary balance and `maxBet` naming decisions before producing
   `/registry/partners-dashboard.json`.
6. Only then implement the portal's canonical single-artifact loader; keep
   `?compare=legacy` diagnostic-only and never an automatic fallback.

This slice is smaller and safer than copying the existing portal join: it proves
identity, lifecycle, active capacity, freshness, and source conflict behavior
before accounting and Telegram are allowed to widen the artifact.
