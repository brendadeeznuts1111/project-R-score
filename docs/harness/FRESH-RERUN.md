# Fresh-rerun contract

## Claim

When a harness change is proposed that touches a proof claim’s owner, there is a re-run of that claim in an environment that has not inherited help from the proposing conversation.

## Invariant

Every entry in `CRITICAL_PROOF_PATHS` (`lib/harness/proof.ts`) has a **`freshRerun`** command. Before merging a change that touches that claim’s owner file, run that command and **paste the terminal output into the PR body**.

No new tooling. Reviewer does not approve without that output.

## Evidence

- **`lib/harness/proof.ts`** — `freshRerun` on each path  
  *Ratchet* → `bun test tests/harness-fresh-rerun-contract.test.ts`
- **PR body** — pasted stdout/stderr of the claim’s `freshRerun`  
  *Ratchet* → human review (AUTHORITY / improve-harness)
- **Discover** — `bun run harness:status` · `bun run docs:fresh-rerun`

## Improve-harness loop

`observe → earliest handoff → smallest fix → verify → **fresh rerun** → retain|revise|remove`

The fresh-rerun step is what makes retain/revise/remove evidence-based. Lessons in [`FEEDBACK.md`](FEEDBACK.md) still require a fresh rerun of the affected claim.

## Lookup

```bash
bun run docs:fresh-rerun
bun run harness:status   # each proof path lists *Fresh-rerun* → …
```

Upstream: [Prove the outcome](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/proof) · [Improve one harnessed job](https://github.com/lopopolo/harness-engineering/blob/trunk/playbooks/improve-harness.md).
