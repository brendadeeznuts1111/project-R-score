# Partner type and reference map

<!-- REF:ID 0.1.partner-type-reference-map -->
<a id="0.1.partner-type-reference-map"></a>

Status: proposed canonical map (2026-08-06)

**Surfaces (repo / path / href / taxonomy machines):** see
[partner-surface-inventory.md](./partner-surface-inventory.md) ·
[`lib/docs/partner-surface-inventory.ts`](../../lib/docs/partner-surface-inventory.ts)
· `/registry/partner-surface-inventory.json`. This type map owns the identity
graph; the surface inventory joins boards, brands, wire traps, and docs.

This map is the type-level companion to the
[partner consolidation review](./partner-code-consolidation.md),
[dashboard MVP](./partner-dashboard-mvp.md), and machine-readable
[MVP plan](./partner-dashboard-mvp.toml). It names the current definitions,
scores their fitness, assigns an owner, and states the compatibility rule. It is
a decision artifact, not a new runtime schema.

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
| Partner business identity | `lib/partner-profile/schema.ts` `identity.code`; `lib/telegram/handshake-ref.ts`; `PartnersOpsPartner.code`; Kalshi TOML `partners[].code` | Repeated plain strings with `^[A-Z]{3,6}$`                        |       4 | Keep + brand     | Partners core: exact `PartnerCode` parser; caller-side trim/uppercase normalization is planned only for explicitly named ingress adapters.         |
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

| Incoming source / field      | Example          | Canonical result                                              | Translation rule                                                                                                         | Failure behavior                                | Retirement                                                                                |
| ---------------------------- | ---------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Profile or handshake `code`  | `SPEN`           | `PartnerCode("SPEN")`                                         | Current core parser validates the exact canonical string; any trim/uppercase step must be owned by a future named caller | Reject invalid CODE                             | Permanent canonical validation; normalization remains planned at named ingress boundaries |
| Base call-sign               | `SPEN-001`       | `PartnerCallSign` + `PartnerCode("SPEN")`                     | Validate base grammar and derive CODE                                                                                    | Reject mismatched/invalid call-sign             | Permanent derived alias                                                                   |
| Nested operations seat       | `SPEN-001-SUB02` | `SeatCallSign` + `PartnerCode("SPEN")`                        | Operations parser preserves full seat path and derives CODE                                                              | Reject depth/grammar drift                      | Permanent operations reference                                                            |
| Legacy seat out              | `SPEN-1`         | `OutId("out-SPEN-1")`                                         | Implemented `IngressTranslator.translateOutId`, then `parseCanonicalOutId`                                               | Reject; never guess sequence                    | Remove after zero translations for 30 days and producer migration                         |
| partners-ops/Tennis out      | `out-SPEN-1`     | same `OutId`                                                  | Canonical parse only                                                                                                     | Reject invalid canonical ID                     | No translation                                                                            |
| Sports Terminal `partner_id` | `partner-42`     | `ExternalPartnerRef` plus resolved `PartnerCode`              | Require an explicit source-qualified resolution row                                                                      | Quarantine unresolved record and emit attention | Adapter remains; duplicate profile authority retires                                      |
| Kalshi `partners[].code`     | `SPEN`           | `PartnerCode("SPEN")`                                         | Validate CODE                                                                                                            | Reject invalid CODE                             | Permanent adapter boundary                                                                |
| Kalshi registry `id`         | `partner-spen`   | `ExternalPartnerRef { sourceSystemId: "kalshi", externalId }` | Preserve as a source-qualified identity reference; join through TOML CODE                                                | Quarantine if CODE association is missing       | Never promote external ID                                                                 |
| Pandora wire `partnerId`     | `118`            | provider-scoped `ExternalPartnerRef`                          | Preserve only; resolution requires an explicit adapter mapping                                                           | Do not infer from numeric ID                    | Never promote remote ID                                                                   |
| Sports lifecycle             | `frozen`         | `suspended` lifecycle fact                                    | Declared state map with mandatory provenance                                                                             | Reject unknown state or quarantine record       | Mapping remains while source emits `frozen`                                               |

