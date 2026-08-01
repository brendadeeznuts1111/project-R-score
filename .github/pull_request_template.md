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

<!-- Fill shape (replace the blank row above — do not paste this as a table line):
     Terminal markdown uses Bun native ANSI · unit · bun test tests/bun-markdown-ansi.test.ts
-->

Install/layout touched: also run `bun run proof:install`.

## Fresh-rerun paste

Required when this PR moves an owner of a [`CRITICAL_PROOF_PATHS`](../lib/harness/proof.ts) claim — look up the command with `bun run docs:fresh-rerun` ([FRESH-RERUN.md](../docs/harness/FRESH-RERUN.md)). Paste stdout/stderr below. Soft tip: if the body mentions a proof id in backticks, include that claim’s `freshRerun` command string too.

```text
# paste fresh-rerun / claim re-proof output here
```

## Color Kernel (when theme / kernels touched)

Required when this PR touches `theme.jsonc`, kernel palettes, or `claim-reporter` /
`color-kernel-align` ([`color-kernel-paths.ts`](../lib/portal/color-kernel-paths.ts)).
CI always runs `bun run validate:colors:strict` via `test:colors` (claim `color-kernel-theme-aliases`).

- [ ] `bun run validate:colors` (or `validate:colors:strict`) exits 0
- [ ] Extended keys left intentional (not forced onto theme SSOT)
- [ ] Claim/Evidence paste below shows success

### Color Kernel Evidence

```text
# paste: bun run validate:colors
# expect: Claim: Color kernel theme-dark aliases are complete and conflict-free (theme v…).
```

## Checklist

- [ ] Did **not** sweep a parallel lane (foreign dirty trees left out)
- [ ] Prettier ran on every touched `lib/**/*.ts` file (`bun x prettier --write <file...>` or `bun run format:harness`)
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
