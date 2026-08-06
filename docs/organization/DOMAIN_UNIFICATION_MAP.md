# Domain unification map

Routing index for the Tennis, partner, limits, Telegram, messaging, and portal
work that converged in August 2026. This page does not introduce another source
of truth. It points each concern to its existing owner and records the current
integration backlog.

The governing sequence is
[`DOMAIN_CONCEPT_SHAPE.md`](../DOMAIN_CONCEPT_SHAPE.md): business ownership →
stable meaning → parsed representation → consuming surface.

## Authority map

| Concern                               | Business owner                                                              | Concept authority                                                                                                                                               | Trusted shape / boundary                                                                                                                                              | Primary consumers                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Partner identity and lifecycle        | `partners`                                                                  | [`partner-domain-map.md`](../harness/tenants/partner-domain-map.md) · [`lib/partner-profile/schema.ts`](../../lib/partner-profile/schema.ts)                    | [`lib/partner-profile/parse.ts`](../../lib/partner-profile/parse.ts) · [`lib/operations/partner-profile-bridge.ts`](../../lib/operations/partner-profile-bridge.ts)   | `/portal/partners/` · `/registry/partner-profiles.json` · ops summaries           |
| Accounting, deposits, and settlements | `accounting`                                                                | Partner Profile ledger and accounting concepts                                                                                                                  | [`lib/partner-profile/ledger.ts`](../../lib/partner-profile/ledger.ts) and command-specific parsers                                                                   | Partners board · partners-ops bake · settlement/watch commands                    |
| Partner limits and compliance         | `compliance`                                                                | [`partner-limits.md`](../harness/tenants/partner-limits.md) · `ops.limits.*` vocabulary                                                                         | [`lib/operations/limits/limit-row-wire.ts`](../../lib/operations/limits/limit-row-wire.ts) · branded `TreeNodeId` / `PartnerProfileKey`                               | `/portal/limits/` · account dossier · `/registry/limit-raises.json` · agent reads |
| Telegram transport and package forums | `telegram`                                                                  | [`telegram-factory.md`](../harness/tenants/telegram-factory.md) · [`partner-package-group-handshake.md`](../harness/tenants/partner-package-group-handshake.md) | [`lib/telegram/telegram-config.ts`](../../lib/telegram/telegram-config.ts) · [`lib/telegram/package-group-registry.ts`](../../lib/telegram/package-group-registry.ts) | Factory bot · package forums · outbox projector · handshake registry              |
| Live TOC / Soft desk                  | `operations` in this artifact; live authority remains `toc-ops-repo`        | [`toc-ops.md`](../harness/tenants/toc-ops.md)                                                                                                                   | Cross-repository JSONL and registry contracts only                                                                                                                    | `/portal/toc/` fixture · `ct` live operator commands                              |
| Tennis HQ producer                    | Five producer domains: market data, research, trading, partners, accounting | Versioned `@tennis-hq/ssot` contract described by [`tennis-hq-registry.md`](../harness/tenants/tennis-hq-registry.md)                                           | Immutable registry tarball and authenticated `tennis-hq/v1` schemas; never a `workspace:*` import                                                                     | `tennis.factory-wager.com` · `/portal/tennis/` · Tennis registry slice            |
| Portal and documentation              | `portal` / `registry`                                                       | [`lib/portal/concept-domains.ts`](../../lib/portal/concept-domains.ts) · [`lib/portal/semantic-vocabulary.ts`](../../lib/portal/semantic-vocabulary.ts)         | Page concepts, route catalog, weave and generated registry artifacts                                                                                                  | Portal boards · `wiki-index.md` · `registry-index.md`                             |

## Boundaries that must stay explicit

- Tennis HQ is a separate producer repository. FactoryWager consumes its
  immutable package and runtime contract; it does not absorb the producer into
  the monorepo workspace graph.
- `FACTORY_WAGER_TOKEN` authenticates FactoryWager registry/package access.
  `PARTNER_API_TOKEN` authenticates Tennis HQ runtime reads. They are separate
  credentials and proof lanes.
- A partner `TreeNodeId`, `PartnerProfileKey`, Telegram chat id, call-sign, and
  package-group code are related identifiers, not interchangeable strings.