Every successful non-identity translation returns metadata for
`partner_ingress_translation_total` plus its warning code. Future callers must
increment that counter with mapping and caller labels. The dashboard exposes
aggregate compatibility use, never raw external identifiers as primary keys.

## Domain type map

| Domain concept     | Best current reference                                                                  | Weak or conflicting references                                                                                             | Fitness | MVP decision                                                                                                                                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical profile  | `lib/partner-profile/schema.ts` `PartnerProfile`                                        | Sports Terminal `PartnerProfile`; operations `MaterializedPartnerProfile`; partners-ops projection                         |       4 | Keep root shape as the migration source, then move it to partners core. Rename the operations projection to `PartnerProfileBindingView` during migration.                                                                                            |
| Lifecycle          | root eight-state `PartnerLifecycleStatus`                                               | Sports Terminal adds `frozen`; Kalshi has only boolean `active`                                                            |       4 | Canonicalize as `PartnerLifecycleState`; keep the eight root values. Adapt Sports `frozen` to `suspended` with structured provenance; do not add an ungoverned ninth state.                                                                          |
| Operator phase     | root `PartnerPhase` + pure `derivePhase`                                                | partners-ops duplicates phase; Sports treats state as display status                                                       |       5 | Rename the target to `PartnerOperationalPhase`, store lifecycle, and derive phase. It is an operator summary, never competing lifecycle truth.                                                                                                       |
| Book class         | root and partners-ops six-value `BookType`                                              | Sports `SourceType`; Kalshi `ProviderId`                                                                                   |       3 | Keep `BookType` as bookmaker classification. `SourceType` and `ProviderId` are adapter capabilities, not replacements.                                                                                                                               |
| Out status         | partners-ops `OutStatusKey`; seat `SeatFundStatus`; Kalshi account status               | Overlapping sets with different meanings                                                                                   |       2 | Split `OutOperationalStatus` (`unknown`, `ready`, `deferred`, `paused`, `blocked`), `OutFundingStatus` (`unknown`, `unfunded`, `partial`, `funded`), and `ProviderConnectionStatus` (`unknown`, `active`, `inactive`, `pending`). Do not merge them. |
| SOR/risk policy    | root profile `rules.sor`; Sports `ProfileSORGate` and ordered `PartnerGateway.evaluate` | operations bridge has a second snake_case template                                                                         |       4 | Keep root policy ownership; adapt the Sports ordered gate evaluator after money/book IDs are typed. Retire duplicate schema.                                                                                                                         |
| Cultivation        | root profile and Sports schemas                                                         | Mixed percentages and free-form numbers                                                                                    |       3 | Keep fields, normalize percentage representation before implementation.                                                                                                                                                                              |
| Commercial terms   | root settlement config                                                                  | Sports settlement combines terms with mutable balances                                                                     |       3 | Profile owns agreement terms; accounting owns balances, payouts, and posted settlements.                                                                                                                                                             |
| Money              | Tennis integer `*Cents` parsing is the safest current wire practice                     | Root/Kalshi SQLite `REAL`; Sports arbitrary `number`; dashboard sums a bare number                                         |       2 | Use `MoneyAmount { currency, minorUnits }`; require safe integers in JSON and SQLite `INTEGER`. Never sum unlike currency or scope.                                                                                                                  |
| Account scope      | root ledger free-form `accountScope`                                                    | Kalshi `outId`/provider fields; profile `bookKey`                                                                          |       2 | Use a discriminated `AccountScope` union keyed by `PartnerCode`, `OutId`, or `RailId`; parse legacy strings in accounting adapter.                                                                                                                   |
| Ledger             | root ledger has idempotency, proof, external refs, and balance-after                    | Non-transactional read/insert, `REAL`, mixed scope/currency; Kalshi ledger mixes capacity snapshots with financial entries |       3 | Preserve root audit fields, but move financial posting behind an accounting port and separate operational observations from financial entries.                                                                                                       |
| Communication      | Telegram handshake/package-group metadata                                               | Profile embeds chat/topic numbers; Sports embeds desired groups and bot env key                                            |       4 | Telegram is sole transport authority. Profile may declare desired topic policy; dashboard consumes readiness projection only.                                                                                                                        |
| Capacity           | Tennis contract uses integer cents, live/offline provenance, last-good bake             | partners-ops parses formatted max-bet strings; Kalshi sums out×skin capacity; Sports uses mutable floats                   |       4 | Prefer fresh Tennis/execution adapter facts. Keep registered-out count, active-out count, and executable capacity separate.                                                                                                                          |
| Account capability | scrape-wire structures, bookmaker skins, Tennis cents, and execution gates              | URL heuristics, `maxBet`, “win max,” offers, promotions, and liquidity were conflated                                      |       2 | `PartnerOutCapabilitySnapshot` separates sportsbook resolution, bet structures, wager versus promotion catalogs, scoped stake/gross-payout/net-win facts, and access evidence. Unknown constraints require manual review.                            |
| Dashboard record   | Tennis contract is the cleanest small adapter artifact                                  | 2,586-line portal joins eight sources; Kalshi and Sports duplicate view types                                              |       2 | Build one versioned partner read model with field provenance and explicit conflicts.                                                                                                                                                                 |

