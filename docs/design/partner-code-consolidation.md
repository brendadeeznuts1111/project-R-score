# Partner code consolidation review

Status: proposed consolidation plan (2026-08-05)

## Decision

Create one cohesive partner-owned workspace at `projects/active/partners/` and
add that exact path to the root workspace list. Its package name is
`@factorywager/partners`. Move toward it in small compatibility-preserving
slices. The workspace owns partner identity, profile semantics, lifecycle,
book/account references, and the canonical dashboard read model. Accounting,
Telegram, limits, Tennis HQ, Sports Terminal, vault, and portal code remain
explicit adapters or consumers.

Do not start by moving every file whose text contains `partner`. The repository
contains hundreds of partner vocabulary touchpoints, but many belong to other
business domains. Consolidate ownership first, then replace imports and board
joins one boundary at a time.

## What exists now

The current implementation is healthy but fragmented:

- `bun run partners:governance` passes.
- 44 focused profile, ledger, isolation, board, and portal tests pass.
- `public/registry/partners-ops.json` contains 4 partners and 10 outs.
- `public/registry/partner-profiles.json` is valid and current but contains 0
  real profiles.
- `public/portal/partners/index.html` is 2,586 lines and joins profile,
  partners-ops, Telegram handshake, seat desk, limits, bookkeeping, and Soft
  data in the browser.
- `lib/telegram/partner-ops-registry.ts` is 965 lines and currently acts as
  domain model, legacy source adapter, projection engine, validator, event
  reader, ledger join, and registry writer.
- The current board fetches eight artifacts; its partner list still comes from
  `partners-ops`, not the unified profile bake.

This means the next useful extraction is not a new dashboard. It is a canonical
partner read model that lets the existing dashboard become smaller.

## Inventory method and scope

The review used tracked files from `git ls-files`, path searches for partner,
ledger, settlement, accounting, limits, Telegram, Tennis, and sport terms, and
content searches for `partner` / `partners`. This produced two inventories:

1. **Partner-owned candidates**: files whose primary purpose is a partner
   concept or workflow.
2. **Touchpoints**: code that refers to partners but is owned by another domain.

The filename/path inventory finds 128 tracked paths containing `partner` or
`partners` (34 tests, 33 library files, 15 tools, 14 Sports Terminal files, 13
public files, 7 scripts, 7 docs, 3 config files, and 2 skills). The broader
content search finds more than 500 tracked files with partner vocabulary. Those
numbers are intentionally not move lists. Tests, docs, generated registries,
semantic vocabulary, shared portal chrome, and cross-domain joins account for
most of the content hits.

### Partner-owned candidates

| Cluster                   | Current paths                                                                                                                   | Keep / extract                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Profile core              | `lib/partner-profile/schema.ts`, `parse.ts`, `bake.ts`                                                                          | Best starting core. Preserve CODE key, lifecycle, book references, vault-only credentials, validation, and Bun TOML parsing. |
| Profile commands          | `lib/partner-profile/onboard.ts`, `register.ts`, `tools/partner-*.ts`                                                           | Keep as application services/CLI adapters; they should call package APIs rather than own shapes.                             |
| Ledger and settlement     | `lib/partner-profile/ledger.ts`, `deposit-import.ts`, `accounting-stub.ts`, `settlement-runner.ts`, `settlement-cron-worker.ts` | Extract behind an accounting port. SQLite and cron are adapters, not profile-core dependencies.                              |
| Legacy partner projection | `lib/telegram/partner-ops-registry.ts`, `partner-ops-events.ts`, `ops-accounting-view.ts`                                       | Keep the useful projection/validation behavior; split legacy ingestion from the canonical read-model builder.                |
| Telegram adapter          | `lib/telegram/partner-*`, package-group/handshake modules, `lib/portal/partner-telegram*.ts`                                    | Retain in `lib/telegram` initially. Export partner communication facts through a narrow adapter contract.                    |
| Portal domain helpers     | `lib/portal/partner-routes.ts`, `partner-tables.ts`, `partner-tags.ts`                                                          | Strong reusable portal contracts. Move only after the read model stabilizes.                                                 |
| Dashboard                 | `public/portal/partners/`, `public/portal/partners.md`                                                                          | Keep the route. Replace its many registry joins with one dashboard artifact and split the monolithic inline controller.      |
| Profiles/config           | `config/partner-profiles/*.toml`, `config/partner-templates/*.toml`                                                             | Canonical source data. Use Bun native TOML; do not copy profile data into TypeScript.                                        |
| Governance                | partner tests, `scripts/validate-partner-*`, `tools/partners-ops.ts`                                                            | Retain focused gates and redirect them to package exports during migration.                                                  |

