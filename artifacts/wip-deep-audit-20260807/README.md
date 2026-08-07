# Deep WIP audit report — 2026-08-07

## Gate results (error floor)

| Plane | Exit | Notes |
| ----- | ---- | ----- |
| lane:status --json | 0 | Fixed via fix/lane-status-tdz-20260807 |
| reference:discover:check | 0 | INFO similar-env noise only |
| public:audit:verify | 0 | 2 orphan-registry INFO; portal static OK |
| discover:compose:check | 0 | 85 findings; harness errors=0 warnings=2 |
| audit:verify | 0 | 4 findings · 5 concepts |
| audit:packages:json | 0 | score 100 / grade healthy |
| ops:audit:deep | 0 | ZIP/bookmaker scoreboard produced |

## Owned-elsewhere failures (not this session)

- `tests/brands-portal.test.ts` — brand-keymap.json missing `glossary` key (shape drift)
- `tests/partner-surface-inventory.test.ts` — `lib/partner-profile/README.md` missing `<!-- REF:ID 0.1.partner-profile-readme -->`

## Artifacts

- `lane-status.json`
- `classification.md` / `classification.json`
- per-plane `*.out` / `*.txt`

## Promote this session

1. **promote**: `fix/lane-status-tdz-20260807` (TDZ fix)
2. **rebase-then-rejudge lead**: `codex/partner-integration-observations-20260806` (19 ahead / 61 behind)
==== conflict note ====

## Rebase attempt — partner-integration

- Branch: `codex/partner-integration-observations-20260806` (19 unique commits)
- Attempt: `codex/partner-integration-rebase-20260807` onto `origin/main`
- Result: **blocked** at 1/19 (`207213e81 feat(partners): parse integration observations`)
- Conflicts: `packages/partners/package.json`, `packages/partners/src/adapters/index.ts`, `packages/partners/src/adapters/limit-changes.ts`
- Action: rebase aborted; lane kept as **rebase-then-rejudge** for a dedicated partners session

## Review — lane-status promote

- Bugbot: no bugs
- Security-review: no medium+ findings
- Proceeding to PR + squash-merge

## bun:ci note (lane-status PR)

`bun run bun:ci` failed at `ci:core` → `wiki-links` (`bun tools/wiki-link-check.ts` exit 1).
Same failure on clean `main` / primary (20 AGENTS.md github-blob wiki links flagged).
Not introduced by `tools/lane-status.ts`. Claim-scoped proof + Bugbot/security clean → merge.

## Merged

- [#578](https://github.com/brendadeeznuts1111/project-R-score/pull/578) `fc12977e` — fix(tools): resolve lane-status argv TDZ
- Worktree pruned; primary synced to origin/main

## Deeper pass (pass 2)

- Tree-level audit: partner-integration **superseded** (no unique adapter content; tip behind main).
- 19 cherry-unique tips reclassified via 2-dot diffs — most tree-behind or cherry-equivalent.
- Merged [#579](https://github.com/brendadeeznuts1111/project-R-score/pull/579) wiki-links fix → `1704f5faf`.
- Pruned **22** clean superseded worktrees; skipped 2 dirty (`refid-contract-help`, `bun-release-contracts-enhance`).
- Remaining worktrees: 3 dirty + primary (foreign dirt untouched).
- See `deeper-classification.md` · `prune-log.md`.
