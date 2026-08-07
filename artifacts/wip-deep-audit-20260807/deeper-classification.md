# Deeper WIP classification — 2026-08-07T10:15Z

Second pass: `git cherry` alone overstates uniqueness. Tree-level 2-dot diffs vs `origin/main` decide promote vs drop.

## Partner-integration (was heavy rebase candidate)

- Branch: `codex/partner-integration-observations-20260806` (19 cherry-unique commits)
- Rebase onto main: **blocked** at 1/19 on `packages/partners/*`
- Tree verdict: **DROP / superseded**
  - `packages/partners/src/adapters/*` 2-dot vs main: empty (already landed)
  - Tip is *behind* main on partners (missing connector-freshness, etc.)
  - Tip still carries retired skills deleted in #577
- Action: do not rebase; leave remote branch for archaeology; prune worktree when idle

## Cherry-equivalent tips (unique+ = 0)

Already patch-equivalent on main — safe to drop worktrees when clean:

- `codex/enhanced-ci-ssot-20260806`
- `codex/fix-capability-table-20260806`
- `docs/bun-types-pipeline`
- `feat/bun-docs-parser-options-2`
- `feat/bun-strip-unknown`
- `feat/bun-types-flags-cols`
- `feat/bun-types-ref-href`
- `feat/bun-types-status`
- `feat/doc-refid-placement`
- `feat/github-global-constants`
- `feat/partner-domain-lint-precommit`
- `feat/partner-inventory-precommit`
- `feat/partner-inventory-registry-tighten`
- `feat/partner-surface-bags`
- `feat/partner-surface-fitness`
- `feat/partner-surface-outs`
- `feat/refid-extend-write-hrefs`
- `feat/refid-project-coverage`
- `feat/theme-token-wiring`

## Cherry-unique but tree-behind (main evolved past tip)

Do **not** rebase — tip would delete/regress main content:

- `feat/partner-brand-lifecycle` — tip smaller inventory/brand-check than main
- `feat/partner-wire-lint-generic` — tip smaller `validate-wire-traps.ts`
- `feat/partner-surface-*` inventory docs/deeper/layer-d — files exist on main; tip behind
- `codex/bun-release-contracts-hardened-20260806` — package 2-dot empty vs main
- `codex/partner-cli-snapshot-ci-20260806` — tip shrinks AUTHORITY.md vs main

## Promote this pass

- `fix/wiki-links-agents-20260807` — `wiki-link-check --fix` rewrote 20 AGENTS.md / docs/AGENTS.md blob URLs; restores `bun:ci` wiki-links gate
