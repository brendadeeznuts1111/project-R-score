# Bun-native library

This is a small, test-first starting point for a library consumed by Bun.

## First five minutes

1. Set the package `description` and confirm the generated `name` in
   `package.json`.
2. Replace the `hello` example in `src/index.ts` with the public API.
3. Update the matching tests in `test/index.test.ts`.
4. Run the local proof:

```bash
bun run check
bun pm pack --dry-run
```

`exports`, `module`, and `types` intentionally point at TypeScript source: this
is a Bun-native template, not a precompiled Node/browser distribution. The
type-checking baseline follows `bun init`'s modern no-emit, bundler-resolution
defaults. Keep the public API at `src/index.ts` unless you deliberately
introduce a build-and-declaration pipeline. `typecheck` covers `src/`, `test/`,
and template scripts; the package allowlist still publishes only the source
entry point and README.

## Scaffold from the monorepo

Run this from the FactoryWager monorepo root, where
`.bun-create/factory-library` is available. Bun names the new package from the
destination directory.

```bash
# Preferred: the Factory wrapper provides consistent local-template routing.
bun run factory:create -- factory-library ./packages/my-library

# Direct Bun route: equivalent when run from the monorepo root.
bun create factory-library ./packages/my-library
```

`bun create` initializes Git and installs dependencies by default. Use Bun's
documented create flags only when needed; inspect them on the active runtime
with `bun create --help`. `--no-install` leaves out `node_modules`, `bun.lock`,
and the Git repository when paired with `--no-git`; the local-template hook only
prints next steps, so this remains a dependency-free scaffold path. The
destination must be disposable: local templates replace it whether or not
`--force` is present; `--force` is Bun's remote-template overwrite override. The
Factory wrapper requires an explicit destination for this repository-local
template, so it never delegates to Bun's implicit local destination. It also
refuses an existing target until `--replace-local` makes the destructive action
explicit, and never accepts the current directory as that target.

On Bun 1.3.14, `--no-install` skips this template's `preinstall` status message
but still runs its dependency-free `postinstall` next steps. Do not put required
setup in either hook; use `bun run check` after installation instead.

## Development

```bash
bun install
bun dev                 # re-runs src/index.ts when source changes; retains terminal output
bun test
bun run test:dots       # compact dots reporter; full errors still print on failure
bun run test:watch      # re-runs the test suite when files change; retains terminal output
bun run test:coverage
bun run test:coverage:lcov # keeps text output and writes coverage/lcov.info
bun run test:junit      # writes reports/junit.xml with Bun's CI/commit properties
bun run test:ci         # JUnit + coverage, then enriches the report
bun run junit:enrich    # adds Factory metadata to that report; safe to re-run
bun run typecheck
bun run build
bun run build:metafile # writes metafiles plus a machine-readable build summary
bun run generate:files # refreshes the tracked project file index
bun run check:files    # validates files.md and package.json.files against the source tree
bun run check           # file index + typecheck + test + build
bun run prepack         # same checks run automatically before Bun packs/publishes this directory
bun run publish:dry-run # Bun-native publish simulation; never uploads
bun run bench          # Bun.nanoseconds throughput JSON
bun run profile:cpu    # same workload under --cpu-prof → ./profiles/*.cpuprofile
```

### JUnit metadata

`bun test` uses Bun's readable console reporter by default; `test:dots` is the
compact alternative for large suites. `test:junit` opts into Bun's JUnit XML
reporter for that one run, writes `reports/junit.xml` at the end, and leaves the
console output available to the operator. `bunfig.toml` intentionally does not
configure `[test.reporter]`, so ordinary local test commands do not create
reports. Before each JUnit run, the script clears the prior XML/context pair; a
failed test run therefore cannot be mistaken for a current report.

Bun emits its own `ci` and `commit` properties when their inputs are available.
On the verified Bun 1.3.14 runtime, it writes the system hostname as a
`testsuite` attribute; consumers should accept either that attribute or a
`hostname` property. It never needs a post-processing script for those fields.
`test:junit` resolves one complete, secret-free context and writes it to
`reports/junit-context.json`; `junit:enrich` reuses it, so one `test:ci` run
cannot emit mismatched provenance. The scripts never invent `unknown`, a fake
`local` server, a timestamped run ID, or a `detached` branch value. A field
whose source is absent is omitted; its companion `*_source` property records
why. `junit:enrich` adds separate research metadata without replacing Bun's
native values: required `package`, `package_version`, `project`, and
`generated_at`, plus `report_context`, `commit_source`, `branch_source`,
`repository_source`, and `run_id_source`. `branch`, `repository`, and `run_id`
appear only when real values exist. In CI, existing environment values win;
locally, an available Git commit is supplied through `GIT_SHA` and other Git
metadata is reported with its real source.

