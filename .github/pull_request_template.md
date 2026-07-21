# Pull Request

## Summary

<!-- 1–3 bullets: why this change exists -->

## Claim → evidence

State the user/ops claim this PR closes. Match kind to evidence ([PROOF.md](../docs/harness/PROOF.md)).

| Claim (one sentence) | Kind (`unit` / `boundary` / `journey` / `deployed`) | Evidence (command or path that exited 0) |
|----------------------|-----------------------------------------------------|------------------------------------------|
| | | |

Install journey (when install/layout touched): `bun run proof:install`

## Checklist

- [ ] `bun run harness:status` — day-loop ratchets known
- [ ] `bun run type-check` green for spine edits (`tsconfig.check.json`)
- [ ] Brands / wire: no new bare `*Id: string` or interior `unknown` params
- [ ] Did **not** sweep a parallel lane (foreign dirty trees left out)
- [ ] Docs/JIT updated only when an owner moved (`docs/harness/`, `repo-docs`, AGENTS)
- [ ] If reviewing the job end-to-end: [REVIEW.md](../docs/harness/REVIEW.md) nine questions

## Test plan

```bash
# typical local set — trim to what this PR touches
bun run proof:install
bun run type-check
bun run test:changed
bun run check:path-bun
bun run check:bun-env
```

## Notes for reviewers

<!-- Risk, rollout, authority (see docs/harness/AUTHORITY.md) -->
