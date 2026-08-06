# Partner dashboard MVP

Status: implementation outline (2026-08-05)

The dashboard domain contract is supported by the separate
[Bun channel and type governance contract](./bun-channel-governance.md). The
partner plan references that toolchain SSOT; it does not own runtime versions,
release feeds, npm channels, or cron schedules.

## Authority map

| Artifact                            | Owns                                                                                                                  | Must not own                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `partner-dashboard-mvp.toml`        | MVP composition, connector/region bindings, ingress compatibility, resilience, theme references, and retirement gates | Runtime/type channel values or generated dashboard data          |
| `partner-dashboard-semantic-map.md` | Human-readable nomenclature and concept/surface interpretation                                                        | A second machine contract                                        |
| `partner-type-reference-map.md`     | Existing-to-canonical type/reference decisions and migration evidence                                                 | Dashboard layout or runtime policy                               |
| `config/bun-channels.toml`          | Bun/runtime/type/feed/schedule policy                                                                                 | Partner business semantics                                       |
| `partners-dashboard.json`           | No policy                                                                                                             | Derived read model only; safe to regenerate                      |
| `@factorywager/partners`            | Target owner for parsed domain types, ports, pure adapters, and projection code; currently the artifact-core slice    | Telegram transport, accounting storage, or theme token ownership |

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
    adapterIds: string[];
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
    profileSourceSystemId: string;
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
    sourceSystemId: string;
    sourceRecordRef?: string;
    adapterId: string;
    adapterVersion: string;
    observedAt: string;
    originalValue: string;
    mappingMethod: 'identity' | 'declared' | 'derived' | 'heuristic';
    confidence: 'exact' | 'approximate' | 'unknown';
  };
};

type ExternalPartnerRef = {
  sourceSystemId: string;
  externalId: string;
};

type ExternalAccountRef = {
  sourceSystemId: string;
  externalId: string;
};

type OutOperationalStatus =
  | 'unknown'
  | 'ready'
  | 'deferred'
  | 'paused'
  | 'blocked';
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
`out-{PartnerCode}-{n}`; the older `CODE-N` seat form is ingress-only.

Every lifecycle value carries the mandatory provenance block. A Sports Terminal
`frozen` value therefore serializes as a canonical `suspended` state while
remaining queryable as `originalValue: "frozen"`, adapter ID `sports-terminal`,
adapter version `2`, mapping method `declared`, and confidence `exact`.
Canonical profile values use their profile adapter as the source and an
`identity` mapping method.

All untrusted files, network responses, database rows, and environment values
are parsed by their owning adapters. The read-model builder receives typed
adapter results. The dashboard receives one trusted JSON artifact.

Source precedence is field-specific:

- identity and policy: canonical profile;
- live capacity: fresh Tennis/Sports adapter, with a labeled legacy fallback;
- communication: Telegram adapter only;
- finance: accounting adapter only;
- disagreements: explicit `conflicts` rows, never silent latest-value wins.

Registered outs and active live-capacity outs are distinct metrics. Current
artifacts report 10 registered ops outs and 5 active Tennis outs.

`legacyOps` is an explicit compatibility adapter, not an invisible fallback. It
may keep a current partner visible while profiles are materialized, but every
such record emits a profile-coverage attention item. Bare external `partnerId`
values are retained only as source-qualified external identity references; they
are not provenance or join keys.

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

| Section        | Required source                 | MVP content                                                                        | Deferred                             |
| -------------- | ------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| Summary        | read model                      | partners, ready, attention, accounts, balance                                      | forecasts and trends                 |
| Roster         | profile + adapters              | CODE, lifecycle/phase, out readiness, coverage, funding status, Telegram readiness | custom columns                       |
| Partner detail | profile                         | lineage, template, jurisdiction summary, lifecycle                                 | profile editing                      |
| Accounts       | profile + bookmakers + limits   | book, status, max bet, funding method label, coverage                              | live credentials/balances            |
| Accounting     | accounting adapter              | scoped balances, recent ledger rows, proof links                                   | payment execution and reconciliation |
| Communication  | Telegram adapter                | linked, handshake, members, configured topics                                      | sending messages from Pages          |
| Attention      | all adapters                    | deterministic action rows with deep links/CLI hints                                | automated remediation                |
| Integrations   | Tennis/Sports Terminal adapters | availability and freshness only                                                    | embedding product dashboards         |

