# Partner dashboard MVP

<!-- REF:ID 0.1.partner-dashboard-mvp -->
<a id="0.1.partner-dashboard-mvp"></a>

Status: implementation outline (2026-08-05)

The dashboard domain contract is supported by the separate
[Bun channel and type governance contract](./bun-channel-governance.md). The
partner plan references that toolchain SSOT; it does not own runtime versions,
release feeds, npm channels, or cron schedules.

## Authority map

| Artifact                             | Owns                                                                                                                                                                                           | Must not own                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `partner-dashboard-mvp.toml`         | MVP composition, connector/region bindings, ingress compatibility, resilience, theme references, and retirement gates                                                                          | Runtime/type channel values or generated dashboard data          |
| `partner-dashboard-semantic-map.md`  | Human-readable nomenclature and concept/surface interpretation                                                                                                                                 | A second machine contract                                        |
| `partner-type-reference-map.md`      | Existing-to-canonical type/reference decisions and migration evidence                                                                                                                          | Dashboard layout or runtime policy                               |
| `partner-dashboard-field-lineage.md` | Implemented field-to-source trace, type fitness, and unresolved wire risks                                                                                                                     | A second source-precedence contract                              |
| `config/bun-channels.toml`           | Bun/runtime/type/feed/schedule policy                                                                                                                                                          | Partner business semantics                                       |
| `partners-dashboard.json`            | Derived read model only; safe to regenerate                                                                                                                                                    | Policy or source truth                                           |
| `@factorywager/partners`             | Target owner for parsed domain types, ports, pure adapters, and projection code; currently artifact core, ingress and legacy compatibility, profile coverage, and the portal consumer contract | Telegram transport, accounting storage, or theme token ownership |

The TOML is the machine-readable MVP planning SSOT. The semantic and type maps
explain its vocabulary and migration evidence; validators enforce that they do
not silently become competing contracts. Global DX may register these paths, but
it never copies their values.

## Outcome

The MVP is a read-only operator dashboard at the existing `/portal/partners/`
route. It answers four questions without requiring the browser to understand
Telegram, SQLite, limits, or Tennis contracts:

1. Who is the partner and what lifecycle state are they in?
2. Which bookmaker accounts/outs are ready, blocked, or missing information?
3. What is the current accounting position and what needs attention?
4. Is communication/handshake ready, and where should the operator act next?

## Single dashboard artifact

Add a versioned, baked contract:

```text
config/partner-profiles/*.toml
          │
          ▼
@factorywager/partners core ───────────────┐
          ▲                                │
          │ ports                          ▼
  ┌───────┼────────┬────────┬────────┐  partners-dashboard.json
  │       │        │        │        │          │
Telegram Accounting Limits Bookmakers Tennis    ▼
 adapters  adapter adapter  adapter   adapter  /portal/partners/
```

Target: `/registry/partners-dashboard.json`

