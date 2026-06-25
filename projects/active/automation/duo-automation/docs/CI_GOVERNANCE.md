# CI Governance

This document describes the CI governance rules enforced by GitHub Actions workflows.

## Rules

### R-001: ci-skip label for docs-only changes

- `ci-skip` bypasses test jobs only when changes are limited to `docs/**/*.md`, `*.md`, `*.yml`/`*.yaml`, `*.json`, or `*.toml`.
- If non-doc files are changed with `ci-skip`, the workflow fails.

### R-002: force-ci label for draft PRs

- Draft PRs labeled `force-ci` run the full suite even in draft mode.
- Draft PRs without `force-ci` use the quick test workflow.

### R-005: docs-only workflow

- Docs-only PRs run lint-only jobs when configured.
- Tests are skipped with a CI summary note.

## Allow/deny patterns

### Allowed (ci-skip or docs-only)

- `docs/**/*.md`
- `**/*.md`
- `**/*.yaml`
- `**/*.yml`
- `**/*.json`
- `**/*.toml`

### Prohibited (ci-skip never allowed)

- `src/**/*.ts`
- `tests/**/*.test.ts`
- `config/**/*.ts`
- `server/**/*.ts`
- `cli/**/*.ts`

## Workflows

- `test-matrix.yml`: PR-aware matrix with `ci-skip` enforcement.
- `test-draft.yml`: Draft PR quick tests, with `force-ci` override.
- `docs-only.yml`: Docs-only lint workflow.
