# Bun test flags × FactoryWager scripts

<!-- REF:ID 0.1.bun-test-flags -->

<a id="0.1.bun-test-flags"></a>

Operator map of **Bun-native** `bun test` CLI flags and `[test]` bunfig keys
against the **package scripts and wrappers this monorepo actually uses**. Docs
and wiring only — no new contract suite.

**Canonical Bun:** [test](https://bun.com/docs/test) ·
[configuration](https://bun.com/docs/test/configuration) ·
[reporters](https://bun.com/docs/test/reporters) ·
[parallel / isolate](https://bun.com/docs/test/parallel) ·
[`--changed`](https://bun.com/blog/bun-v1.3.13#bun-test-changed) ·
[debugger](https://bun.com/docs/runtime/debugger).

**Repo SSOT:** [`bunfig.toml`](../../../bunfig.toml) `[test]` · root
`package.json` `test:*` · wrappers
[`scripts/bun-test-changed.ts`](../../../scripts/bun-test-changed.ts) ·
[`scripts/bun-test-changed-staged.ts`](../../../scripts/bun-test-changed-staged.ts)
(pre-commit).

Inspector live stream (orthogonal, separate lane): `bun run test:inspect` ·
tenant [`bun-test-inspect.md`](bun-test-inspect.md).

## Precedence

```text
CLI flags  >  bunfig [test]  >  Bun defaults
```

Example: bunfig `timeout = 10000`; `test:ci` passes `--timeout=30000` → **30s**.

Clear parent `BUN_OPTIONS` in wrappers/hooks so a shell cannot inject `--hot` /
`--inspect` into `bun test` argv (see `bun-test-changed-staged.ts`).

## bunfig `[test]` (project)

| Key                     | Value here                          | Notes                                   |
| ----------------------- | ----------------------------------- | --------------------------------------- |
| `preload`               | `./tests/preload.ts`                | ≡ `--preload`                           |
| `timeout`               | `10000`                             | Per-test ms; CLI overrides              |
| `coverageThreshold`     | `0.8`                               | Used when coverage enabled              |
| `concurrentTestGlob`    | ast-grep integration globs          | Concurrent execution for matching files |
| `pathIgnorePatterns`    | nested products · vendor · docs · … | Discovery prune (not coverage-only)     |
| `[test.reporter] junit` | **unset**                           | CI sets JUnit via CLI (`test:ci`)       |

Not set here (available upstream): `root`, `smol`, `randomize` / `seed`,
`retry`, `rerunEach`, default `coverage = true`. Prefer CLI / focused scripts
when needed (`test:code-quality:smol` uses `bun --smol`).

## CLI flags → script owners

| Flag                                      | Bun role                       | Used by (this repo)                                                                           | Not a default day-loop? |
| ----------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------- |
| _(default console)_                       | Human reporter                 | `test`, `test:dev`, subsets                                                                   | —                       |
| `--dots` / `--reporter=dots`              | Compact pass/fail              | **ad hoc**                                                                                    | yes — no package script |
| `--reporter=junit` + `--reporter-outfile` | CI XML                         | `test:ci` · `test:ci:shard*` → `${JUNIT_OUT:-tmp/junit.xml}`                                  | —                       |
| GitHub Actions annotations                | Auto in GHA                    | Hosted GHA disabled for merge authority; local proof is `bun:ci`                              | —                       |
| `-t` / `--test-name-pattern`              | Filter by name                 | `test:coverage` after exact files · direct focused `bun test` · Cursor metadata “Test Filter” | yes                     |
| `--timeout <ms>`                          | Per-test timeout               | `test:ci*` · `test:parallel` · watch shards (30000)                                           | bunfig default 10000    |
| `--watch`                                 | File / import-graph watch      | `test:dev` · `test:watch*` · `test:changed:watch`                                             | —                       |
| `--changed` / `--changed=REF`             | Import-graph filter            | `test:watch` · `test:changed` wrapper                                                         | —                       |
| `--parallel` / `--parallel=N`             | Worker pool (implies isolate)  | `test:dev` · `test:parallel` · `test:ci:shard:parallel`                                       | —                       |
| `--isolate`                               | Fresh global per file, no pool | `test:isolate` · `test:changed -- --isolate`                                                  | —                       |
| `--shard=M/N`                             | Matrix split                   | `test:shard` · `test:ci:shard*` · watch shard scripts · `SHARD=`                              | —                       |
| `--preload`                               | Preload script                 | via bunfig (not repeated on CLI)                                                              | —                       |
| `--pass-with-no-tests`                    | Exit 0 if selection empty      | most `test:*` scripts                                                                         | —                       |
| `--bail` / `--bail=N`                     | Stop after N failures          | **forwarded** by changed wrappers; **not** a root script default                              | yes — pass through      |
| `--rerun-each=N`                          | Repeat each file               | **ad hoc** flaky hunt                                                                         | yes                     |
| `--coverage`                              | Coverage run                   | root `test:coverage` exact-file wrapper · harness coverage ratchet · monorepo health          | not every `test:ci`     |
| `--update-snapshots` / `-u`               | Snapshot refresh               | `test:snapshots:update` · partner-cli snapshot update                                         | —                       |
| `--inspect` / `--inspect-wait`            | Debugger / TestReporter        | runtime debug · `test:inspect` (Inspector client)                                             | not inside `test:ci`    |

## Day-loop scripts (prefer these)

| Script                                            | Effective Bun shape                                      | When                                                |
| ------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| `bun run test`                                    | `bun test --pass-with-no-tests tests`                    | Full `tests/` tree                                  |
| `bun run test:dev`                                | `--watch --parallel` · `tests`                           | Local iterate                                       |
| `bun run test:watch`                              | `--changed --watch --parallel`                           | Import-graph watch                                  |
| `bun run test:changed`                            | wrapper → `--changed` (+ `--parallel` default)           | Dirty / ref selection                               |
| `bun run test:changed:serial`                     | wrapper `--serial`                                       | Debug race / order                                  |
| `bun run test:parallel`                           | `--parallel --timeout=30000`                             | Throughput                                          |
| `bun run test:isolate`                            | `--isolate --timeout=30000`                              | Global pollution debug                              |
| `bun run test:ci`                                 | `--timeout=30000` · **junit** · all `tests/**/*.test.ts` | Local merge XML                                     |
| `bun run test:ci:report`                          | `test:ci` then `failures:bake`                           | Failures board                                      |
| `bun run test:coverage -- <test-file...> [flags]` | exact files · text + LCOV · `coverage/focused`           | Focused coverage; file selectors must precede flags |
| `SHARD=2/4 bun run test:ci:shard`                 | junit + `--shard`                                        | Matrix                                              |
| `bun run test:ci:shard:parallel`                  | `--parallel=4` + shard + junit                           | Matrix + workers                                    |
| `bun run test:concept`                            | fixed concept-lane files                                 | Concept ownership                                   |

Pre-commit: `scripts/bun-test-changed-staged.ts` (HEAD ∪ staged scratch). Escape
only with `SKIP_TEST_CHANGED=1` **and** reason + local proof in the commit
message.

The bunfig `coverageThreshold = 0.8` remains authoritative during focused
coverage. Bun writes text/LCOV output, then exits non-zero when the selected
graph is below the floor; `test:coverage` preserves that exit code.

## JUnit `<properties>` (env → XML)

Set by Bun when present. Our CI script exports `GIT_SHA` when git is available:

| Env                                                                        | Property   | Script note              |
| -------------------------------------------------------------------------- | ---------- | ------------------------ |
| `GITHUB_RUN_ID` · `GITHUB_SERVER_URL` · `GITHUB_REPOSITORY` · `CI_JOB_URL` | `ci`       | Hosted GHA uncommon here |
| `GITHUB_SHA` · `CI_COMMIT_SHA` · **`GIT_SHA`**                             | `commit`   | `test:ci` sets `GIT_SHA` |
| hostname                                                                   | `hostname` | Automatic                |

JUnit limits (Bun): no per-test stdout/stderr; no precise per-case timestamps.
Use Inspector / console for live output.

## Orthogonal reporting layers

| Need                     | Tool                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Human                    | default console                                                                             |
| CI XML + failures board  | JUnit · `test:ci` · `failures:bake`                                                         |
| Live TestReporter stream | `test:inspect` · Inspector Protocol ([test reporters](https://bun.com/docs/test/reporters)) |
| Shape freeze             | in-process `expect` / snapshots — not a reporter                                            |

## Ad hoc recipes

```bash
# Focus one test by name
bun test tests/console-depth.test.ts -t "bun run - stdin"

# Focus coverage on exact files (the wrapper owns reporters and output)
bun run test:coverage -- tests/model-circuit-contracts.test.ts
bun run test:coverage -- tests/limit-betlog-export.test.ts --test-name-pattern="API"

# Fail fast while iterating a suite
bun test tests/wire-boundary-policy.test.ts --bail=1

# Flaky hunt
bun test tests/foo.test.ts --rerun-each=5

# Compact console
bun test tests/ --dots

# Preview changed selection
bun run test:changed -- --dry-run
```

## Do not

- Treat hosted GitHub Actions annotations as merge authority (local
  `bun run bun:ci`)
- Put machine install keys (`linker`, `cache.dir`) into project bunfig
- Rely on CWD `BUN_OPTIONS` to carry `--inspect` into CI/hooks
- Confuse `--isolate` (test globals) with install `linker = "isolated"`
- Copy placeholder paths such as `src/components/*.test.ts` unless that package
  actually owns them; the root repository currently does not
- Pass `--coverage`, reporter/output overrides, `--watch`, `--changed`, or `-u`
  through `test:coverage`; its typed wrapper owns those semantics and fails
  closed