```ts
type PartnerDashboardArtifact = {
  schema: 'factorywager.partners-dashboard.v1';
  generatedAt: string;
  connectorSnapshots: Record<
    | 'profiles'
    | 'accounting'
    | 'telegram'
    | 'limits'
    | 'bookmakers'
    | 'tennis'
    | 'sportsTerminal'
    | 'legacyOps',
    ConnectorSnapshot
  >;
  activeOutIds: OutId[]; // explicit live-capacity set; distinct from registered outs
  summary: {
    partnerCount: number;
    canonicalProfileCount: number;
    operatorReadyPartnerCount: number;
    attentionPartnerCount: number;
    registeredOutCount: number;
    activeOutCount: number;
    balancePositions: BalancePosition[];
  };
  conflicts: Array<{
    partnerCode: PartnerCode;
    fieldPath: string;
    adapterIds: AdapterId[];
    values: Array<string | number | boolean | null>; // redacted forensic scalars only
  }>;
  partners: PartnerDashboardRecord[];
};

type PartnerDashboardRecord = {
  partnerCode: PartnerCode;
  callSign: PartnerCallSign;
  lifecycle: LifecycleStateFact;
  operationalPhase: PartnerOperationalPhase;
  identity: {
    treeNodeId?: TreeNodeId;
    profileSourceSystemId: SourceSystemId;
    externalPartnerRefs: ExternalPartnerRef[];
  };
  outs: Array<{
    outId: OutId;
    sportsbookId: SportsbookId;
    operationalStatus: OutOperationalStatus;
    fundingStatus: OutFundingStatus;
    providerConnectionStatus?: ProviderConnectionStatus;
    externalAccountRefs: ExternalAccountRef[];
    maxBet?: MoneyAmount;
    limitCoverageRatio?: number; // [0,1]
  }>;
  accounting: {
    balancePositions: BalancePosition[];
    recentEntries: Array<{
      id: LedgerEntryId;
      entryType: string;
      amount: MoneyAmount;
      balanceAfter?: MoneyAmount;
      accountScope: AccountScope;
      postedAt: string;
      proofRef?: string;
    }>;
  };
  communication: {
    chatLinked: boolean;
    handshakeStatus: string;
    membershipCount?: number;
    configuredTopicKeys: string[];
  };
  limits: { tracked: number; missing: number; coverageRatio: number }; // [0,1]
  integrations: {
    tennis?: { dataStatus: ConnectorDataStatus; observedAt?: string };
    sportsTerminal?: {
      dataStatus: ConnectorDataStatus;
      observedAt?: string;
    };
  };
  attention: Array<{
    reasonCode: AttentionReasonCode;
    severity: 'info' | 'warn' | 'block';
    label: string;
    actionHref?: string;
    actionCommand?: string;
  }>;
};

type ConnectorSnapshot = {
  dataStatus: ConnectorDataStatus;
  observedAt?: string;
  inputRef: string;
  snapshotRef?: string;
};

type LifecycleStateFact = {
  state: PartnerLifecycleState;
  effectiveAt: string;
  provenance: {
    sourceSystemId: SourceSystemId;
    sourceRecordRef?: string;
    adapterId: AdapterId;
    adapterVersion: string;
    observedAt: string;
    originalValue: string;
    mappingMethod: 'identity' | 'declared' | 'derived' | 'heuristic';
    confidence: 'exact' | 'approximate' | 'unknown';
  };
};

type ExternalPartnerRef = {
  sourceSystemId: SourceSystemId;
  externalId: ExternalPartnerId;
};

type ExternalAccountRef = {
  sourceSystemId: SourceSystemId;
  externalId: ExternalAccountId;
};

type OutOperationalStatus =
  'unknown' | 'ready' | 'deferred' | 'paused' | 'blocked';
type OutFundingStatus = 'unknown' | 'unfunded' | 'partial' | 'funded';
type ProviderConnectionStatus = 'unknown' | 'active' | 'inactive' | 'pending';
type ConnectorDataStatus = 'ok' | 'stale' | 'unavailable';

type MoneyAmount = {
  currency: CurrencyCode;
  minorUnits: number; // safe integer on JSON wire; SQLite INTEGER
};

type BalancePosition = {
  accountScope: AccountScope;
  amount: MoneyAmount;
  effectiveAt: string;
};

type AccountScope =
  | { kind: 'partner'; partnerCode: PartnerCode }
  | { kind: 'out'; outId: OutId }
  | { kind: 'rail'; railId: RailId };
```

This block is the active compatibility contract, schema v1. Retirement is a real
wire change: schema v2 removes the `legacyOps` connector snapshot along with its
connector, adapter, port, and region references. The validator accepts neither
“retired but still present” nor “removed while still on v1.”

The branded identifier and reference decisions are defined in the
[partner type/reference map](./partner-type-reference-map.md), and their
concept/surface/theme bindings are in the
[semantic map](./partner-dashboard-semantic-map.md). Brands serialize as
validated strings at the JSON boundary. Canonical `OutId` is
`out-{PartnerCode}-{n}`; the older `CODE-N` seat form is ingress-only. The
executable field-to-source trace and the gaps discovered between planned
connectors and the implemented wire are recorded in the
[field-lineage audit](./partner-dashboard-field-lineage.md).

Every lifecycle value carries the mandatory provenance block. Once its blocked
adapter has an exact input contract, a Sports Terminal `frozen` value must
serialize as a canonical `suspended` state while remaining queryable as
`originalValue: "frozen"`, adapter ID `sports-terminal`, adapter version `2`,
mapping method `declared`, and confidence `exact`. This is a target mapping, not
current adapter behavior. A future canonical lifecycle/profile adapter must use
its profile source and an `identity` mapping method; that adapter and its exact
source contract are not implemented in the current slice.

In the target architecture, all untrusted files, network responses, database
rows, and environment values are parsed by their owning adapters. The read-model
builder then receives typed adapter results and the dashboard receives one
trusted JSON artifact. Today, only the profile-coverage and legacy compatibility
slices implement that boundary; the current portal still reads its documented
7+1 compatibility inputs.

