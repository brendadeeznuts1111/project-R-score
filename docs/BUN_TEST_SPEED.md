# Bun tests: fast loops, isolation, and sharding

FactoryWager uses Bun's changed-test selection, process isolation, parallel
workers, and CI sharding as separate controls. Speed is useful only after tests
own their state: a worker-safe test must not depend on execution order or mutate
tracked portal and registry artifacts.

Machine install policy (`linker = "isolated"`, global store, and cache location)
lives in `~/.bunfig.toml`. Workspace tests and workflow jobs must not duplicate
install-scoped environment configuration owned by the Factory Bun setup action.

## Local day loop

| Command                                    | Purpose                                                              |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `bun run test:changed`                     | Select tests from the current import graph and run files in parallel |
| `bun run test:changed:watch`               | Re-query git and rerun affected tests                                |
| `bun run test:watch`                       | Native changed/watch/parallel loop                                   |
| `bun run test:changed:serial`              | Diagnose a worker-only failure without parallelism                   |
| `bun run test`                             | Full serial `tests/` suite                                           |
| `bun run test:parallel`                    | Full suite with isolated workers and a 30-second file timeout        |
| `bun run test:ci`                          | Full serial suite with JUnit output                                  |
| `SHARD=2/4 bun run test:ci:shard`          | One serial CI shard                                                  |
| `SHARD=2/4 bun run test:ci:shard:parallel` | One shard with four workers after its files are isolation-clean      |
| `bun run test:inventory`                   | Produce current suite and timing evidence                            |

The changed-test wrapper is
[`scripts/bun-test-changed.ts`](../scripts/bun-test-changed.ts). It exits
cleanly without starting Bun when the change set contains no code-like files.

## State isolation is the first speed feature

Tests must not rewrite tracked files under `public/`. Portal pages, registry
JSON, monitoring snapshots, proof artifacts, and generated indexes are
production outputs, not writable test fixtures.

Writer APIs should accept an explicit output root or a typed map containing
every destination they own. Tests pass paths from a disposable workspace created
through [`tests/harness.ts`](../tests/harness.ts), then assert against that
workspace. Environment changes and local HTTP fixtures use the same explicit
helper boundary so cleanup remains local to the test.

After changing a portal or registry writer test:

```bash
bun test path/to/changed-writer.test.ts
git diff --exit-code -- public/
```

The second command is part of the contract. A green assertion set that leaves
tracked artifacts modified is a failing test design.

Serial execution is not an isolation mechanism. It can temporarily help diagnose
an order-dependent failure, but the fix is to remove shared writable state.

## CI lanes

The [`test-sharded` workflow](../.github/workflows/test-sharded.yml) has two
different confidence levels:

- **Portal and registry isolation** is a small required job. It exercises the
  isolated snapshot/bake path together with fast portal and registry contracts,
  then fails if tracked `public/` artifacts changed.
- **Full-suite shard matrix** runs four serial shards and uploads JUnit
  artifacts. It remains advisory while known crash, hang, and shared-state debt
  is being retired.

Promote the full matrix to required only after repeated CI runs are hang-clean
and every artifact writer in its scope uses disposable destinations. Parallel
workers are a later optimization within each shard, not a prerequisite for
making the matrix required.

## Pre-commit

When staged TypeScript or JavaScript exists, the harness runs:

```bash
bun run test:changed -- --bail=1
```

`SKIP_TEST_CHANGED=1` is an explicit operator escape hatch, not a persistent
test configuration.

## Bun runner controls

```text
--parallel[=N]   distribute files across worker processes; implies isolation
--isolate        give each test file a fresh global object
--shard=M/N      select one deterministic subset for a CI runner
--changed[=REF]  select tests that transitively import changed files
--bail=1         stop after the first failure
--reporter=junit --reporter-outfile=path
```

Pin for the reviewed upstream behavior:
[Bun test tree](https://github.com/oven-sh/bun/tree/b5036bc6a11be1389b5cb50549c407f956df76d3/test)
and
[Bun test README](https://github.com/oven-sh/bun/blob/b5036bc6a11be1389b5cb50549c407f956df76d3/test/README.md).

## Quarantine

Quarantine is only for a whole-file crash or hang that prevents Bun from
reporting ordinary test failures. Do not quarantine assertion failures,
filesystem coupling, timing flakiness, or slow-but-completing tests.

An entry must name the exact file, owner, failure evidence, and removal
condition. Broad directory quarantine is prohibited because it silently removes
unrelated coverage.

## Timing evidence and balanced-shard plans

The inventory retains every per-file result with lane, Bun version, platform,
architecture, timeout, and execution-mode metadata. It can also emit a
deterministic longest-processing-time shard plan:

```bash
bun run test:inventory -- \
  --lane=linux-ci \
  --shards=4 \
  --shard-plan-out=tmp/test-shard-plan.json
```

The complete report is written to `tmp/test-file-report.json`; the optional
shard-plan path contains the stable assignment. Failed and hanging files remain
in the evidence and assignment instead of disappearing from scheduling.

A single observation is not yet a promoted CI baseline. Promotion should use
rolling medians from comparable OS, Bun-version, and serial/parallel lanes, with
a conservative default weight for new files. Until that evidence is collected
and reviewed, the workflow continues to execute Bun's deterministic
`--shard=M/N` selection; generated balanced plans are diagnostic artifacts.

## Runtime capabilities that require no repository configuration

| Capability                              | Ownership                                               |
| --------------------------------------- | ------------------------------------------------------- |
| Streaming install extraction            | Bun runtime default                                     |
| Install linker, global store, and cache | Machine `~/.bunfig.toml` and setup action               |
| Test-file workers and fresh globals     | Bun runner flags                                        |
| Static `Range` / `206` responses        | [`scripts/serve-public.ts`](../scripts/serve-public.ts) |

Small focused suites may be faster serially because worker startup has a fixed
cost. Use timing evidence to choose worker count; do not trade away isolation or
required coverage for a synthetic wall-time win.
