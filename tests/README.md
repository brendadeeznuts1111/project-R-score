# FactoryWager Bun test map

FactoryWager tests use [`bun:test`](https://bun.com/docs/test) and follow Bun's
upstream harness pattern: keep global preload behavior minimal, import test
utilities explicitly, isolate filesystem and environment state, and run the
smallest relevant lane during development.

## Test layout

| Location or pattern          | Purpose                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `tests/*.test.ts`            | Unit, contract, integration, and artifact tests grouped by owning subsystem                       |
| `tests/journey/`             | Multi-step operator and tenant journeys                                                           |
| `tests/toc-ops/`             | TOC operations fixtures and focused suites                                                        |
| `tests/fixtures/`            | Checked-in immutable inputs; never use tracked production artifacts as writable fixtures          |
| `tests/__snapshots__/`       | Reviewed `bun:test` snapshots                                                                     |
| `tests/preload.ts`           | Minimal process-wide environment normalization                                                    |
| `tests/harness.ts`           | Explicitly imported databases, temporary workspaces, scoped environment, and local server helpers |
| `tests/limit-quarantine.txt` | Limit-lane crash/hang quarantine metadata                                                         |

Test files stay near the public contract they prove. Add regression coverage to
the existing owning test file when one exists. Use `tests/regression/` only for
a demonstrated numbered upstream or production regression.

## Day-loop commands

```bash
# Import-graph-selected tests for the current change
bun run test:changed

# Re-query git and rerun affected tests
bun run test:changed:watch

# Full reliable suite
bun run test

# Full worker-isolated suite while parallel debt is being retired
bun run test:parallel

# CI-compatible serial run with JUnit output
bun run test:ci

# One CI shard
SHARD=2/4 JUNIT_OUT=tmp/junit-2.xml bun run test:ci:shard

# Inventory test files and timing evidence
bun run test:inventory
```

Run a focused file directly while iterating:

```bash
bun test tests/portal-weave.test.ts
bun test tests/registry-contracts.test.ts
```

The test speed and CI model are documented in
[`docs/BUN_TEST_SPEED.md`](../docs/BUN_TEST_SPEED.md).

## Isolation contract

Tests must not rewrite tracked files under `public/`, including portal pages,
registry JSON, generated proofs, or monitoring artifacts. A passing assertion is
not sufficient if the test leaves the source tree dirty.

- Give artifact builders an explicit output root or complete output map.
- Create disposable directories through helpers from `tests/harness.ts`.
- Pass temporary paths to snapshot, bake, database, and report writers.
- Restore environment mutations with the scoped environment helper.
- Start local HTTP fixtures on an ephemeral port and close them in test cleanup.
- Keep immutable checked-in artifacts read-only; copy them into a temporary
  workspace before testing mutations.
- After changing a writer test, run it and verify
  `git diff --exit-code -- public/`.

Do not hide filesystem coupling with serial execution. Isolation is what makes
`--parallel`, local reruns, and CI sharding deterministic.

## Shared harness policy

`tests/preload.ts` is deliberately small. Reusable stateful behavior belongs in
`tests/harness.ts` and must be imported by the test that owns its lifecycle.
This keeps dependencies visible and allows cleanup to occur in the same scope as
setup.

Prefer shared helpers for:

- in-memory test databases and canonical seed data;
- disposable filesystem workspaces;
- scoped process environment changes;
- local JSON/HTTP fixtures;
- stable platform and terminal capability checks.

Add a helper only when at least two tests share the lifecycle or when the helper
enforces an isolation boundary that would otherwise be easy to miss.

## Quarantine policy

Quarantine is reserved for a whole-file crash or hang that prevents the runner
from reporting ordinary failures. Assertion failures, flaky data, environment
coupling, and slow tests are defects to fix, not reasons to quarantine a file.

Every quarantine entry must identify an owner, a concrete failure, and an expiry
or removal condition. Keep the narrowest affected file quarantined; never
quarantine a directory or broad subsystem.

## Writing tests

- Import `describe`, `test`, and `expect` from `bun:test`.
- Name tests after observable behavior.
- Prefer deterministic fixtures and fixed clocks over timing sleeps.
- Use `test.each` for repeated contracts.
- Use `expect.hasAssertions()` when callbacks or branches might skip assertions.
- Use `@ts-expect-error` for an intentional type failure; avoid broad
  suppression.
- Close servers, databases, timers, and subprocesses in `afterEach`, `afterAll`,
  `using`, or the shared harness cleanup mechanism.
- Add canonical Bun references when a test introduces a new `Bun.*` API.

Upstream references are pinned to the reviewed Bun revision:
[test README](https://github.com/oven-sh/bun/blob/b5036bc6a11be1389b5cb50549c407f956df76d3/test/README.md),
[test harness](https://github.com/oven-sh/bun/blob/b5036bc6a11be1389b5cb50549c407f956df76d3/test/harness.ts),
and
[test configuration](https://github.com/oven-sh/bun/blob/b5036bc6a11be1389b5cb50549c407f956df76d3/test/bunfig.toml).

## Partner-limit lane

The limit suite covers account-limit persistence, multi-factor patterns,
prediction, reports, UI surfaces, and the agent API.

```bash
# High-level E2E pipeline and formatting contract
bun test tests/limits-e2e.test.ts tests/table-format.test.ts

# Focused pattern, prediction, report, API, and UI coverage
bun test \
  tests/account-limits-repo.test.ts \
  tests/limit-patterns.test.ts \
  tests/limit-prediction-report.test.ts \
  tests/limit-raise-agent-api.test.ts \
  tests/limit-raise-report.test.ts \
  tests/limit-raises-ui.test.ts \
  tests/limit-slice.test.ts
```

See
[`docs/harness/tenants/partner-limits.md`](../docs/harness/tenants/partner-limits.md)
for the owned artifact and operator flow.