There is no canonical partner HTTP route yet. Sports Terminal contains an
existing `partnerRoutes(req)` module and a mounted React `/partners` page that
calls it, but the module is not imported or mounted by the main API router or
server entrypoint. Its header claims JWT/admin protection while its exported
boundary receives no auth context. The list/detail shapes use bare `partnerId`;
the detail response mixes contact data, Telegram config, lifecycle, limits, and
floating-point money. These surfaces are now exact cutover evidence, not an
approved connector. The closest read candidate is
`GET /api/partners/:id/sources/health`, which still needs authenticated
mounting, `ExternalPartnerRef` resolution, response parsing, and a money-free
projection. No inbound JSON, Blob, explicit MIME, FormData, or multipart
contract has been selected. The browser's outbound GET transport does not imply
an inbound API Content-Type contract. Legacy APIs remain inventory sources, not
the canonical partner API.

Target source precedence is field-specific; only the profile-coverage and
legacy-ops boundaries are implemented in the current slice:

- identity and policy: canonical profile;
- live capacity: fresh Tennis adapter, then an authenticated Sports adapter once
  its blocked boundary is resolved; legacy observations never author capacity;
- communication: Telegram adapter only;
- finance: accounting adapter only;
- disagreements: explicit `conflicts` rows, never silent latest-value wins.

Registered outs and active live-capacity outs are distinct metrics. Current
artifacts report 10 registered ops outs and 5 active Tennis outs.

`legacyOps` is an explicit compatibility adapter, not an invisible fallback. It
may preserve current partner/out observations while profiles are materialized,
but it cannot create a canonical dashboard record by itself: v1 still requires a
defensible lifecycle fact. A non-profile record also requires a
profile-migration attention item. Bare external `partnerId` values are retained
only as source-qualified external identity references; they are not provenance
or join keys.

Its hard cutoff is 2026-11-03. The semantic-plan validator fails after that date
until the connector and `legacyOps` snapshot key are removed under the v2
artifact schema. Weekly scheduling and Slack delivery remain explicitly unwired
rather than being claimed as implemented.

## Ingress translation

The pure `IngressTranslator` now lives in `@factorywager/partners/compatibility`
and runs before the core parser. Its HTTP/BFF, CLI, and connector-adapter
callers are still unwired; once added, each will call this same translator. It
is not embedded in the core or limited to one deployment transport.

The sole MVP rewrite is:

```text
CODE-N  →  out-CODE-N
```

The translator validates `^([A-Z]{3,6})-([1-9][0-9]*)$`, returns the canonical
ID plus the SSOT-owned counter/warning metadata, retains the original input for
fact provenance, and then calls `parseCanonicalOutId`. Ingress callers—not the
pure translator—emit the warning and increment the counter. Unknown aliases are
rejected rather than guessed. The mapping can be removed only after production
translation count remains zero for 30 days and every producer emits canonical
IDs.

## Page structure

```text
┌ Partners ─ profile/account/communication readiness ────── freshness ┐
│ 4 partners │ ready 2 │ attention 2 │ 10 accounts │ balance $…       │
├ Filters: CODE · phase · out readiness/funding · attention only ──────┤
│ Partner roster                                                       │
│ CODE  lifecycle  phase  accounts  limits  balance  telegram  action  │
├ Selected partner ─────────────────────────────────────────────────────┤
│ Identity/profile │ accounts & limits │ accounting │ communication     │
│ Attention queue / next actions                                        │
└ Links: Account · History · Limits · Bookmakers · Factory · Tennis ────┘
```

The MVP does not reproduce every adjacent board. It links to deep specialist
surfaces while presenting their partner-keyed health and freshness.

## Sections

| Section        | Required source                            | MVP content                                                                        | Deferred                             |
| -------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------ |
| Summary        | read model                                 | partners, ready, attention, accounts, balance                                      | forecasts and trends                 |
| Roster         | planned lifecycle/profile facts + adapters | CODE, lifecycle/phase, out readiness, coverage, funding status, Telegram readiness | custom columns                       |
| Partner detail | planned lifecycle/profile adapter          | lineage, template, jurisdiction summary, lifecycle                                 | profile editing                      |
| Accounts       | planned profile + bookmakers + limits      | book, status, max bet, funding method label, coverage                              | live credentials/balances            |
| Accounting     | accounting adapter                         | scoped balances, recent ledger rows, proof links                                   | payment execution and reconciliation |
| Communication  | Telegram adapter                           | linked, handshake, members, configured topics                                      | sending messages from Pages          |
| Attention      | all adapters                               | deterministic action rows with deep links/CLI hints                                | automated remediation                |
| Integrations   | Tennis/Sports Terminal adapters            | availability and freshness only                                                    | embedding product dashboards         |