## State and failure behavior

- Missing optional adapters never erase a partner profile.
- Each connector reports `ok`, `stale`, or `unavailable` with its own timestamp.
- A stale connector snapshot is visible at page and partner level.
- The bake fails only when the canonical profile is invalid or the artifact
  cannot satisfy its schema. Optional adapter failures produce attention rows.
- No plaintext credentials, raw provider account output, tokens, or secret vault
  values enter the artifact.
- Profile, accounting, and Telegram facts retain provenance; the UI does not
  infer absent production fields.
- Money uses integer minor units with explicit currency and account scope; the
  read model never sums incompatible currencies or scopes.
- Root lifecycle remains the canonical eight-state model. Sports Terminal
  `frozen` projects to `suspended` while retaining `originalValue: "frozen"` in
  lifecycle provenance.
- Operational capacity snapshots and provider risk are not ledger entries.

## Connector resilience

- Each connector times out after 3 seconds and opens its circuit after 3
  consecutive failures for 60 seconds.
- Data up to 300 seconds old is stale-but-acceptable and is rendered with a
  visible warning and source timestamp.
- Optional connectors use last-known-good data for at most 24 hours, then become
  `unavailable`; they never erase the canonical partner record.
- The required profile connector may use last-known-good data only inside the
  300-second stale window. Beyond that, the bake fails rather than inventing
  identity or policy.
- One successful probe closes the circuit. Every fallback is represented in
  `connectorSnapshots`, partner-level provenance, and deterministic attention
  rows.

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
itself remains planned. The remaining slices are:

1. Join a redacted `partner-profiles.json`; emit attention for legacy records
   without a real profile.
2. Add a minimum profile-coverage gate for the four known CODEs.
3. Add accounting and Telegram adapter summaries.
4. Implement reconciliation/source precedence over typed adapter results.
5. Point the board at the new artifact; retain old fetches behind a temporary
   debug flag for comparison tests.
6. Split the current inline board controller into small browser modules and use
   shared `lib/portal/ui-html` builders.

## Acceptance criteria

- All four current partners appear even when optional adapters are unavailable.
- All four current CODEs either have a canonical profile or a visible,
  machine-readable migration reason; an empty profile bake fails.
- Every row has CODE, lifecycle/phase provenance, out readiness, scoped
  balances, Telegram handshake readiness, and deterministic attention actions.
- No new core/read-model field is named bare `partnerId`; external identifiers
  are qualified by their source system.
- All money values are safe integer minor units with currency, and all balances
  carry a structured account scope.
- Every lifecycle state has queryable source, original state, adapter,
  confidence, and effective-time provenance.
- Legacy out translation happens only in `IngressTranslator`, emits telemetry,
  and passes the result through the canonical parser.
- Connector timeout, stale, last-known-good, and circuit-breaker behavior
  matches the TOML plan and is covered by adapter/reconciliation tests.
- Pre-commit rejects new floating-point financial SQL storage.
- Browser code fetches one partner-domain artifact for primary rendering.
- No DOM module imports SQLite, Telegram transport, vault, or profile TOML code.
- Existing hash routes remain valid.
- `partner-profiles.json` no longer reports zero profiles for active partners,
  unless each legacy-only record has an explicit migration reason.
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
bun --cwd=packages/partners run build
bun run lint:money-sql:staged
bun run validate:surface-coverage
bun run check:import-graph
bun run type-check:ci
bun run bun:ci
```
