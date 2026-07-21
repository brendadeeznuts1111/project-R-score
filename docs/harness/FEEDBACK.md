# Feedback → ratchet

Turn a repeated correction into the **earliest durable owner** so the next trajectory does not re-learn it in chat.

Upstream: [Turn feedback into infrastructure](https://github.com/lopopolo/harness-engineering/tree/trunk/docs/feedback).

## Template

```markdown
## Lesson

- **Finding:** (what failed / what the agent did wrong)
- **Repair:** (what fixed this instance)
- **Earliest owner:** type | lint | skill | doc-map | script-gate | proof
- **Ratchet:** (concrete check or doc link that blocks recurrence)
- **Keep / revise / drop:** after a fresh rerun
```

## Promote

| Owner | Where |
|-------|--------|
| type | brand / path-bun / parse* |
| lint | `config/eslint/plugin-harness/` · `plugin-bun/` |
| skill | `.agents/skills/<name>/SKILL.md` |
| doc-map | `lib/docs/repo-docs.ts` + SSOT markdown |
| script-gate | `scripts/pre-commit-harness.ts` or named `bun run` |
| proof | `docs/harness/PROOF.md` named path |

Scaffold: `bun run harness:lesson --title="…"`.

## Retained lessons (velocity pass)

### Bun doc-refs re-stage loop

- **Finding:** Commit failed on missing `@see`; agent annotated and re-staged every session.
- **Repair:** Annotate-on-write inside `pre-commit-harness` before check.
- **Earliest owner:** script-gate
- **Ratchet:** `scripts/pre-commit-harness.ts` doc-refs-annotate → doc-refs-check
- **Keep / revise / drop:** keep

### Soft import / prefer / unknown warnings

- **Finding:** `--max-warnings 500` + warn-tier rules made ESLint a false green.
- **Repair:** Burn slices; promote restricted-imports, prefer-bun-env, prefer-import-meta-main, no-unknown-function-param to **error**; `--max-warnings 0`.
- **Earliest owner:** lint
- **Ratchet:** `eslint.bun-native.config.ts` + pre-commit max-warnings 0
- **Keep / revise / drop:** keep

### Affected / type-check fiction

- **Finding:** `build:affected` used Bun `'...'` dependents filter; thin `type-check` missed agent edit surfaces.
- **Repair:** `scripts/affected-workspaces.ts`; widen `tsconfig.check.json` spine includes.
- **Earliest owner:** script-gate + doc-map
- **Ratchet:** package.json scripts + VELOCITY_BASELINE
- **Keep / revise / drop:** keep (lib/docs island ratcheting via `tsconfig.check.json` include)

### Ratchet promote dry-run

- **Finding:** Flipping warn→error without a hit census re-teaches the same burn.
- **Repair:** Before error-tier, run the gate once with `--max-warnings 0` (or equivalent dry-run) and record count + owner.
- **Earliest owner:** lint + FEEDBACK
- **Ratchet:** operating rule in harness-improve skill / this lesson
- **Keep / revise / drop:** keep

### Install journey proof

- **Finding:** Pre-commit green overstated “install works.”
- **Repair:** Named path `install-verify` as `journey`+`deployed`; evidence `bun run proof:install` (CI: repo-hygiene `install:verify:strict`).
- **Earliest owner:** proof
- **Ratchet:** `lib/harness/proof.ts` · `docs/harness/PROOF.md`
- **Keep / revise / drop:** keep

### CI echo-smoke / soft PR checklist

- **Finding:** `ci-smoke.yml` only echoed success; PR template did not require claim→evidence.
- **Repair:** `bun run ci:harness` + `harness-gates.yml`; pre-push `proof:install`; PR template points at PROOF/REVIEW.
- **Earliest owner:** script-gate + doc-map
- **Ratchet:** `scripts/ci-harness.ts` · `.github/workflows/harness-gates.yml` · `.github/pull_request_template.md`
- **Keep / revise / drop:** keep (revised — see CI install overlap)

### Green commit ≠ clean tree (annotate thrash)

- **Finding:** Prettier / doc-refs annotate rewrote worktree after staging; commit exited 0; dirty tree forced amend loops.
- **Repair:** After write tools, fail if staged harness files have unstaged diffs; print `git add …` repair. Annotate stays staged-path-only (no `defaultPaths` fan-out).
- **Earliest owner:** script-gate (pre-commit)
- **Ratchet:** `scripts/pre-commit-harness.ts` → `assertStagedMatchesWorktree`
- **Keep / revise / drop:** keep

### CI install journey overlap

- **Finding:** `ci-smoke` + `repo-hygiene` + `harness-gates` each re-proved install on push — three journeys, low new signal.
- **Repair:** Two tiers — **fast** `repo-hygiene` (`install:verify:strict`) · **full** `harness-gates` (`ci:harness`). `ci-smoke` is `workflow_dispatch` only. Matrix in harness README.
- **Earliest owner:** proof + CI
- **Ratchet:** `.github/workflows/ci-smoke.yml` · `docs/harness/README.md` Setup · `CI_SPINE_SMOKE_TESTS` in `lib/harness/proof.ts`
- **Keep / revise / drop:** keep

### Soft PR claim + unprotected main

- **Finding:** Claim→evidence template was social; `main` had no required checks.
- **Repair:** `check-pr-claim` in harness-gates (warn until 2026-07-28); required checks in AUTHORITY; `ci:harness:fast` for local parity.
- **Earliest owner:** proof + AUTHORITY
- **Ratchet:** `scripts/check-pr-claim.ts` · `.github/workflows/harness-gates.yml` · `docs/harness/AUTHORITY.md`
- **Keep / revise / drop:** keep (flip claim check to error after warn window; dropped standalone `pr-claim.yml` to save a runner install)

### Triple install + hardcoded spine + noisy gates

- **Finding:** `ci:harness` re-ran install and a fixed spine list; brands/install printed pages; `ci-smoke` was a third install path.
- **Repair:** Install owned only by hygiene/pre-push; tests via `test:changed` / `--main-head`; quiet success lines; delete `ci-smoke.yml`.
- **Earliest owner:** script-gate
- **Ratchet:** `scripts/ci-harness.ts` · `scripts/bun-test-changed.ts` · brands `--quiet` · install `--quiet`
- **Keep / revise / drop:** keep

### Full-tree ESLint every PR

- **Finding:** `lint:bun-native:rollout` was ~78% of `ci:harness` wall; quieting logs did not move the bottleneck.
- **Repair:** Default `lint:bun-native:changed` (+ cache); `HARNESS_FULL_LINT` only on main push; ∥ cheap ratchets; skip `test:changed` when change set has no code-like files.
- **Earliest owner:** script-gate
- **Ratchet:** `scripts/lint-bun-native-changed.ts` · `scripts/lib/git-changed.ts` · harness-gates env
- **Keep / revise / drop:** keep

### GHA install × N jobs

- **Finding:** `pr-claim` + `harness-gates` + `repo-hygiene` each paid cold Bun setup/install; claim needed no `node_modules`.
- **Repair:** Fold claim into harness-gates; shared `bun-install-*` Actions cache on harness + hygiene; drop standalone `pr-claim.yml`.
- **Earliest owner:** CI
- **Ratchet:** `.github/workflows/harness-gates.yml` · `.github/workflows/repo-hygiene.yml`
- **Keep / revise / drop:** keep