## PPH intake and execution preflight

The implemented private `PartnerOutCapabilitySnapshot` joins a sanitized account
URL to `PartnerCode`, canonical `OutId`, `SportsbookId`, and optional skin
metadata. It keeps straight, parlay, and same-game-parlay support explicit and
separates wager market catalogs from promotional offers.

The implemented bookmaker-account resolver now performs the URL-to-book/skin
join. It accepts exact registry hosts or explicit alternate-host aliases; an
unknown host becomes manual review, and a manual choice must still resolve to a
registered `SportsbookId`. It does not guess from substrings or parent domains.
The resolver is pure; loading the bookmaker artifact and probing a provider
remain planned connector work.

### Integration observations now implemented

The Tennis, Telegram, and limit-change artifacts now have package-owned parsing
boundaries. Tennis live v1 data may contribute canonical out activity,
credential readiness, and integer max-stake evidence after an explicit external
book-reference mapping. Offline Tennis joins never become execution evidence.

Telegram contributes handshake phase, DM linkage, gaps, and next steps only. Its
current public artifact does not expose membership counts or configured topic
keys, so the adapter does not fabricate them and drops invite URLs.

`limit-raises.json` is now correctly classified as historical change evidence.
It can drive attention and audit rows, but it is not current limit coverage and
cannot satisfy max stake, gross payout, or net win execution checks. Those still
require a fresh Tennis/provider capability observation.

Maximum stake, gross payout, net win, and reservable liquidity are independent
checks. Each critical ceiling is explicitly `known`, `not_applicable`, or
`unknown`; missing evidence yields `manual_review`, never “unlimited.” Scoped
facts override global facts, equal-specificity ambiguity is rejected, and
cross-currency comparison is forbidden. The caller supplies projected payout and
win as integer `MoneyAmount` values from its price boundary.

The contract and pure evaluator are implemented, but provider probing,
onboarding integration, execution reservation, accounting posting, and Telegram
delivery remain with their owning adapters and services.

## State and failure behavior

- Missing optional adapters never erase a partner profile.
- Each connector reports `ok`, `stale`, or `unavailable` with its own timestamp.
- A stale connector snapshot is visible at page and partner level.
- The target dashboard bake fails when required canonical facts are invalid or
  the artifact cannot satisfy its schema. The redacted coverage artifact may be
  structurally empty during proposal work, but implementation readiness fails
  until every required CODE is covered. Optional adapter failures produce
  attention rows.
- No plaintext credentials, raw provider account output, tokens, or secret vault
  values enter the artifact.
- Lifecycle facts retain field-level provenance. Connector snapshots provide
  dataset-level status for the other planned sources; accounting, Telegram,
  status, and capacity facts still need typed source evidence before the
  production bake. The UI does not infer absent fields.
- Money uses integer minor units with explicit currency and account scope; the
  read model never sums incompatible currencies or scopes.
- Root lifecycle remains the canonical eight-state model. Sports Terminal
  `frozen` projects to `suspended` while retaining `originalValue: "frozen"` in
  lifecycle provenance.
- Operational capacity snapshots and provider risk are not ledger entries.

## Connector resilience

These are target connector/bake policies. They are separate from the current
browser compatibility helper's five-second request timeout, which is owned by
`/portal/fetch-json.js`.

- Each connector times out after 3 seconds and opens its circuit after 3
  consecutive failures for 60 seconds.
- Data up to 300 seconds old is stale-but-acceptable and is rendered with a
  visible warning and source timestamp.
- Optional connectors use last-known-good data for at most 24 hours, then become
  `unavailable`; they never erase the canonical partner record.
- The required profile-coverage connector may use last-known-good data only
  inside the 300-second stale window. Beyond that, the dashboard bake fails
  rather than inventing identity coverage. It has no lifecycle or policy
  authority.
- One successful probe closes the circuit. The target requires every fallback to
  appear in connector snapshots, affected fact evidence, and deterministic
  attention rows. The implemented artifact currently enforces only lifecycle
  provenance; the shared resilience evaluator remains a required slice.

## First implementation slices