### Environment variables (optional)

| Variable                   | Used by                                                  | Missing-value behavior                                                                        |
| -------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `GITHUB_SHA`               | Bun JUnit `commit` property                              | A real Git `HEAD` is passed as `GIT_SHA`; otherwise the native property is omitted.           |
| `GITHUB_RUN_ID`            | Bun JUnit `ci` property and enrichment `run_id`          | Omitted; `run_id_source=unavailable` records the absence.                                     |
| `GITHUB_SERVER_URL`        | Bun JUnit `ci` property                                  | Omitted; no local server URL is invented.                                                     |
| `GITHUB_REPOSITORY`        | Bun JUnit `ci` property and enrichment `repository`      | A recognized Git remote may enrich `repository`; the native CI property is never synthesized. |
| `CI_JOB_URL`               | Bun JUnit `ci` property                                  | passed through when supplied by a non-GitHub CI system                                        |
| `CI_COMMIT_SHA`, `GIT_SHA` | Bun JUnit `commit` property                              | passed through when supplied by CI; Git `HEAD` is used only when all commit inputs are absent |
| `PROJECT_NAME`             | Enrichment `project` property                            | generated package name                                                                        |
| `BUN_CREATE_DIR`           | Bun/Factory local-template discovery, before scaffolding | Bun's global `.bun-create` path; not read by the generated library                            |
| `NPM_CLIENT`               | Bun npm-template route, before scaffolding               | Optional absolute path to the npm client executable; not read by the generated library        |
| `NPM_CONFIG_TOKEN`         | Bun registry authentication during `bun publish`         | none; required only for a non-interactive registry publish                                    |
| `BENCH_ITERATIONS`         | `bun run bench` workload size                            | `50000`; must be a positive safe integer                                                      |

The scripts preserve CI-provided values. Missing provenance remains absent and
is made inspectable through the source-state properties; do not use variables to
fabricate local CI context. Do not put tokens or other secrets in this project’s
runtime environment.

JUnit XML deliberately does not contain individual test `stdout`/`stderr` or
precise timestamps per test case; use the console log for test output. Bun's
advanced Inspector-protocol reporters are also intentionally not configured in
this small library template; add one only when a consumer needs a live event
stream or IDE integration.

The full code-example mapping is maintained in the monorepo at
[`docs/design/bun-test-reporter-alignment.md`](../../docs/design/bun-test-reporter-alignment.md).

### Contract groups

`scripts/template-contract.ts` is the typed, executable contract for this
template. It groups package properties by identity, runtime, quality, reporting,
publishing, lifecycle, and file accountability; environment inputs and flags are
separate groups. Its JUnit property map names every native and enriched
property, input, and absence rule. `bun run check:files` validates the generated
package form (where Bun has already removed `bun-create`) as well as `files.md`.
When you intentionally add a property, environment input, or flag, add it to the
corresponding contract group and document its owner and safety rule before
relying on it.

### Script flags

`test:junit` forwards arguments after `--` to `bun test`. For example,
`bun run test:junit -- --bail` creates the same JUnit report while stopping on
the first failure. `test:junit` produces the native report only; `test:ci` adds
coverage and runs enrichment after a successful test run. `junit:enrich` accepts
one optional positional report path; it defaults to `reports/junit.xml`.

### Coverage variants

`test:coverage` is Bun's text-coverage mode. Pass targeted test filters or a
test-name regex after `--`:

```bash
bun run test:coverage -- ./test/index.test.ts
bun run test:coverage -- --test-name-pattern="hello"
```

Use an explicit `./` file path for portable targeted runs. A shell can expand
`*.test.ts` before Bun starts, but Bun's own positional-argument mechanism is a
test-path filter rather than a glob API. Do not set coverage globally in
`bunfig.toml`; coverage remains an explicit proof command for this template.

`bunfig.toml` excludes test files from the coverage denominator. It otherwise
keeps Bun's defaults: source-map-aware reporting, text output for
`test:coverage`, and the `coverage/` directory for the explicit text-plus-LCOV
command. There is no coverage threshold or ignore-pattern list at scaffold time:
set one only after a consumer has a measured, reviewed baseline. Do not add a CI
workflow or coverage-service token to this general-purpose library template.