## Best parts, ranked

| Rank | Component                                         | Why it is strong                                                                                    | Reuse rule                                                                                                                                         |
| ---: | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | Root profile parser/schema/private loader         | Approved CODE key, lifecycle, vault-only references, and Bun TOML boundary                          | Extract schema, parser, and `loadAllProfiles`; use the redacted coverage bake for readiness. Keep the public full-profile bake compatibility-only. |
|    2 | Tennis partner contract bake                      | Strict wire parsing, integer cents, explicit live/offline/empty provenance, atomic last-good output | Use as the adapter and artifact reliability pattern.                                                                                               |
|    3 | Sports `PartnerGateway`                           | Clear, ordered eligibility gates and useful list/detail/tab information architecture                | Reuse evaluator behavior and UI concepts only after replacing its duplicate schema and float money.                                                |
|    4 | Root partner ledger audit fields                  | External references, idempotency indexes, proof, batch, scope, balance-after                        | Preserve fields in accounting adapter; replace storage and transaction semantics.                                                                  |
|    5 | Portal route/table helpers and board pure helpers | Route parsing and table metadata are already separated from the giant HTML controller               | Keep as portal-owned consumers of the new read model.                                                                                              |
|    6 | Kalshi out×skin model                             | Correctly distinguishes one credentialed out from several execution skins and concentration by out  | Keep in the execution adapter; publish summarized capacity, not provider secrets or raw meta.                                                      |

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
type SourceSystemId = Brand<string, 'SourceSystemId'>;
type AdapterId = Brand<string, 'AdapterId'>;
type ExternalPartnerId = Brand<string, 'ExternalPartnerId'>;
type ExternalAccountId = Brand<string, 'ExternalAccountId'>;
type ProfileDocumentVersion = Brand<string, 'ProfileDocumentVersion'>;

type MoneyAmount = {
  currency: CurrencyCode;
  minorUnits: number; // JSON-safe integer; SQLite INTEGER
};

type ExternalPartnerRef = {
  sourceSystemId: SourceSystemId;
  externalId: ExternalPartnerId;
};

type ExternalAccountRef = {
  sourceSystemId: SourceSystemId;
  externalId: ExternalAccountId;
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
  provenance: FactProvenance & { originalValue: string };
};

