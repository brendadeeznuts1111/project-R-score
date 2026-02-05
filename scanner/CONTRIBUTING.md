# Contributing

## Prerequisites

- [Bun](https://bun.sh) v1.2+

## Setup

```bash
git clone git@github.com:brendadeeznuts1111/security-scanner-api.git
cd security-scanner-api
```

No `bun install` needed — the scanner has zero runtime dependencies.

## Running

```bash
bun run scan.ts              # default table view
bun run scan.ts --audit      # full audit
bun run scan.ts --help       # all flags
```

## Tests

```bash
bun test                              # all test files
bun test scan.test.ts                 # main scanner tests only
bun test cli/renderers/               # renderer tests only
bun test optimizations/               # runtime optimization tests
```

All tests must pass before submitting a PR.

## Code Style

- **No external dependencies** — uses Bun built-ins (`Bun.file`, `Bun.spawn`, `Bun.hash`, `Bun.secrets`)
- **Type safety** — use `createProjectContext()` for typed `ProjectInfo`, avoid `as any` casts
- **Runtime patterns** — see `.cursor/rules/bun-runtime-patterns.mdc` for optimization patterns
- **ANSI colors** — via the `c` helper object, no chalk/picocolors
- **`--dry-run` support** — for every `--fix-*` command
- **Observability over enforcement** — show information, don't force decisions

## Linting

```bash
bun run lint          # Check for linting errors
bun run lint:fix       # Auto-fix linting issues
```

ESLint is configured with comprehensive TypeScript rules:

- **Naming conventions**: Exported SCREAMING*SNAKE_CASE constants must start with `BUN*` prefix
- **Custom Bun rules**: `bun/require-bun-prefix` warns when Bun-related constants (API, R2, S3, COOKIE, etc.) don't have
  `BUN_` prefix
- **Type safety**: Warns on `any`, unsafe assignments, and missing type assertions
- **Code quality**: Enforces nullish coalescing (`??`), optional chaining, and proper async/await usage
- **Best practices**: Prefers interfaces over types, enforces type imports, and checks for unused variables

Test files (`*.test.ts`, `*.spec.ts`) have relaxed rules to allow more flexible test code.

See `eslint.config.mjs` for the full configuration. Custom rules are defined in `eslint-plugin-bun.js`.

## Type Safety Patterns

```typescript
// ❌ BAD - Using as any
const service = projectTokenService(projectInfo as any);

// ✅ GOOD - Use createProjectContext
const projectContext = createProjectContext(projectId);
const service = projectTokenService(projectContext.projectInfo);
```

## Adding a new `--fix-*` command

1. Add the flag to `parseArgs` options in `src/scan.ts`
2. Add the fix handler after existing fix blocks (search for `flags["fix-`)
3. Support `--dry-run` — preview changes without writing
4. Add relevant fields to the `ProjectInfo` interface if scanning new data
5. Surface the new data in `--inspect` and `--audit` output
6. Add tests to `scan.test.ts`
7. Update `--help` text and `README.md`

## Adding a new audit section

1. Add fields to `ProjectInfo` interface
2. Set defaults in `scanProject`
3. Parse the data during project scanning
4. Add display logic in the audit block
5. Add to `--inspect` output
6. Add tests

## Commit messages

Follow conventional commits:

```
feat: add cookie session management
fix: correct projectId resolution with FW_PROJECT_ID fallback
docs: update README with cookie session commands
refactor: remove as any casts in scan.ts
```
