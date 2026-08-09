# Partner dashboard squad — worktrees, lanes, spawn prompts

**Baseline:** after Lane 0 lands on `main` (plan validate green).  
**Primary checkout:** `~/Projects` tracks `main` only.  
**Each agent:** dedicated worktree + branch; pathspec commits; squash PR.

## Worktree / branch table

| Lane          | Branch                                  | Worktree path                                 | Owns (pathspec)                                                                |
| ------------- | --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| **0 Harness** | `feat/partner-lane0-plan-honesty`       | `.worktrees/partner-lane0-plan-honesty`       | plan TOML, plan validator (if needed), `packages/partners/README.md`, this doc |
| **1 Books**   | `feat/partner-lane-a-book-identity`     | `.worktrees/partner-lane-a-book-identity`     | bookmakers / bookmaker-account / reconcile sportsbook / bake aliases           |
| **2 Limits**  | `feat/partner-lane-b-limit-evidence`    | `.worktrees/partner-lane-b-limit-evidence`    | limit-changes aliases, coverage metrics tests, bake                            |
| **3 Funding** | `feat/partner-lane-c-funding-provider`  | `.worktrees/partner-lane-c-funding-provider`  | accounting-ledger, ledger fixture, funding/provider attention                  |
| **4 Profile** | `feat/partner-lane-d-profile-redaction` | `.worktrees/partner-lane-d-profile-redaction` | private profile parse/redact, public projection tests                          |
| **5 ST ops**  | `feat/partner-lane-h-st-health-refresh` | `.worktrees/partner-lane-h-st-health-refresh` | ST health → registry fixture pipeline; **no** partnerRoutes mount              |
| **6 Board**   | `feat/partner-lane-i-board-deeplinks`   | `.worktrees/partner-lane-i-board-deeplinks`   | `public/portal/partners/**` only                                               |

Create (from primary, after `git fetch origin main`):

```bash
cd ~/Projects
for spec in \
  "feat/partner-lane-a-book-identity:.worktrees/partner-lane-a-book-identity" \
  "feat/partner-lane-b-limit-evidence:.worktrees/partner-lane-b-limit-evidence" \
  "feat/partner-lane-c-funding-provider:.worktrees/partner-lane-c-funding-provider" \
  "feat/partner-lane-d-profile-redaction:.worktrees/partner-lane-d-profile-redaction" \
  "feat/partner-lane-h-st-health-refresh:.worktrees/partner-lane-h-st-health-refresh" \
  "feat/partner-lane-i-board-deeplinks:.worktrees/partner-lane-i-board-deeplinks"
do
  branch="${spec%%:*}"; path="${spec##*:}"
  git worktree add "$path" -b "$branch" origin/main
  (cd "$path" && bun install)
done
```

## Non-goals (all lanes)

- Mount ST `/api/partners` list/detail/money mutations
- Float money on dashboard wire
- Soft/seat as finance authority
- Hosted GHA as merge gate
- Secrets in commits / PR bodies

## Spawn prompts

### Agent 0 — Harness (this lane)

```
Lane 0 only. Worktree: partner-lane0-plan-honesty.
Restore bookmaker_account_resolver.registry_io_status to
planned-owned-by-bookmakers-registry-connector (resolver stays pure; catalog I/O
is bookmakers-registry bake). Align packages/partners/README.md with bake truth.
Prove: bun run partner:dashboard-plan:validate. Pathspec commit + PR. No bake
behavior change required.
```

### Agent 1 — Books

```
Lane A only. Worktree: .worktrees/partner-lane-a-book-identity branch
feat/partner-lane-a-book-identity.
Goal: reduce unregistered sportsbook attention and increase externalAccountRefs
without host guessing. Explicit alias/seed map for partner-book-tbd,
southfl-pph-desk, orange777 only when a real catalog SportsbookId exists or an
operator-declared alias is documented; otherwise leave unregistered. Do not invent
SportsbookIds. Prove with partner tests + partner:dashboard:bake. Pathspec commit.
Do not edit portal HTML or ST router.
```