### File index and package proof

[`files.md`](./files.md) is a tracked, human-readable index of every
non-generated, non-secret project file: source, tests, scripts, docs, and
configuration. `bun run check` refreshes it and then proves it matches the tree
and the `package.json.files` publish allowlist. It deliberately excludes VCS
data, dependencies, build/test reports, profiles, tarballs, and real `.env*`
files while retaining `.env.example`. `build:metafile` is an optional
build-output view: its Markdown report shows the bundled module graph, while
`files.md` documents the project contract. The concise `Build summary` reports
entry-point count, input/output file counts, and total output bytes for
terminals and CI logs.

### Bun-native publishing

The template declares `publishConfig.access: "public"` and
`publishConfig.tag: "latest"`, matching its unscoped public-library default.
Before publishing a scoped/private package, deliberately change `access` to
`restricted` or pass Bun's `--access` and `--tag` flags for that release. Keep
registry URLs and credentials out of the template; configure them in
`bunfig.toml`, `.npmrc`, or with Bun's `--registry` flag. Start with:

```bash
bun run publish:dry-run
bun publish
```

`prepack` runs the proof contract before Bun packs this directory. `postpublish`
then prints the published package/version/tag for an operator to verify. Neither
hook runs when a prebuilt `.tgz` is supplied to `bun publish`, so archive-based
Factory publishing remains an explicit separate operation. For Bun's native
release reference, see
[Bun `publish` documentation](https://bun.com/docs/pm/cli/publish).

| Bun publish option                        | Use                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `--dry-run`                               | Pack and validate without uploading.                                          |
| `--access public\|restricted`             | Override this release's access level. `restricted` requires a scoped package. |
| `--tag <tag>`                             | Override the configured distribution tag, such as `next`.                     |
| `--registry <url>`                        | Select a registry without committing its URL into the template.               |
| `--auth-type web\|legacy`, `--otp <code>` | Choose or provide registry 2FA authentication.                                |
| `--tolerate-republish`                    | Treat an existing version as a successful CI retry.                           |
| `--ignore-scripts`                        | Skip lifecycle hooks; do not use for a release that needs the proof gate.     |

### Scaffold metrics

| Script        | Metric            | Unit / shape                                                       | Profile      |
| ------------- | ----------------- | ------------------------------------------------------------------ | ------------ |
| `bench`       | `helloThroughput` | JSON: `iterations`, `totalNs`, `meanNs`, `opsPerSec`, `bunVersion` | n/a          |
| `profile:cpu` | same workload     | Bun `.cpuprofile` under `./profiles/`                              | `--cpu-prof` |

Harness catalog (monorepo root): `bun run bench:status` ·
[`docs/harness/tenants/bun-bench-profiling.md`](../../docs/harness/tenants/bun-bench-profiling.md).
Upstream: [Bun benchmarking](https://bun.com/docs/project/benchmarking).

## Package and publish

Package from this library directory, then publish the resulting archive from the
monorepo root. Publishing is an explicit, separate operation.

```bash
# In the library directory
bun pm pack

# In the monorepo root; replace paths and metadata with the actual values.
bun run factory:publish ./packages/my-library/my-library-0.1.0.tgz \
  --name my-library --version 0.1.0 --type library
```

`bun pm pack` runs `prepack`, so the archive is checked before it is produced.
The subsequent Factory archive upload is intentionally not another lifecycle
run. The same is true of `bun publish ./package.tgz`: Bun does not rerun package
lifecycle scripts when it receives a prebuilt tarball. Always create release
archives with `bun pm pack` (or run `bun run prepack` explicitly first).

If portal consumers need the new registry state, refresh the static snapshot
after a successful publish:

```bash
bun run factory:snapshot
```

`factory create ... --publish` registers a scaffold marker; it does not replace
the archive publish step above.

## Configuration

`bun dev` watches and executes the source entry point while you work;
`test:watch` does the same for the test suite. Both retain terminal output on
reload with `--no-clear-screen`. `bunfig.toml` keeps child processes tied to the
parent and configures readable console output. Installs use Bun's isolated
linker with the global virtual store, so warm installs can reuse package trees
across projects without weakening dependency isolation.
`[serve.static] env = "PUBLIC_*"` is only for non-secret browser configuration.
