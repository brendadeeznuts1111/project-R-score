# Bun test coverage alignment

**Upstream source:**
[Bun code coverage](https://bun.com/docs/test/code-coverage). The template
exposes useful coverage modes without baking a project-specific threshold, CI
provider, token, or excluded-source policy into every library.

| Upstream capability / example                   | Template mapping                                       | Decision                                                                             |
| ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `bun test --coverage`                           | `bun run test:coverage`                                | Explicit text report; normal tests stay fast and readable.                           |
| `[test] coverage = true`                        | Unset                                                  | Do not make coverage the default developer loop.                                     |
| Simple or detailed `coverageThreshold`          | Unset                                                  | A threshold needs a measured, reviewed consumer baseline.                            |
| `coverageReporter = ["text", "lcov"]`           | `bun run test:coverage:lcov`                           | Opt-in text-plus-LCOV run; it retains terminal text and writes `coverage/lcov.info`. |
| `coverageDir`                                   | Unset                                                  | Bun default `coverage/`; it is ignored by the template.                              |
| `coverageSkipTestFiles = true`                  | Set in `bunfig.toml`                                   | Avoid test files inflating the library-source denominator.                           |
| `coveragePathIgnorePatterns`                    | Unset                                                  | No source paths are hidden at scaffold time.                                         |
| `coverageIgnoreSourcemaps`                      | Unset                                                  | Preserve Bun's source-map-aware default.                                             |
| `bun test --coverage <test filter>`             | `bun run test:coverage -- ./test/index.test.ts`        | Use explicit path filters for portable targeted runs.                                |
| `bun test --coverage --test-name-pattern="API"` | `bun run test:coverage -- --test-name-pattern="hello"` | Bun regex name filtering passes through unchanged.                                   |
| GitHub Actions / Codecov example                | Not configured                                         | CI provider and upload credentials are consumer-owned.                               |

`test:ci` remains JUnit plus text coverage. LCOV is intentionally a separate
command so a consumer decides when it needs a persistent coverage artifact.
JUnit records test outcomes and run metadata; it does not carry coverage
percentages, so consumers that need machine-readable coverage use LCOV.

## Execution and evidence boundary

| Upstream example / behavior                     | Template mapping                                       | Guardrail                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `bun test --coverage --coverage-reporter=lcov`  | `bun run test:coverage:lcov`                           | Writes `coverage/lcov.info` while retaining text output.                                                                    |
| `bun test --coverage src/components/*.test.ts`  | `bun run test:coverage -- ./test/index.test.ts`        | Target paths pass through; shell glob expansion remains shell-owned, so the documented portable form uses an explicit path. |
| `bun test --coverage --test-name-pattern="API"` | `bun run test:coverage -- --test-name-pattern="hello"` | Regex filtering passes through unchanged after `--`.                                                                        |
| `coveragePathIgnorePatterns` examples           | Unset                                                  | Do not improve a starter’s percentage by excluding source.                                                                  |
| `coverageThreshold` examples                    | Unset                                                  | A threshold is a consumer decision after a measured baseline, not a template default.                                       |
| CI upload examples                              | Unset                                                  | Provider, token, and artifact retention are consumer-owned.                                                                 |

Coverage only accounts for source that the test run loads. A missing row can
mean an unimported module rather than complete coverage, and a high percentage
is therefore not a model-, release-, or correctness-quality signal by itself.
The template treats coverage as evidence to inspect alongside assertions, types,
and focused integration tests; it never parses the human text table as a release
decision.
