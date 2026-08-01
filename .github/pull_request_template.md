# Pull Request

## Summary

<!-- 1–3 bullets: why this change exists -->

-

## Claim → evidence

State the user/ops claim this PR closes. Match kind to evidence ([PROOF.md](../docs/harness/PROOF.md)).
Non-draft PRs fail CI when this table has no filled row (`bun scripts/check-pr-claim.ts`).

| Claim (one sentence) | Kind (`unit` / `boundary` / `journey` / `deployed`) | Evidence (command or path that exited 0) |
|----------------------|-----------------------------------------------------|------------------------------------------|
| | | |
<!-- Example (replace the blank row above; do not leave only this comment):
| Terminal markdown uses Bun.markdown.ansi / bun ./file.md | unit | bun test tests/bun-markdown-ansi.test.ts |
-->

Install/layout touched: also run `bun run proof:install`.

## Fresh-rerun paste

Required when this PR moves an owner of a [`CRITICAL_PROOF_PATHS`](../lib/harness/proof.ts) claim — look up the command with `bun run docs:fresh-rerun` ([FRESH-RERUN.md](../docs/harness/FRESH-RERUN.md)). Paste stdout/stderr below. Soft tip: if the body mentions a proof id in backticks (`` `branded-ids` ``), include that claim’s `freshRerun` command string too.

```text
# paste fresh-rerun / claim re-proof output here
```

## Checklist

- [ ] Did **not** sweep a parallel lane (foreign dirty trees left out)
- [ ] Brands / wire: no new bare `*Id: string` or interior `unknown` params
- [ ] Docs/JIT updated only when an owner moved (`docs/harness/`, `repo-docs`, AGENTS)
- [ ] If spine touched: `bun run type-check` (`tsconfig.check.json`)
- [ ] Day-loop known: `bun run harness:status` (optional discover)

## Test plan

```bash
# claim-specific commands from Claim → evidence (prefer over a full ci:harness:fast)
```

## Notes for reviewers

<!-- Risk, rollout, authority: docs/harness/AUTHORITY.md · end-to-end job review: docs/harness/REVIEW.md -->
