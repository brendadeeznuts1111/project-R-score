# Changelog

All notable FactoryWager artifact changes are recorded here.

## [5.3.0] - 2026-07-28

### Features

- Add the evidence-backed Bun API → wrapper/consumer → branded value → project →
  runtime proof contract and deterministic registry bake.
- Extend `/portal/brands/` with accessible Relationships, Glossary, and Projects
  views, focused graph navigation, equivalent tables, filters, and shareable
  fragment state.
- Govern all 50 canonical branded values and 32 tracked projects while keeping
  three external roots explicit.

### Governance

- Baseline 293 legacy observed-but-undeclared Bun uses as visible warnings while
  failing new staged and PR-diff regressions.
- Run project-only branded-ID additions through local and PR gates.
- Block invalid declarations, catalog conflicts, stale sources, expired
  experimental approvals, and missing or failed production proof.

### Verification

- Correct `Bun.Image` introduction to Bun 1.3.14 from the canonical token
  catalog.
- Add contract, AST detection, proof-join, baseline, portal, health, ops, and
  release-version tests.
- Restore clean `type-check:ci` and `type-check:full` builds under Bun's
  isolated linker by preserving package symlink resolution and repairing the
  remaining package-local type errors.
