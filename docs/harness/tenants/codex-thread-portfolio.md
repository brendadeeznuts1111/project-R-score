# Codex thread portfolio

> **JIT:** Stable thread identity, purpose-based titles, value ranking,
> references, pin policy, and bring-home reconciliation for Codex threads rooted
> at `/Users/nolarose/Projects`.

## Authority and scope

The machine-readable authority is
[`tools/codex-thread-portfolio.json`](../../../tools/codex-thread-portfolio.json).
Schema v2 covers all 27 Project R root user threads present on 2026-08-05:

- 26 visible Codex Desktop threads;
- one visible user CLI thread.

The same local state contains 74 subagent sessions. They remain implementation
history under their root threads and do not consume root reference numbers. The
verification command proves that every subagent parent resolves to a cataloged
root thread.

## Identity and title schema

Thread identity, ranking, and subject lane are separate fields:

| Field              | Example             | Stability         | Meaning                                             |
| ------------------ | ------------------- | ----------------- | --------------------------------------------------- |
| Human reference    | `RTH-002`           | Immutable         | Chronological Project R root-thread reference       |
| Provider identity  | `019fa629-…`        | Immutable         | Codex UUIDv7-shaped `SessionId`; machine joins only |
| Rank               | `6`                 | Mutable           | Current value order; never identity                 |
| State              | `MERGED`            | Mutable           | Delivery lifecycle at the last evidence review      |
| Lane               | `BUN`               | Stable by purpose | Subject/owner routing label, not an ID namespace    |
| Purpose            | `API Surface Proof` | Editable          | Concise context-derived outcome                     |
| Delivery reference | `PR #52`            | Optional          | Most useful PR, issue, commit, or deployment handle |

Canonical title order:

```text
RTH-### · STATE · LANE · Purpose — delivery reference
```

Examples:

```text
RTH-002 · MERGED · BUN · API Surface Proof — PR #52
RTH-007 · SHIPPED · PORTAL · Partner Routing — PR #153
RTH-022 · BLOCKED · TENNIS · v1 Auth Cutover — PRs #10/#290
```

Do not use `UID-7` or `Bun UID-7`:

- `UID-7` conflates a human sequence with the UUIDv7-shaped provider identity.
- `BUN` is a lane, not an identity authority.
- A mutable rank cannot be used as a durable reference.

New root threads receive the next chronological `RTH-###` value. Existing values
never change when score, state, lane, or title changes.

## Mapping schema

Each root entry records:

- stable `ref` and branded provider `sessionId`;
- mutable `rank`, `score`, `quality`, `state`, and `pin`;
- routing `lane` and purpose-based `title`;
- evidence, structured external/repository references, and `relatedRefs`;
- one explicit bring-home or closure action.

Structured reference kinds are `pull-request`, `issue`, `commit`, `branch`,
`worktree`, `document`, `command`, `deployment`, and `thread`. Relationships use
stable `RTH` values rather than rank numbers or raw provider UUIDs.

Scores total 100:

- **Delivered value — 30:** material artifact value.
- **Verification — 25:** focused tests, typing, security, and local merge proof.
- **Integration — 20:** commit, push, merge, or deployment posture.
- **Reusability — 15:** durable contract, tool, runbook, or proof.
- **Closure — 10:** explicit handoff with unresolved risk named.

Quality is separate from score: `production`, `verified`, `review-required`,
`analysis-only`, `blocked`, or `empty`. This prevents a valuable blocked
contract thread from being mislabeled as poor code.

## Operate

```bash
# Read-only audit of title, pin, root inventory, and subagent-parent parity
bun run threads:portfolio

# Print the complete scorecard
bun run threads:portfolio -- --markdown

# Apply catalog titles and the index/top-five pin policy
bun run threads:portfolio:apply

# Require exact title, pin, root-count, chronological-ref, and parent parity
bun run threads:portfolio:verify
```

Title changes use Codex's supported `thread/name/set` app-server method. Codex
0.146 does not expose pin mutation through that protocol. The guarded
local-state lane is therefore limited to pin policy:

1. verifies the expected `threads.id`, `threads.cwd`, and `threads.is_pinned`
   columns;
2. creates a consistent SQLite backup under `~/.codex/backups/`;
3. updates only exact cataloged root rows in one transaction;
4. verifies title, pin, inventory, chronological reference, and subagent-parent
   parity after the write.

The default command is read-only. State changes require explicit `--apply` and
`--pins` flags, as used by `threads:portfolio:apply`.

## Reference map and bring-home queue

The catalog is the complete ranked map. The merged `RTH-026` domain authority
task provides the integration order. Current highest-value open work:

- **RTH-016 — Tennis matcher/cache/registry:** Publish the clean three-commit
  lane through a focused PR.
- **RTH-015 — cross-venue reconciliation:** Push and review the clean
  three-commit lane.
- **RTH-018 — Tennis v1/Plum:** Complete package publication and the
  checksum/registry handoff.
- **RTH-022 — Tennis auth:** Supply authorized `PARTNER_API_TOKEN` custody and
  Tennis Worker secret access; PRs #10 and #290 remain blocked.
- **RTH-013 — branded IDs:** Publish the clean integration branch.
- **RTH-011 / RTH-009:** Confirm pushed revisions are reachable from `main` or
  recover them through focused PRs.
- **RTH-023:** Compare the historical local portal lane with current `main`
  before recovering unique changes.
- **RTH-006:** PR #55 is closed unmerged; recover only unique changes.
- **RTH-004 / RTH-027:** Empty or unscoped root records and archive candidates.

## Repository reconciliation

Thread titles are navigation metadata, not merge evidence. A thread is brought
home only when its closure matches git, PR, local-gate, and deployment state.
The catalog therefore stores repository/external references beside the thread
relationship map.

This automation was built in a disjoint worktree because the primary checkout
contained unrelated active work. It must never sweep, archive, commit, merge, or
delete another lane merely because a thread is low-ranked or stale.
