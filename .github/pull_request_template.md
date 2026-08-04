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

### Concept-lane proof (when vocabulary / boards / limit-row wire change)

Fill applicable rows (keep kinds in `unit|boundary|journey|deployed`). Full map:
[docs/CONCEPT_LIFECYCLE.md](../docs/CONCEPT_LIFECYCLE.md).

| Claim (one sentence) | Kind | Evidence (command / path) |
|----------------------|------|---------------------------|
| Concept audit passes | unit | `bun run concept:audit --strict` |
| Surface coverage passes | unit | `bun run validate:surface-coverage` |
| Wire parser accepts valid / rejects invalid enums | unit | `bun test tests/limit-row-wire.test.ts` |
| Board slug registered | unit | `PORTAL_BOARD_SLUGS` + `public/portal/<slug>/` + page-concepts |
| Deprecation has honest `replacedBy` | unit | vocabulary entry + `rg` consumers retargeted |
| Glossary bake current (if projection changed) | unit | `bun run glossary:portal:check` |

## Concept-lane gates (required when touching concepts / boards / limit wire)

- [ ] `bun run concept:audit --strict` exits 0
- [ ] `bun run validate:surface-coverage` exits 0 (allowlist warnings OK)
- [ ] If adding/modifying a wire field: `bun test tests/limit-row-wire.test.ts` passes
- [ ] If adding/removing a board: `PORTAL_BOARD_SLUGS`, `page-concepts`, `public-routes`, `_redirects`, and `public/portal/<slug>/` stay synced
- [ ] If deprecating: `replacedBy` set; surface maps and HTML bind the successor

Skip this whole section only for PRs with no concept/board/wire impact.

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

## Escape hatches used (if any)

Only when a commit on this PR set `SKIP_*=1`. Full policy:
[DEVELOPMENT-WORKFLOW.md](../docs/DEVELOPMENT-WORKFLOW.md#escape-hatches).
Leave unchecked / blank when no skip was used.

- [ ] `SKIP_TEST_CHANGED=1` — reason + local proof:
- [ ] `SKIP_QUALITY_CONCEPT=1` — reason + local proof:
- [ ] `SKIP_GITLEAKS=1` — reason + local proof:

## Checklist

- [ ] Did **not** sweep a parallel lane (foreign dirty trees left out)
- [ ] Prettier ran on every touched `lib/**/*.ts` file (`bun x prettier --write <file...>` or `bun run format:harness`)
- [ ] Brands / wire: no new bare `*Id: string` or interior `unknown` params
- [ ] Docs/JIT updated only when an owner moved (`docs/harness/`, `repo-docs`, AGENTS)
- [ ] Concept lifecycle / agents tenant docs updated when vocabulary or wire contract moved ([CONCEPT_LIFECYCLE.md](../docs/CONCEPT_LIFECYCLE.md) · [agents.md](../docs/harness/tenants/agents.md))
- [ ] If spine touched: `bun run type-check` (`tsconfig.check.json`)
- [ ] Day-loop known: `bun run harness:status` (optional discover)
- [ ] Any `SKIP_*` pre-commit escape is justified above (or N/A)

## Test plan

```bash
# claim-specific commands from Claim → evidence (prefer over a full ci:harness:fast)
# Concept-lane default:
# bun run concept:audit --strict
# bun run validate:surface-coverage
```

## Notes for reviewers

<!-- Risk, rollout, authority: docs/harness/AUTHORITY.md · end-to-end job review: docs/harness/REVIEW.md -->

## Out of scope (optional)

<!-- What this PR explicitly does not do -->