type FactProvenance = {
  sourceSystemId: SourceSystemId;
  sourceRecordRef?: string;
  adapterId: AdapterId;
  adapterVersion: string;
  observedAt: string;
  originalValue?: string;
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

| Source                            | Parser boundary                                                                      | Emits                                                                                                                                     | May not own                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `config/partner-profiles/*.toml`  | partners config adapter via `Bun.TOML.parse`                                         | identity, lifecycle, policy, agreement, desired account refs                                                                              | balances, Telegram membership, live capacity                                              |
| `partner-profile-coverage.json`   | `profile-coverage-artifact` adapter                                                  | CODE, call sign, source profile document revision, observed time; feeds future assembly/reconciliation, never a second final portal fetch | lifecycle, phase, credentials, policy, money, account data                                |
| legacy `partner-profiles.json`    | current portal compatibility only                                                    | the only current full-profile compatibility input; no new canonical authority                                                             | canonical dashboard facts or public expansion                                             |
| `partners-ops.v2`                 | `legacy-ops` compatibility adapter                                                   | temporary CODE/out/status/accounting observations with provenance                                                                         | canonical lifecycle, partner identity, final money totals                                 |
| SQLite/accounting feed            | accounting adapter                                                                   | typed entries, scoped balances, proofs, freshness                                                                                         | profile policy or Telegram delivery                                                       |
| Telegram handshake/forum metadata | implemented handshake observation adapter                                            | handshake phase, DM linkage state, gaps, and next steps                                                                                   | membership counts, configured topics, invite URLs, lifecycle, or accounting mutation      |
| bookmakers registry               | implemented public catalog parser + pure account resolver; connector loading planned | canonical `SportsbookId`, exact/explicit-alias host resolution, skin and brand metadata                                                   | partner account status, executable limits, credentials, or inferred parent-domain matches |
| limit-raises v3 artifact          | implemented limit-change observation adapter                                         | historical before/after stake reports with explicit partner/book mappings                                                                 | current executable ceilings, limit coverage, bookmaker identity, or partner identity      |
| Tennis partner-contracts artifact | implemented capacity observation adapter                                             | live canonical out activity, credential readiness, and integer max-stake evidence after explicit book mapping                             | offline execution authority, gross payout, net win, liquidity reservation, or profile ID  |
| Sports Terminal                   | planned Sports compatibility adapter                                                 | external state, gate observations, integration health after an authenticated parsed boundary exists                                       | a second profile store, lifecycle enum, contact/Telegram payload, or floating-point money |
| Kalshi partner registry           | execution adapter                                                                    | provider/out/skin capacity and qualified external refs                                                                                    | canonical partner IDs, money ledger truth                                                 |

### Sports Terminal API and HTML cutover evidence

The existing Sports Terminal surfaces are implementation references, not a
connector contract. The React `/partners` route is mounted and calls the paths
below, but `partnerRoutes` is not imported or mounted by the main API router or
server entrypoint. Its file header describes JWT/admin protection while the
exported router receives only `Request`, so that claim is not enforced at this
boundary.

| Candidate                              | Current evidence                                                                                               | Canonical decision                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| React `/partners`                      | Page-local `PartnerListItem`/request types; calls list, create, transition, deposit, limit, and evaluate paths | Reuse list/detail information architecture only; do not copy the duplicate schema or mutation surface       |
| `GET /api/partners`                    | Handler exists, returns unqualified `partnerId` list records, but its router is unmounted                      | Keep blocked until mounted behind explicit authentication and a parsed adapter response                     |
| `GET /api/partners/:id`                | Mixes contact data, Telegram config, lifecycle, limits, and floating-point balance/exposure fields             | Never consume directly; project only qualified external state and integration health                        |
| `GET /api/partners/:id/sources/health` | Closest match for `IntegrationHealthReadPort`; still unmounted and keyed by an unqualified path ID             | Define `ExternalPartnerRef` resolution, authentication, response parsing, and a money-free projection first |

This evidence narrows the unresolved input choice without promoting a dead or
unsafe route. The `sports-terminal` connector remains `blocked` in the TOML. Its
package proof is also explicitly incomplete: `bun run type-check:sto` currently
fails on unresolved `@auth/session` and `@auth/middleware` aliases, follow-on
implicit-`any` parameters, and one `unknown`-to-`string` router argument. These
are connector cutover TODOs, not tests to skip or grounds to weaken the root
TypeScript gate.

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
- Keep maximum stake, gross payout, net win, and liquidity as distinct out-level
  checks; split wager catalogs from promotions and model parlay support
  explicitly.
- Treat the current four CODEs as the minimum migration coverage set. The
  redacted coverage artifact accepts an empty map structurally in proposal mode,
  while the implementation-readiness gate reports all missing CODEs.

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