### Agent 2 — Limits

```
Lane B only. Worktree: .worktrees/partner-lane-b-limit-evidence branch
feat/partner-lane-b-limit-evidence.
Goal: improve partners[].limits coverage for NOV/SPEN missing outs by expanding
treeNode→PartnerCode and sportsbook aliases on limit-raises parse — never set
currentExecutionCeiling or observedMaxStake from raises. Prove coverage ratios
only move with real evidence. Pathspec: limit-changes, reconcile coverage,
bake, tests. No portal.
```

### Agent 3 — Funding / provider

```
Lane C only. Worktree: .worktrees/partner-lane-c-funding-provider branch
feat/partner-lane-c-funding-provider.
Goal: fewer fundingStatus=unknown and more providerConnectionStatus from ledger
+ tennis credentials. Attention when operationalStatus=ready and funding unfunded.
Integer minor units only. Pathspec: accounting-ledger, partner-ledger fixture,
build/reconcile, tests. No ST money routes.
```

### Agent 4 — Profile redaction (D1)

```
Lane D1 only. Worktree: .worktrees/partner-lane-d-profile-redaction branch
feat/partner-lane-d-profile-redaction.
Goal: private profile policy surface parse + redaction so public registry
projection never contains jurisdiction/SOR/contact secrets. Tests for leak
refusal. Do not implement risk/SOR product logic. Pathspec: partner-profile /
packages/partners profile adapters / redaction tests / design notes only.
```

### Agent 5 — ST health refresh

```
Lane H only. Worktree: .worktrees/partner-lane-h-st-health-refresh branch
feat/partner-lane-h-st-health-refresh.
Goal: script or documented job: authenticated GET
/api/v1/partners/integration-health → redacted
public/registry/sports-terminal/partner-integration-health.json write shape
compatible with parseSportsTerminalIntegrationHealth. partnerRoutes list/detail
must stay unmounted. Mocked tests without live secrets. Pathspec: ST health
routes, tools/scripts for refresh, fixture schema, tests.
```

### Agent 6 — Board deeplinks

```
Lane I only. Worktree: .worktrees/partner-lane-i-board-deeplinks branch
feat/partner-lane-i-board-deeplinks.
Goal: attention row actions deep-link to outs inventory with filters
(missing limit evidence / no external ref); profile panel shows treeNodeId,
externalPartnerRefs, limits summary. Pathspec: public/portal/partners/** and
partners-* tests only. No package adapter changes.
```

## Merge order

1. Lane 0 (this PR)
2. A ∥ B ∥ C ∥ I (disjoint paths)
3. H (ST) and D1 after 0
4. Wave 2: risk/SOR · cultivation · commercial · connector LKG resilience

## Residual / hygiene (post wave-1–2)

**Board residual attention (info only):** `limits.raise_observed`,
`bookmakers.unregistered_sportsbook` (desk placeholders). Handshake re-export
with Telegram token is required after any fixture clock clustering.

**Bloat decisions**

| Candidate | Decision |
| --------- | -------- |
| `limit-demo-*` / `partner-42` in `limit-raises.json` | **Keep** — owned by `/portal/limits/` demos, agent API examples, account-dossier tests. Partner bake already ignores non-CODE callSigns. |
| Board `projectDashboardToOpsShape` / `projectDashboardToHandshakeShape` / `isLegacyPartnerComparisonRequested` | **Removed** from `partners-board.js` (HTML never called them). Package consumer-contract still documents retired `?compare=legacy`. |
| `partners-ops` out skeleton | **Keep** until outs are owned by profile books / tennis inventory. |

## Proof commands (every lane)

```bash
bun run partner:dashboard-plan:validate   # must stay green after 0
bun test <lane tests>
# if bake touched:
bun run partner:dashboard:bake && bun run partner:dashboard:bake -- --check
```
