# Partner type and reference map

Status: proposed canonical map (2026-08-05)

This map is the type-level companion to the partner consolidation review and
dashboard MVP. It names the current definitions, scores their fitness, assigns
an owner, and states the compatibility rule. It is a decision artifact, not a
new runtime schema.

## Target identity graph

```text
PartnerCode (SPEN) ───────────── canonical business identity
  ├─ PartnerCallSign (SPEN-001) derived operator alias
  ├─ TreeNodeId                 operations-owned identity reference
  ├─ PartnerProfileKey          operations binding key (compatibility only)
  ├─ ExternalPartnerRef[]       adapter-local IDs; never canonical aliases
  └─ OutId[] (out-SPEN-1)       partner-owned bookmaker account identities
       ├─ SportsbookId          bookmakers-owned registry reference
       ├─ VaultKey              security-owned secret pointer
       ├─ RailId                treasury-owned funding reference
       └─ ExternalAccountRef[]  provider/account IDs at adapter boundaries
```

The canonical join key is `PartnerCode`. `partnerId` is not accepted as an
unqualified core field because it currently means at least four different
things: partner CODE, operations tree node, Kalshi registry row, and a remote
provider's partner identifier.

## Decision vocabulary

| Decision      | Meaning                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| Keep          | Semantics and representation are suitable for the canonical core.        |
| Adapt         | Preserve the useful information but translate at a named boundary.       |
| Compatibility | Keep temporarily for existing callers; do not use in new core contracts. |
| Retire        | Remove after consumers use the canonical replacement.                    |

Fitness is scored from 1 (unsafe or ambiguous) to 5 (ready to reuse).

## Identifier map

| Concept                   | Current references                                                                                                                         | Current shape / examples                                          | Fitness | Decision         | Target owner and type                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------: | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Partner business identity | `lib/partner-profile/schema.ts` `identity.code`; `lib/telegram/handshake-ref.ts`; `PartnersOpsPartner.code`; Kalshi TOML `partners[].code` | Repeated plain strings with `^[A-Z]{3,6}$`                        |       4 | Keep + brand     | Partners core: `PartnerCode`; normalize trim/uppercase only at ingress, validate once.                                                             |
| Base operator alias       | profile `identity.callSign`; handshake; seat intake                                                                                        | `CODE-NNN`, such as `SPEN-001`                                    |       4 | Keep + brand     | Partners core: `PartnerCallSign`; derive its `PartnerCode`, never use it as the business PK.                                                       |
| Nested seat alias         | `HANDSHAKE_CALL_SIGN_RE`; partners-ops local regex                                                                                         | `CODE-NNN-SUBNN[-SUBNN]`                                          |       3 | Adapt            | Operations: `SeatCallSign`; map to a base `PartnerCode` and preserve the full seat ref as provenance. Do not widen `PartnerCallSign`.              |
| Operations node           | `lib/types/branded/operations.ts` `TreeNodeId`; profile `treeNodeId`; bridge                                                               | Opaque branded string                                             |       5 | Keep reference   | Operations owns `TreeNodeId`; partner profile may carry an optional reference.                                                                     |
| Profile binding           | operations bridge `PartnerProfileKey`                                                                                                      | `pp-${treeNodeId}`                                                |       4 | Compatibility    | Operations owns the binding key. It must not become the dashboard or partner identity.                                                             |
| Template                  | `PartnerTemplateId` in branded operations types and profile meta                                                                           | Slug-like branded string                                          |       5 | Keep reference   | Operations/config owns `PartnerTemplateId`; partners validates the reference.                                                                      |
| Partner account/out       | `OutId` brand and seat intake use `SPEN-1`; partners-ops, Tennis, and Kalshi use `out-SPEN-1`                                              | Two incompatible spellings                                        |       2 | Adapt + converge | Partners core: `OutId = out-{PartnerCode}-{positive integer}`. Accept `CODE-N` only in a legacy parser and emit the prefixed form.                 |
| Sportsbook/book           | profile map key; `PartnersOpsBook.id` (`book-*`); Sports Terminal `book_id`; Kalshi `provider`; branded `SportsbookId`                     | Slugs, URLs, labels, provider IDs, and prefixed IDs are conflated |       2 | Adapt            | Bookmakers owns `SportsbookId` and aliases. Partner `Out` references it. Provider/skin remain execution-adapter fields, not book identity.         |
| External partner          | Sports Terminal `partner_id`; Kalshi `PartnerEntity.id`; Pandora remote `partnerId`                                                        | Arbitrary local or remote string                                  |       1 | Isolate          | Adapter-owned `ExternalPartnerRef { sourceSystemId, externalId }`; resolution table maps it to `PartnerCode`. Never expose it as bare `partnerId`. |
| External account          | Kalshi `betting_accounts.id`; provider customer/agent IDs                                                                                  | Local out-like IDs plus remote identifiers                        |       2 | Isolate          | Adapter-owned `ExternalAccountRef { sourceSystemId, externalId }`, attached to a canonical `OutId`.                                                |
| Telegram user             | `lib/types/branded/portal.ts` `TelegramUserId`                                                                                             | Branded user identity                                             |       5 | Keep reference   | Portal/Telegram owns it; not interchangeable with a group chat.                                                                                    |
| Telegram chat/topic       | profile and Telegram modules use `string` chat IDs and numeric thread IDs                                                                  | `-100…` chat ID; positive topic/thread integer                    |       3 | Adapt            | Telegram owns `TelegramChatId` and `TelegramTopicId`; the partners communication port returns typed references and readiness facts.                |
| Ledger entry              | root and Kalshi ledger `id: string`                                                                                                        | UUIDv7 in root; random timestamp token in Kalshi                  |       3 | Adapt            | Accounting owns `LedgerEntryId`; canonical adapter requires stable, idempotent IDs.                                                                |
| Funding rail              | branded `RailId`; profile/ops use labels and derived `rail-*` strings                                                                      | Identity and display labels mixed                                 |       3 | Adapt            | Treasury/accounting owns `RailId`; UI label is separate.                                                                                           |

