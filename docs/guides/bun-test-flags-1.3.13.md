# bun test flags (v1.3.13 NOTE)

FactoryWager curated NOTE for the Bun v1.3.13 ship notes: `--isolate`, `--parallel`, `--shard`, `--changed`.

Upstream blog remains the **ship-note SSOT** (we do not edit bun.com): [bun-v1.3.13](https://bun.com/blog/bun-v1.3.13).  
Resolve tokens: `bun tools/bun-doc-refs.ts suggest "--isolate"`.

> **Harness polish** — FactoryWager exercises these flags in the local [day-loop](../harness/day-loop.md) (`test:isolate`, `test:parallel`, `test:shard`, `test:changed`). That pipeline is **not** Bun upstream CI and is **not** published at `bun.com/docs/dev/…`. Audit concepts (e.g. Nagata fiber) live in the sibling [audit SSOT](../audit/concepts/) and must not be conflated with test-worker scheduling.

## On this page

- [Isolated tests (`--isolate`)](#isolated-tests---isolate)
- [Parallel test execution (`--parallel`)](#parallel-test-execution---parallel)
- [Sharding across CI (`--shard`)](#sharding-across-ci---shard)
- [Run only changed tests (`--changed`)](#run-only-changed-tests---changed)
- [Disambiguation: `bun run --parallel`](#disambiguation-bun-run---parallel)
- [FactoryWager day-loop wrappers](#factorywager-day-loop-wrappers)

## Isolated tests (`--isolate`)

> **Curated note** — Validated in FactoryWager’s [harness day-loop](../harness/day-loop.md) via `bun run test:isolate`. Fresh globals between files are the isolation guarantee; workers imply the same when using `--parallel`.

Each test file runs in a fresh global environment in the same process. Between files Bun drains microtasks, closes sockets, cancels timers, kills subprocesses, and creates a clean global. A VM-level transpilation cache keeps shared deps parsed once.

```bash
# Run tests with isolation (fresh global per file)
bun test --isolate ./tests
```

See docs / catalog: `bun tools/bun-doc-refs.ts suggest "bun test --isolate"`  
Ship note: [blog `#bun-test-isolate-and-bun-test-parallel`](https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel)

## Parallel test execution (`--parallel`)

> **Curated note** — Day-loop wrapper: `bun run test:parallel`. Expect per-file console flush, worker env `JEST_WORKER_ID` / `BUN_TEST_WORKER_ID`, and auto `--isolate`. This is **not** proven by the Nagata fiber audit finding (sibling SSOT — algebraic demo, unrelated to job stealing).

`--parallel[=N]` distributes test files across up to N worker processes (default: CPU count). Files are partitioned for cache locality; idle workers steal work. Workers automatically run with `--isolate` between files. Console output is buffered and flushed atomically so files never interleave. Sets `JEST_WORKER_ID` and `BUN_TEST_WORKER_ID`.

```bash
# Run tests in parallel across all CPU cores
bun test --parallel ./tests

# Run tests in parallel with 8 workers
bun test --parallel=8 ./tests
```

> **Not the same as `bun run --parallel`.**  
> `bun test --parallel` = test-file workers (this section).  
> `bun run --parallel` = workspace Foreman script runner — see [parallel and sequential mode](https://bun.com/docs/pm/filter#parallel-and-sequential-mode).

See docs / catalog: `bun tools/bun-doc-refs.ts suggest "bun test --parallel"`  
Ship note: [blog `#bun-test-isolate-and-bun-test-parallel`](https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel)

## Sharding across CI (`--shard`)

> **Curated note** — Day-loop: `SHARD=1/3 bun run test:shard`. Empty shards exit 0; compose with `--changed` after the import-graph filter.

`--shard=M/N` splits test files across CI runners (1-based, sorted paths, round-robin). Empty shards exit 0. Composes with `--changed` (shard after filter) and `--randomize` (shuffle within shard).

```bash
# In a GitHub Actions matrix with 3 jobs:
bun test --shard=1/3
bun test --shard=2/3
bun test --shard=3/3
```

See docs / catalog: `bun tools/bun-doc-refs.ts suggest "bun test --shard"`  
Ship note: [blog `#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs`](https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs)

## Run only changed tests (`--changed`)

> **Curated note** — Day-loop: `bun run test:changed` / `test:changed:main`. Import-graph filter over the dirty tree (or vs main); pairs with `--watch` for re-filter on restart.

`--changed[=ref]` runs only tests whose import graph transitively depends on git-changed files (dirty tree, or since a commit/branch). Combines with `--watch`.

```bash
# Uncommitted changes (unstaged + staged + untracked)
bun test --changed

# Since a commit / branch
bun test --changed=HEAD~1
bun test --changed=main

# Re-filter on every restart
bun test --changed --watch
```

See docs / catalog: `bun tools/bun-doc-refs.ts suggest "bun test --changed"`  
Ship note: [blog `#bun-test-changed`](https://bun.com/blog/bun-v1.3.13#bun-test-changed)

## Disambiguation: `bun run --parallel`

```bash
# Workspace scripts (Foreman-style prefixes) — NOT bun test workers
bun run --parallel build test
bun run --parallel --filter '*' lint
```

Canonical docs: [pm/filter#parallel-and-sequential-mode](https://bun.com/docs/pm/filter#parallel-and-sequential-mode)  
Suggest: `bun tools/bun-doc-refs.ts suggest "bun run --parallel"`

## FactoryWager day-loop wrappers

Package scripts that wrap the above for the day loop: [`docs/harness/day-loop.md`](../harness/day-loop.md) · claim-adjacent concept `harness-day-loop` via `bun tools/bun-doc-refs.ts suggest "harness day-loop"`.

Tested continuously by FactoryWager’s harness day-loop pipeline (local + CI-adjacent), not Bun’s published docs tree. Platform row: [`BUN_NATIVE_CAPABILITIES.md`](../BUN_NATIVE_CAPABILITIES.md).
