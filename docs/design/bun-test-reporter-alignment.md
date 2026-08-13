# Bun test reporter alignment

**Upstream source:** [Bun test reporters](https://bun.com/docs/test/reporters).
This maps every upstream code example to the Factory library template; it does
not turn optional reporters into required template infrastructure.

For coverage configuration and report artifacts, see
[`bun-test-coverage-alignment.md`](bun-test-coverage-alignment.md).

| Upstream example / capability                              | Template mapping                            | Decision                                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default console reporter                                   | `bun test`                                  | Kept as the normal developer path.                                                                                                                                    |
| Non-colour console fallback                                | Bun terminal behaviour                      | No template code required.                                                                                                                                            |
| `bun test --dots` / `--reporter=dots`                      | `bun run test:dots`                         | Exposed for compact large-suite output.                                                                                                                               |
| `bun test --reporter=junit --reporter-outfile=./junit.xml` | `bun run test:junit` → `reports/junit.xml`  | Kept as an explicit reporting command so local `bun test` remains clean.                                                                                              |
| `[test.reporter] junit = "path/to/junit.xml"`              | `[test.reporter]` intentionally unset       | Deliberate: a global report would run on every normal test command and duplicate the explicit JUnit path.                                                             |
| JUnit `ci`, `commit`, `hostname` environment fields        | `run-test-junit.ts`, then `junit-enrich.ts` | Bun owns the native fields. Active Bun 1.3.14 writes `ci`/`commit` as properties and hostname as a testsuite attribute; consumers should accept either hostname form. |
| GitHub Actions annotations                                 | Bun automatic behaviour                     | No workflow or template-specific configuration required.                                                                                                              |
| Inspector TestReporter / LifecycleReporter                 | Not configured                              | Advanced live telemetry is consumer-specific; it is not a JUnit replacement.                                                                                          |

## Executable-example and event map

| Upstream code / event                                      | Local mapping                                   | Boundary                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `bun test --dots` / `bun test --reporter=dots`             | `bun run test:dots`                             | The compact reporter is opt-in; its full failure details remain Bun-owned.                      |
| `bun test --reporter=junit --reporter-outfile=./junit.xml` | `bun run test:junit` writes `reports/junit.xml` | Console output remains available and XML is written after the test run.                         |
| `[test.reporter] junit = "path/to/junit.xml"`              | Deliberately unset in `bunfig.toml`             | A globally configured reporter would create an artifact for every normal developer run.         |
| `TestReporter.found`, `.start`, `.end`                     | No template listener                            | Consumer-specific live discovery/execution telemetry.                                           |
| `Console.messageAdded`                                     | No template listener                            | Console remains the diagnostic source; JUnit intentionally omits per-test stdout/stderr.        |
| `LifecycleReporter.error`                                  | No template listener                            | Consumer-specific error/exception telemetry; not a replacement for Bun's normal failure output. |

The template does not parse Bun's default console output. Bun selects its
readable Unicode form or ASCII fallback based on terminal capabilities; this
keeps output formatting and accessibility behavior owned by the runtime.

## Native JUnit environment map

| Bun property | Accepted upstream inputs                                                | Template handling                                                                                                         |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ci`         | `GITHUB_RUN_ID`, `GITHUB_SERVER_URL`, `GITHUB_REPOSITORY`, `CI_JOB_URL` | Passed through unchanged. The template never fabricates local CI fields; Bun omits the property when no CI source exists. |
| `commit`     | `GITHUB_SHA`, `CI_COMMIT_SHA`, `GIT_SHA`                                | CI aliases pass through unchanged. A real local Git `HEAD` is supplied as `GIT_SHA`; otherwise Bun omits the property.    |
| `hostname`   | System hostname                                                         | Bun supplies it; active Bun 1.3.14 writes `testsuite@hostname` rather than a property element.                            |

## Reporter limits retained in template guidance

Bun's JUnit output does not include individual test stdout/stderr or precise
per-test-case timestamps. The template keeps console output for diagnostics; the
XML is a CI interchange artifact, not a full event stream.
