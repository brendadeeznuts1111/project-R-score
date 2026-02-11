# Import Boundaries

This repository enforces package import boundaries with:

- `bun run imports:verify`
- `/Users/nolarose/Projects/scripts/verify-package-import-boundaries.ts`

The goal is to keep package type-check scope predictable and avoid accidental coupling to unrelated modules.

## Allowed Roots

Rules are currently enforced for package `src/` imports:

- `packages/business/src/**`
  - may import from:
    - `packages/business/src/**`
    - `lib/docs/**`
- `packages/docs-tools/src/**`
  - may import from:
    - `packages/docs-tools/src/**`
    - `lib/docs/**`
- `packages/package/src/**`
  - may import from:
    - `packages/package/src/**`
    - `lib/docs/**`

Only relative imports are validated by the guard script.

## CI Enforcement

`imports:verify` runs in `.github/workflows/typescript-checks.yml` before type-check jobs.

## Local Usage

Run manually:

```bash
bun run imports:verify
```

## Extending Rules

When a package needs a new dependency root:

1. Update `RULES` in `scripts/verify-package-import-boundaries.ts`.
2. Keep the rule narrow (smallest required root).
3. Run `bun run imports:verify` and `bun run type-check:full`.

## Optional Pre-commit Hook

An optional hook is provided at `.githooks/pre-commit`.

To enable local hooks:

```bash
git config core.hooksPath .githooks
```