### Identifier decisions now fixed for the MVP

1. `PartnerCode` is the only unqualified partner key.
2. Canonical `OutId` is `out-{CODE}-{n}` because both current public artifacts
   already publish that form. `CODE-N` is a legacy ingress alias.
3. `SportsbookId` is the bookmaker registry slug. `book-{slug}`, URLs, provider
   IDs, and skin names must pass through bookmaker/provider adapters.
4. Every generic or remote `partnerId` becomes an `ExternalPartnerRef` until a
   resolver proves which `PartnerCode` it belongs to.
5. Brands are serialized as strings in JSON. They are reconstructed only at a
   validated TypeScript boundary.

## Translation decision matrix

`IngressTranslator` is an implemented pure compatibility service intended to run
before the core parser. HTTP/BFF, CLI, and artifact-adapter callers remain
unwired.

| Incoming source / field      | Example          | Canonical result                                              | Translation rule                                                           | Failure behavior                                | Retirement                                                        |
| ---------------------------- | ---------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Profile or handshake `code`  | `SPEN`           | `PartnerCode("SPEN")`                                         | Trim, uppercase, validate `PartnerCode`; no alias lookup                   | Reject invalid CODE                             | Permanent boundary normalization                                  |
| Base call-sign               | `SPEN-001`       | `PartnerCallSign` + `PartnerCode("SPEN")`                     | Validate base grammar and derive CODE                                      | Reject mismatched/invalid call-sign             | Permanent derived alias                                           |
| Nested operations seat       | `SPEN-001-SUB02` | `SeatCallSign` + `PartnerCode("SPEN")`                        | Operations parser preserves full seat path and derives CODE                | Reject depth/grammar drift                      | Permanent operations reference                                    |
| Legacy seat out              | `SPEN-1`         | `OutId("out-SPEN-1")`                                         | Implemented `IngressTranslator.translateOutId`, then `parseCanonicalOutId` | Reject; never guess sequence                    | Remove after zero translations for 30 days and producer migration |
| partners-ops/Tennis out      | `out-SPEN-1`     | same `OutId`                                                  | Canonical parse only                                                       | Reject invalid canonical ID                     | No translation                                                    |
| Sports Terminal `partner_id` | `partner-42`     | `ExternalPartnerRef` plus resolved `PartnerCode`              | Require an explicit source-qualified resolution row                        | Quarantine unresolved record and emit attention | Adapter remains; duplicate profile authority retires              |
| Kalshi `partners[].code`     | `SPEN`           | `PartnerCode("SPEN")`                                         | Validate CODE                                                              | Reject invalid CODE                             | Permanent adapter boundary                                        |
| Kalshi registry `id`         | `partner-spen`   | `ExternalPartnerRef { sourceSystemId: "kalshi", externalId }` | Preserve as a source-qualified identity reference; join through TOML CODE  | Quarantine if CODE association is missing       | Never promote external ID                                         |
| Pandora wire `partnerId`     | `118`            | provider-scoped `ExternalPartnerRef`                          | Preserve only; resolution requires an explicit adapter mapping             | Do not infer from numeric ID                    | Never promote remote ID                                           |
| Sports lifecycle             | `frozen`         | `suspended` lifecycle fact                                    | Declared state map with mandatory provenance                               | Reject unknown state or quarantine record       | Mapping remains while source emits `frozen`                       |