- Limits monitoring status describes evidence quality. Limit lifecycle state
  describes temporal enforceability. The E3 fields remain optional until the
  emitting backend returns them.
- Telegram owns transport, forum routing, templates, and delivery evidence. It
  does not become the accounting or partner identity source of truth.
- The TOC portal is a fixture/projection. Live Soft balances, rails, messages,
  phones, and package operations remain owned by `toc-ops-repo`.
- Generated registries and portal bakes prove delivery; they do not own domain
  meaning. Keep source and bake changes in separate commits.

## Integration ledger — 2026-08-05

Snapshot authority: remote `main` at `2fce0b971`. Hosted checks are signals;
local `bun run bun:ci` remains merge proof.

| Work                                                          | State                                                                                                                 | Required disposition                                                                                                                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR #331 — Factory handshake board and DOD Telegram accounting | Open; mergeable; branch is behind current `main`; the primary checkout also contains a large uncommitted continuation | Rebase the committed PR, then split the uncommitted continuation into DOD reconciliation, Telegram transport, Tennis, Bookmakers, concept metadata, and bake lanes before adding more work |
| PR #290 — Tennis runtime auth cutover                         | Draft and conflicting; local worktree is one commit ahead of the remote PR                                            | Preserve and push the local hardening commit, rebase onto current `main`, and require all five v1 probes to prove configured 401 bearer rejection                                          |
| PR #226 — ledger residual polish                              | Open from the pre-lifecycle/operations-ID wave                                                                        | Rebase and rerun ledger, brands, and partner governance gates; do not merge the old glossary bake blindly                                                                                  |
| PR #308 — ops liquidity summary                               | Open and isolated to the ops-summary read model                                                                       | Rebase, run its focused tests, then bind only the already-owned concepts/surfaces                                                                                                          |
| PR #311 — root documentation hub                              | Open; overlaps fast-moving root indexes                                                                               | Rebase last, after domain PRs settle, so it indexes merged truth rather than branch projections                                                                                            |
| PR #307 — registry board round-two polish                     | Open duplicate; its patch is already present on `main` through merged PR #306                                         | Close as superseded; do not re-merge                                                                                                                                                       |
| PR #336 — Codex thread portfolio                              | Draft, mergeable, and operationally separate                                                                          | Keep as a tooling lane; it may consume this map but must not redefine domain authority                                                                                                     |

## Workspace closeout order

1. Preserve every dirty worktree before cleanup. Do not delete or reset another
   lane's files.
2. Recover the primary checkout first. It must return to `main`; its current
   mixed continuation should become disjoint worktree lanes.
3. Close confirmed duplicate/superseded PRs and prune their clean worktrees.
4. Rebase active source lanes in dependency order: partner identity/lifecycle →
   accounting/limits → Telegram transport → portal consumers → documentation.
5. Refresh derived bakes only after their owning source lands, in separate bake
   commits.
6. Run the proof sequence below from current merged `main`, then deploy Pages
   from that merged revision.

## Proof sequence

```bash
bun run quality:concept
bun run docs:map:check
bun run verify:portal:static
bun run test:telegram-handshake
bun run tennis:agent-auth:check
bun test tests/tennis-agent-auth.test.ts tests/pages-edge-weave-subdomains.test.ts
bun test tests/limit-row-wire.test.ts tests/account-limit-profiles.test.ts
bun run bun:ci
```

At the snapshot above, docs mapping, portal static verification, Telegram (65
tests), Tennis (9 tests), and limits (8 tests) pass. The review found one
integration drift in the generated
[`SURFACE_COVERAGE.md`](../SURFACE_COVERAGE.md); the companion bake commit
refreshes it for the recent Partners and Limits board changes, restoring
`quality:concept`.

## Definition of organized

A lane is organized only when:

1. its business owner is named;
2. it reuses or deliberately adds a semantic concept;
3. boundary data is parsed once into branded/interior shapes;
4. every board, API, registry, CLI, or operator workflow is registered as a
   consumer;
5. source and derived bakes are separated;
6. focused proof and local merge proof pass;
7. its PR, worktree, and handoff state agree with merged `main`.