### Touchpoints that stay with their owning domains

| Owner               | Paths / surfaces                                                       | Boundary                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operations identity | `lib/operations/partner-*`, `tree_nodes`, profile bindings, play gates | Identity and dispatch remain operations-owned. Partners consumes branded node references and emits projections.                                                |
| Telegram            | `lib/telegram/**`, `/portal/factory/`, webhook functions               | Telegram owns transport, chat membership, topics, and delivery. It may not define partner lifecycle or accounting truth.                                       |
| Accounting / TOC    | Soft export, DOD Accounting, `toc-ops`, seat capital desk              | Accounting owns entries, balances, settlement inputs, and proofs. Partner core only references summarized/account-scoped facts. Soft mutations remain in `ct`. |
| Limits/compliance   | `lib/operations/limit-*`, `lib/prediction/limit-*`, `/portal/limits*`  | Keep scoring and compliance policy in their existing domains. Dashboard consumes a partner-keyed summary.                                                      |
| Bookmakers          | `@factorywager/bookmakers`, `/portal/bookmakers/`                      | Book identity and metadata remain registry-owned. Partner profiles store book IDs and account overrides.                                                       |
| Tennis HQ           | `lib/tennis/**`, `/portal/tennis/`, `tennis.factory-wager.com`         | Tennis is a producer/consumer integration. Its authenticated v1 partner contract is not the canonical profile store.                                           |
| Sports Terminal     | `projects/active/sports-terminal-os/src/zones/partner-profile/**`      | Reuse gateway/materialization ideas, but consume the canonical partner package/bake instead of maintaining a second profile schema.                            |
| Security/vault      | `lib/security/partner-vault.ts`, Proton integration                    | Vault owns ciphertext and secret lookup. Profiles contain only `vaultKey` references.                                                                          |
| Portal              | shared chrome/UI builders and page concepts                            | Portal owns rendering primitives and routes, not partner business rules.                                                                                       |

There is no tracked `sport.factory-wager.com` or `sports.factory-wager.com`
surface in the current repository. `tennis.factory-wager.com` is registered.
Treat a Sport FactoryWager host as a proposed consumer/runtime and resolve its
owner before adding routing, auth, or package contracts.

## Best parts to preserve

1. `lib/partner-profile/schema.ts`: the approved CODE-keyed profile and
   lifecycle contract is the strongest canonical core.
2. `lib/partner-profile/parse.ts` plus `bake.ts`: parse once at the TOML
   boundary, validate, then publish a static artifact.
3. `lib/portal/partner-routes.ts` and `partner-tables.ts`: typed routes and
   table metadata are already separated from DOM rendering.
4. `public/portal/partners/partners-board.js`: pure indexing, filtering, and
   summary helpers are a good extraction seam.
5. `lib/partner-profile/ledger.ts`: idempotent entries, account scope, external
   references, proof links, and running balance are worth keeping as the SQLite
   adapter contract.
6. `lib/telegram/ops-accounting-view.ts`: useful pure projection logic, but it
   belongs behind the accounting adapter.
7. Sports Terminal `PartnerGateway`: keep its materialization/evaluation pattern
   and rich list/detail/tab information architecture, not its duplicate schema
   or storage authority. Its current service is in-memory, tracked profile TOMLs
   are absent, and persistence comments are largely prospective.
8. Existing governance: `partners:governance`, concept/surface gates, ledger
   validation, profile tests, and portal tests already provide a migration
   safety net.