Every successful non-identity translation returns metadata for
`partner_ingress_translation_total` plus its warning code. Future callers must
increment that counter with mapping and caller labels. The dashboard exposes
aggregate compatibility use, never raw external identifiers as primary keys.

## Domain type map

| Domain concept    | Best current reference                                                                  | Weak or conflicting references                                                                                             | Fitness | MVP decision                                                                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical profile | `lib/partner-profile/schema.ts` `PartnerProfile`                                        | Sports Terminal `PartnerProfile`; operations `MaterializedPartnerProfile`; partners-ops projection                         |       4 | Keep root shape as the migration source, then move it to partners core. Rename the operations projection to `PartnerProfileBindingView` during migration.                                                                                            |
| Lifecycle         | root eight-state `PartnerLifecycleStatus`                                               | Sports Terminal adds `frozen`; Kalshi has only boolean `active`                                                            |       4 | Canonicalize as `PartnerLifecycleState`; keep the eight root values. Adapt Sports `frozen` to `suspended` with structured provenance; do not add an ungoverned ninth state.                                                                          |
| Operator phase    | root `PartnerPhase` + pure `derivePhase`                                                | partners-ops duplicates phase; Sports treats state as display status                                                       |       5 | Rename the target to `PartnerOperationalPhase`, store lifecycle, and derive phase. It is an operator summary, never competing lifecycle truth.                                                                                                       |
| Book class        | root and partners-ops six-value `BookType`                                              | Sports `SourceType`; Kalshi `ProviderId`                                                                                   |       3 | Keep `BookType` as bookmaker classification. `SourceType` and `ProviderId` are adapter capabilities, not replacements.                                                                                                                               |
| Out status        | partners-ops `OutStatusKey`; seat `SeatFundStatus`; Kalshi account status               | Overlapping sets with different meanings                                                                                   |       2 | Split `OutOperationalStatus` (`unknown`, `ready`, `deferred`, `paused`, `blocked`), `OutFundingStatus` (`unknown`, `unfunded`, `partial`, `funded`), and `ProviderConnectionStatus` (`unknown`, `active`, `inactive`, `pending`). Do not merge them. |
| SOR/risk policy   | root profile `rules.sor`; Sports `ProfileSORGate` and ordered `PartnerGateway.evaluate` | operations bridge has a second snake_case template                                                                         |       4 | Keep root policy ownership; adapt the Sports ordered gate evaluator after money/book IDs are typed. Retire duplicate schema.                                                                                                                         |
| Cultivation       | root profile and Sports schemas                                                         | Mixed percentages and free-form numbers                                                                                    |       3 | Keep fields, normalize percentage representation before implementation.                                                                                                                                                                              |
| Commercial terms  | root settlement config                                                                  | Sports settlement combines terms with mutable balances                                                                     |       3 | Profile owns agreement terms; accounting owns balances, payouts, and posted settlements.                                                                                                                                                             |
| Money             | Tennis integer `*Cents` parsing is the safest current wire practice                     | Root/Kalshi SQLite `REAL`; Sports arbitrary `number`; dashboard sums a bare number                                         |       2 | Use `MoneyAmount { currency, minorUnits }`; require safe integers in JSON and SQLite `INTEGER`. Never sum unlike currency or scope.                                                                                                                  |
| Account scope     | root ledger free-form `accountScope`                                                    | Kalshi `outId`/provider fields; profile `bookKey`                                                                          |       2 | Use a discriminated `AccountScope` union keyed by `PartnerCode`, `OutId`, or `RailId`; parse legacy strings in accounting adapter.                                                                                                                   |
| Ledger            | root ledger has idempotency, proof, external refs, and balance-after                    | Non-transactional read/insert, `REAL`, mixed scope/currency; Kalshi ledger mixes capacity snapshots with financial entries |       3 | Preserve root audit fields, but move financial posting behind an accounting port and separate operational observations from financial entries.                                                                                                       |
| Communication     | Telegram handshake/package-group metadata                                               | Profile embeds chat/topic numbers; Sports embeds desired groups and bot env key                                            |       4 | Telegram is sole transport authority. Profile may declare desired topic policy; dashboard consumes readiness projection only.                                                                                                                        |
| Capacity          | Tennis contract uses integer cents, live/offline provenance, last-good bake             | partners-ops parses formatted max-bet strings; Kalshi sums out×skin capacity; Sports uses mutable floats                   |       4 | Prefer fresh Tennis/execution adapter facts. Keep registered-out count, active-out count, and executable capacity separate.                                                                                                                          |
| Dashboard record  | Tennis contract is the cleanest small adapter artifact                                  | 2,586-line portal joins eight sources; Kalshi and Sports duplicate view types                                              |       2 | Build one versioned partner read model with field provenance and explicit conflicts.                                                                                                                                                                 |

