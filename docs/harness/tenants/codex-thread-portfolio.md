# Codex thread portfolio

> **JIT:** Purpose-based titles, value ranking, pin policy, and bring-home queue
> for Codex threads rooted at `/Users/nolarose/Projects`.

## Authority and scope

The portfolio catalog is
[`tools/codex-thread-portfolio.json`](../../../tools/codex-thread-portfolio.json).
It covers the 25 user-visible Project R threads returned by the Codex thread
inventory on 2026-08-05. Local state also contains subagent and handoff
sessions; those are implementation history rather than user-owned portfolio
entries and are intentionally excluded.

Scores are evidence-based and total 100:

- **Delivered value — 30:** Did the thread produce material artifact value?
- **Verification — 25:** Did focused tests, type checks, security, and `bun:ci`
  pass?
- **Integration — 20:** Was the work committed, pushed, merged, or deployed?
- **Reusability — 15:** Is the outcome a durable contract, tool, runbook, or
  proof?
- **Closure — 10:** Is the handoff explicit and free of unresolved risk?

Rank 0 is the pinned portfolio index. Ranks 1–5 are the pinned work threads.
Every other thread remains searchable by its numeric rank, lifecycle state, and
purpose-based title.

## Operate

```bash
# Audit local title and pin parity
bun run threads:portfolio

# Print the complete scorecard
bun run threads:portfolio -- --markdown

# Apply titles through Codex app-server, then apply the six catalog pins
bun run threads:portfolio:apply

# Require exact local parity
bun run threads:portfolio:verify
```

Title changes use Codex's supported `thread/name/set` app-server method. Codex
0.146 does not expose pin mutation through that local protocol, so the guarded
pin lane:

1. verifies the expected `threads.id`, `threads.cwd`, and `threads.is_pinned`
   columns;
2. creates a consistent SQLite backup under `~/.codex/backups/`;
3. updates only the 25 exact catalog rows for `/Users/nolarose/Projects` in one
   transaction;
4. verifies title and pin parity after the write.

The default command is read-only. State changes require the explicit `--apply`
and `--pins` flags used by `threads:portfolio:apply`.

## Bring-home queue

The catalog records the evidence and next action for every thread. The important
remaining work is:

- **7 — Tennis matcher, cache, and registry hardening:** Publish the clean
  three-commit lane through a focused PR.
- **8 — Cross-venue tennis reconciliation:** Push and review the clean
  three-commit lane.
- **9 — Tennis HQ v1 contract and Plum integration:** Complete the canonical
  package publication and checksum/registry handoff.
- **10 — Tennis v1 auth cutover:** Supply the authorized `PARTNER_API_TOKEN` and
  Tennis Worker secret write; PRs #10 and #290 remain draft.
- **11 — Branded-ID adoption wave 2:** Publish the clean integration branch.
- **12 — Portal URLPattern link integrity:** Confirm the pushed commit is merged
  or recover it through a PR.
- **14 — UI accessibility and Vite boundary hardening:** Split local changes
  into an isolated lane before committing.
- **18 — Hosted CI cleanup:** PR #55 is closed unmerged; compare main before
  recovering unique changes.
- **19–23 — Incomplete or blocked threads:** Re-open only with a scoped input,
  clean lane, and explicit final proof.
- **24 — Unscoped agent thread:** Archive candidate; it has no usable
  deliverable.

## Repository reconciliation snapshot

At review time, the primary checkout was on `feat/factory-handshake-board`, not
`main`, with 44 dirty paths, one staged submodule pointer, and six registry bake
changes. The workspace had more than 80 registered worktrees, including several
dirty and stale lanes. The portfolio automation was therefore built in a
disjoint worktree and does not modify or sweep the primary checkout.

Current external status was verified directly:

- Project R PRs #52, #153, #280, #281, #334, and #335 are merged.
- Project R PR #290 and Tennis producer PR #10 are open drafts.
- Project R PR #55 is closed without merge.

Thread titles are navigational metadata, not merge evidence. A thread is
considered brought home only when its catalog closure matches git, PR, local
gate, and deployment state.