The Tennis contract bake is also a strong adapter reference: it parses fields at
the wire boundary, labels live/offline provenance, writes atomically, and keeps
the last good artifact when a live refresh fails.

## Duplication to retire

| Duplication                                                             | Canonical choice                                                                                     | Compatibility strategy                                                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PartnerProfile` vs `PartnersOpsPartner` vs Sports Terminal profile     | `PartnerProfile` plus a versioned `PartnerDashboardRecord` projection                                | Keep legacy parsers, emit the canonical projection, then deprecate duplicate types.                    |
| Partner CODE regex in profile, Telegram registry, portal routes, and JS | Export one CODE parser/brand from partners core                                                      | Mirror a generated browser validator until dashboard code is bundled.                                  |
| Lifecycle and phase definitions in several modules                      | Profile lifecycle is stored; phase is derived                                                        | Add projection tests against legacy behavior before removing aliases.                                  |
| Accounting facts embedded in profile TOML and SQLite ledger             | SQLite/event feed is accounting truth; profile contains configuration and optional snapshot metadata | Stop appending ledger rows into profile TOML after dashboard consumes the accounting summary artifact. |
| Browser-side multi-registry joins                                       | Versioned partner dashboard artifact                                                                 | Keep old sources as provenance fields during transition.                                               |
| Telegram-owned partner registry                                         | Partners owns read model; Telegram contributes communication facts                                   | Maintain `partners-ops.v2` as a compatibility artifact until consumers migrate.                        |

The detailed [partner type/reference map](./partner-type-reference-map.md)
resolves the package-level identity choices:

- add branded `PartnerCode`, `PartnerCallSign`, and canonical
  `OutId = out-{CODE}-{n}`; accept `CODE-N` only at the legacy seat boundary;
- keep nested `CODE-NNN-SUBNN` as operations-owned `SeatCallSign`, not a wider
  partner call-sign grammar;
- qualify every external `partnerId` by source system;
- export `BookType`, lifecycle, and derived phase from one module, with
  camelCase inside trusted TypeScript and snake_case only at compatibility
  boundaries;
- keep the root eight lifecycle states and project Sports Terminal `frozen` to
  `suspended` with the external state retained as provenance;
- make accounting the only ledger/balance authority and use transactional
  integer minor units with explicit currency and structured account scope; and
- use `[0,1]` ratios in core, with explicit percentage conversion at wire/UI
  boundaries.

## Branch and worktree review

All named partner accounting, profile, settlement, ledger, lifecycle, watch,
environment, ops-depth, and DOD branches were squash-merged. Their old tips are
stale history and must not be cherry-picked.

Preserve these dirty worktrees before any cleanup:

- `partner-profiles-migration` contains a source note and an operational profile
  bake with sensitive partner/account metadata.
- `partner-ledger-demo` contains generated profile/ops bakes.
- `ledger-residuals-polish` contains unrelated `Kalshi-bot` pointer drift.

`feat/telegram-notifications` is the only substantial unmerged candidate. Reuse
its profile diff/audit, partner health, finance aggregation, notification
preferences, and Bun-native cron ideas selectively. Do not merge the branch
wholesale: it creates a duplicate singular partner board, imports Telegram into
the profile shape, defaults notifications on, duplicates report-log tables, and
hardcodes an external event feed.

The closed `agent/partner-opportunities` and `feat/concept-lifecycle-phase1`
branches are not MVP sources. The former needs a fresh event-fold design against
the current schema; the latter duplicated the canonical lifecycle engine.

## Proposed workspace

```text
projects/active/partners/
├── package.json                  # @factorywager/partners
├── src/
│   ├── index.ts                 # stable public exports
│   ├── core/                    # CODE, lifecycle, profile, books, validation
│   ├── config/                  # Bun TOML loader/materializer
│   ├── read-model/              # PartnerDashboardRecord + summary builder
│   ├── ports/                   # accounting, telegram, limits, bookmakers
│   └── compatibility/           # partners-ops.v2 projection during migration
└── tests/
```

Keep implementations that perform SQLite, Telegram API calls, vault operations,
or portal DOM work outside this package. The package defines ports and pure
projections; adapters remain in their owning domains until they have a clear
reason to become separate workspaces.

The first ledger adapter must harden money semantics before it becomes a package
boundary: store integer minor units instead of SQLite `REAL`, make balance
updates transactional, define whether balances are per currency and account
scope, and stop mirroring an unbounded transaction history into profile TOML.
Share one CSV/JSONL boundary parser between deposit and settlement import.

## Bun-native profile loading

Use both Bun TOML paths intentionally:

- Static, committed templates can use
  `import template from "./template.toml" with { type: "toml" }`.
- Dynamic `config/partner-profiles/<CODE>.toml` discovery uses `Bun.Glob`,
  `Bun.file`, and `Bun.TOML.parse`, followed immediately by the canonical
  parser/validator.
- Writes use `Bun.TOML.stringify` only in command adapters. Core functions
  receive typed values and do not touch the filesystem.

The active Bun 1.4.0 runtime passes the machine file-type doctor for native TOML
imports. Existing repository policy already requires canonical Bun API refs on
files that use these APIs.

## Cutover controls

- `IngressTranslator` is owned by the partners compatibility boundary and is
  called by HTTP/BFF, CLI, and artifact ingress before core parsing. Its only
  MVP rewrite is `CODE-N` to `out-CODE-N`; it records telemetry and original
  provenance and rejects unknown aliases.
- Lifecycle is a structured fact with mandatory source system, original state,
  adapter version, mapping confidence, and effective timestamp. The Sports
  `frozen` to `suspended` mapping is therefore auditable rather than a lossy
  display conversion.
- Adapter defaults are explicit: 3-second timeout, 5-minute stale window,
  three-failure circuit threshold, 60-second open interval, and optional-source
  last-known-good retention capped at 24 hours. Required profile data cannot use
  a fallback past the 5-minute stale window.
- `bun run lint:money-sql:staged` is wired into pre-commit for staged SQL and
  embedded migration/schema/ledger DDL. Financial `balance`, `amount`, and
  `price` columns reject `REAL`, `FLOAT`, and `DOUBLE`; use integer minor units
  or `NUMERIC(20,0)`.
- `bun run partner:money:migrate -- --db <path>` is the explicit, idempotent
  partner-ledger migration. Its default plan is read-only; prepare/backfill and
  finalize require `--apply`, and finalize also requires a newly created,
  integrity-checked SQLite backup. The complete rollout and rollback contract is
  in [partner-money-integer-migration.md](./partner-money-integer-migration.md).
- The machine plan embeds its five durable decisions under
  `[metadata.decision_log]` so runtime tooling can surface the constraints
  without scraping Markdown.

## Migration slices

1. Add `projects/active/partners` / `@factorywager/partners` with core types,
   parsers, and read-model contracts. Re-export from old modules so no consumer
   moves yet.
2. Make an empty canonical bake fail, then materialize real profiles for the
   four current partners, or explicitly record why a legacy-only partner cannot
   materialize.
3. Enforce the financial SQL storage ratchet, then harden the accounting adapter
   around transactional minor-unit balances.
4. Add adapters that project Telegram, accounting, limits, and bookmaker facts
   into `PartnerDashboardRecord`.
5. Bake `/registry/partners-dashboard.json` with source provenance, conflicts,
   and freshness per adapter.
6. Convert `/portal/partners/` to that artifact and split the inline controller
   into page, tables, filters, and details modules.
7. Migrate Sports Terminal to the package/bake contract.
8. Remove compatibility exports only after search, import-graph, concept,
   surface, and full `bun:ci` gates pass.

## Explicit non-goals for the MVP

- Moving all Telegram code into the partners package.
- Moving Soft/TOC accounting mutations into FactoryWager.
- Making Tennis HQ the partner source of truth.
- Combining the partners, limits, bookmakers, factory, account, or tennis URLs
  into one page.
- Publishing packages or deploying the dashboard.
- Renaming existing directories before compatibility imports and gates exist.