## Best parts, ranked

| Rank | Component                                         | Why it is strong                                                                                    | Reuse rule                                                                                          |
| ---: | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
|    1 | Root profile parser/schema/bake                   | Approved CODE key, lifecycle, vault-only references, Bun TOML boundary, static artifact             | Extract into partners core with stronger brands and money/percentage types.                         |
|    2 | Tennis partner contract bake                      | Strict wire parsing, integer cents, explicit live/offline/empty provenance, atomic last-good output | Use as the adapter and artifact reliability pattern.                                                |
|    3 | Sports `PartnerGateway`                           | Clear, ordered eligibility gates and useful list/detail/tab information architecture                | Reuse evaluator behavior and UI concepts only after replacing its duplicate schema and float money. |
|    4 | Root partner ledger audit fields                  | External references, idempotency indexes, proof, batch, scope, balance-after                        | Preserve fields in accounting adapter; replace storage and transaction semantics.                   |
|    5 | Portal route/table helpers and board pure helpers | Route parsing and table metadata are already separated from the giant HTML controller               | Keep as portal-owned consumers of the new read model.                                               |
|    6 | Kalshi out×skin model                             | Correctly distinguishes one credentialed out from several execution skins and concentration by out  | Keep in the execution adapter; publish summarized capacity, not provider secrets or raw meta.       |

## Worst parts and retirement priority

