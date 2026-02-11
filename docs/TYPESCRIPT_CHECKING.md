# TypeScript Checking Modes

Use these commands depending on the scope you want to validate:

- `bun run type-check`
  - Runs `tsc -b tsconfig.check.json`
  - Focused root app/runtime check.

- `bun run type-check:ci`
  - Runs `tsc -b tsconfig.ci.json`
  - CI-critical references only (fast path).

- `bun run type-check:full`
  - Runs `tsc -b`
  - Root solution build using project references in `tsconfig.json`.

## Config roles

- `tsconfig.base.json`
  - Shared compiler options.

- `tsconfig.check.json`
  - Root check project used by `type-check`.

- `tsconfig.ci.json`
  - Reduced reference graph used by CI.

- `tsconfig.json`
  - Root solution config with references for full build mode.