The private `packages/partners` workspace now owns the target package identity,
TOML-facing plan types, unresolved semantic-gap map, canonical identifier
parsers, ingress-only out translation, the v1 artifact boundary, and the pure
artifact assembler over already reconciled records. It performs no I/O, does not
yet join adapters or apply source precedence, and emits no production artifact
by itself. A selective `partners-ops.v2` compatibility adapter now keeps the
four current partner/out identities available as narrow observations while
deliberately dropping credentials, payment targets, Telegram IDs, money, limits,
colors, and other non-authoritative facts. It does not manufacture canonical
dashboard records, lifecycle facts, active outs, or resolved Sportsbook IDs. A
browser-neutral package contract now owns the current input inventory, canonical
artifact path, and query-only legacy comparison policy; the browser loader
itself remains planned. The current compatibility board now delegates its
unchanged 7+1 JSON calls to the shared `/portal/fetch-json.js` transport for its
five-second timeout, explicit JSON `Accept`, same-origin credentials, advisory
debug-gated MIME diagnostics, structured transport results, and path-qualified
thrown errors at the board boundary. A profile-coverage adapter boundary and
redacted `partner-profile-coverage.json` readiness artifact now prove only
`PartnerCode`, call sign, and source profile document revision; lifecycle,
phase, credentials, funding, Telegram, accounting, money, and policy are
structurally excluded. Coverage feeds future assembly/reconciliation but is not
the `profiles` connector snapshot. The planned private canonical-profile
connector must supply identity, lifecycle, and policy facts. The remaining
slices are:

1. Materialize redacted coverage for the four known CODEs; emit attention for
   legacy records without coverage.
2. Define a defensible lifecycle source with effective-time provenance; do not
   infer it from profile coverage.
3. Add accounting and Telegram adapter summaries.
4. Implement reconciliation/source precedence over typed adapter results.
5. Point the board at the new artifact; retain old fetches behind a temporary
   debug flag for comparison tests.
6. Split the current inline board controller into small browser modules and use
   shared `lib/portal/ui-html` builders.

## Acceptance criteria

- All four current partners appear even when optional adapters are unavailable.
- The redacted coverage artifact contains all four current CODEs. It may remain
  structurally empty while the plan is a proposal, but the readiness gate fails
  with the exact missing CODEs.
- Every canonical dashboard record has defensible lifecycle/profile provenance.
  A migration reason may preserve legacy runtime visibility, but it never waives
  the four-CODE implementation-readiness gate.
- Every row has CODE, lifecycle provenance, an explainable derived phase, out
  readiness, scoped balances, Telegram handshake readiness, and deterministic
  attention actions.
- No new core/read-model field is named bare `partnerId`; external identifiers
  are qualified by their source system.
- All money values are safe integer minor units with currency, and all balances
  carry a structured account scope.
- Every lifecycle state has queryable source, original state, adapter,
  confidence, and effective-time provenance.
- Legacy out translation happens only in `IngressTranslator` and passes the
  result through the canonical parser. Once an authenticated caller is wired,
  that caller emits the translator-provided warning and telemetry counter.
- Connector timeout, stale, last-known-good, and circuit-breaker behavior
  matches the TOML plan and is covered by adapter/reconciliation tests.
- Pre-commit rejects new floating-point financial SQL storage.
- Browser code fetches one partner-domain artifact for primary rendering.
- No DOM module imports SQLite, Telegram transport, vault, or profile TOML code.
- Existing hash routes remain valid.
- `partner-profile-coverage.json` contains all four current partner CODEs before
  the plan becomes implementation-ready. Migration reasons may explain legacy
  visibility but cannot replace coverage. The legacy full-profile artifact is
  not a canonical dashboard input.
- Focused gates pass: profile/schema, read-model, board, portal route, concept,
  surface, ledger, import graph, workspace validation, and type-check.
- The full local `bun run bun:ci` is required before merge.

## Validation commands

```bash
bun run validate:workspaces -- --verbose
bun test tests/partner-profile-schema.test.ts tests/partner-ledger.test.ts
bun test tests/partners-board.test.ts tests/partners-portal.test.ts
bun run partners:governance
bun run partner:dashboard-plan:validate
bun run partner:dashboard-plan:validate -- --unregistered
bun run partner-profile:coverage:bake:check
bun --cwd=packages/partners run build
bun run lint:money-sql:staged
bun run validate:surface-coverage
bun run check:import-graph
bun run type-check:ci
bun run bun:ci
```