| Priority | Problem                                           | Evidence                                                                             | Why it is dangerous                                                                        | Resolution                                                                                                                |
| -------: | ------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
|        1 | Ambiguous `partnerId`                             | Sports, Kalshi registry, Pandora wire, UI request types                              | Cross-system IDs can join to the wrong financial entity without a type error.              | Ban bare `partnerId` in new core/read-model contracts; use `PartnerCode` or qualified external refs.                      |
|        2 | Multiple money meanings in `number`/SQLite `REAL` | Both ledgers, Sports runtime, profile settlement/cultivation                         | Rounding, unit, currency, and scope errors can silently alter balances and capacity.       | Integer minor units, explicit currency/scope, transactional posting.                                                      |
|        3 | Dual accounting authority                         | Profile `accounting.ledger`, SQLite ledger, partners-ops events, Kalshi mixed ledger | A dashboard can show whichever copy was baked last rather than accounting truth.           | Profile holds configuration only; accounting adapter owns entries/balances; operational observations use a separate type. |
|        4 | Out ID dual grammar                               | `CODE-N` vs `out-CODE-N`                                                             | Breaks joins across profile, Tennis, registry, and execution data.                         | Canonical prefixed ID plus a tested legacy parser.                                                                        |
|        5 | Monolithic projection and browser joins           | `partner-ops-registry.ts`; current partners page                                     | Domain authority, parsing, persistence, and presentation are inseparable and hard to test. | Pure read-model builder plus narrow adapters and one dashboard artifact.                                                  |
|        6 | Duplicate profile/lifecycle schemas               | root, operations bridge, Sports, Kalshi                                              | New fields and states drift immediately (`frozen` already did).                            | Compatibility exports, then delete duplicate authorities after consumer migration.                                        |
|        7 | Percentage ambiguity                              | `holdTargetPct`, commission/free-roll/cultivation fields                             | A value of `0.5` can mean 0.5% or 50%.                                                     | Core uses `Ratio` in `[0,1]`; UI/TOML adapters explicitly parse/display percent units.                                    |
|        8 | Telegram/accounting coupling                      | partners-ops and proposed notification branch paths                                  | Transport availability can mutate or redefine financial truth.                             | Telegram consumes accounting events/summaries; it never posts ledger entries implicitly.                                  |

## Target MVP TypeScript contract

These are semantic target types. Exact constructor placement belongs in the
first package slice.

```ts
type PartnerCode = Brand<string, 'PartnerCode'>; // ^[A-Z]{3,6}$
type PartnerCallSign = Brand<string, 'PartnerCallSign'>; // CODE-NNN only
type SeatCallSign = Brand<string, 'SeatCallSign'>; // CODE-NNN[-SUBNN]{0,2}
type OutId = Brand<string, 'OutId'>; // out-{CODE}-{positive integer}
type CurrencyCode = Brand<string, 'CurrencyCode'>; // ISO 4217 uppercase

type MoneyAmount = {
  currency: CurrencyCode;
  minorUnits: number; // JSON-safe integer; SQLite INTEGER
};

type ExternalPartnerRef = {
  sourceSystemId:
    | 'operations'
    | 'sports-terminal'
    | 'kalshi'
    | 'tennis'
    | string;
  externalId: string;
};

type ExternalAccountRef = {
  sourceSystemId: string;
  externalId: string;
};

type AccountScope =
  | { kind: 'partner'; partnerCode: PartnerCode }
  | { kind: 'out'; outId: OutId }
  | { kind: 'rail'; railId: RailId };

type SourceFact<T> = {
  value: T;
  effectiveAt: string;
  provenance: FactProvenance;
};

type LifecycleStateFact = {
  state: PartnerLifecycleState;
  effectiveAt: string;
  provenance: FactProvenance;
};

type FactProvenance = {
  sourceSystemId: string;
  sourceRecordRef?: string;
  adapterId: string;
  adapterVersion: string;
  observedAt: string;
  originalValue?: string; // required by LifecycleStateFact
  mappingMethod: 'identity' | 'declared' | 'derived' | 'heuristic';
  confidence: 'exact' | 'approximate' | 'unknown';
};

type PartnerOut = {
  outId: OutId;
  partnerCode: PartnerCode;
  sportsbookId: SportsbookId;
  operationalStatus: OutOperationalStatus;
  fundingStatus: OutFundingStatus;
  providerConnectionStatus?: ProviderConnectionStatus;
  externalAccountRefs: ExternalAccountRef[];
  vaultKey?: string; // reference only; omitted from public artifact
};
```

The public dashboard record serializes brands as validated strings, omits
`vaultKey`, and uses `SourceFact`/conflict records where authority can differ.
It does not serialize profile ledger history, raw provider metadata,
credentials, Telegram tokens, or remote payloads.

## Source-to-target adapter map

| Source                            | Parser boundary                              | Emits                                                             | May not own                                               |
| --------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| `config/partner-profiles/*.toml`  | partners config adapter via `Bun.TOML.parse` | identity, lifecycle, policy, agreement, desired account refs      | balances, Telegram membership, live capacity              |
| `partner-profile-coverage.json`   | `profile-coverage-artifact` adapter           | CODE, call sign, source profile document revision, observed time   | lifecycle, phase, credentials, policy, money, account data |
| legacy `partner-profiles.json`    | current portal compatibility only             | no new canonical authority                                        | canonical dashboard facts or public expansion              |
| `partners-ops.v2`                 | `legacy-ops` compatibility adapter           | temporary CODE/out/status/accounting observations with provenance | canonical lifecycle, partner identity, final money totals |
| SQLite/accounting feed            | accounting adapter                           | typed entries, scoped balances, proofs, freshness                 | profile policy or Telegram delivery                       |
| Telegram handshake/forum metadata | Telegram adapter                             | chat linkage, membership/topic readiness, action links            | lifecycle or accounting mutation                          |
| bookmakers registry               | bookmakers adapter                           | canonical `SportsbookId`, aliases, display metadata               | partner account status                                    |
| limits artifacts                  | limits adapter                               | out/book coverage and observed limits                             | bookmaker or partner identity                             |
| Tennis contract                   | Tennis adapter                               | active outs, per-bet capacity, source/freshness                   | canonical profile identity                                |
| Sports Terminal                   | Sports compatibility adapter                 | external state, gate observations, integration health             | a second profile store or lifecycle enum                  |
| Kalshi partner registry           | execution adapter                            | provider/out/skin capacity and qualified external refs            | canonical partner IDs, money ledger truth                 |

## MVP changes caused by this map

- Add `legacy-ops` as an explicit eighth adapter; it is a temporary source, not
  an unnamed fallback.
- Change artifact totals and ledger fields from bare numbers to `MoneyAmount`.
- Model `AccountScope` and recent entries structurally instead of exposing the
  ledger's colon-delimited scope strings.
- Rename dashboard `books[].accountId` to `outs[].outId` and reference
  `sportsbookId` separately.
- Include `externalPartnerRefs` and `externalAccountRefs` only in partner
  detail/debug identity data, not as provenance, join keys, or primary labels.
- Preserve Sports `frozen` as external provenance while projecting canonical
  `suspended`.
- Require lifecycle provenance on canonical and translated states; it is data,
  not a comment or optional debug field.
- Report profile coverage, registered outs, active outs, and executable capacity
  as separate measures.
- Treat the current four CODEs as the minimum migration coverage set; an empty
  canonical profile bake fails.

## Remaining decisions before implementation

Only two semantic choices remain open, and neither blocks the read-only MVP:

1. Whether `CurrencyCode` and Telegram chat/topic brands live in their owning
   domain packages immediately or enter the global brand catalog first.
2. Whether operational observations such as capacity snapshots need a shared
   event envelope in v1 or remain adapter summaries until the accounting split
   is complete.

The identity, out grammar, lifecycle mapping, money representation, source
authority, and adapter boundaries are sufficiently defined to implement the
first package/read-model slice.
