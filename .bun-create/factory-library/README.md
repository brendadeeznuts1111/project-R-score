# Bun-native library

This is a small, test-first starting point for a library consumed by Bun.

## First five minutes

1. Set the package `description` and confirm the generated `name` in
   `package.json`. Keep `private: true` while developing.
2. Replace the `hello` example in `src/index.ts` with the public API.
3. Update the matching tests in `test/index.test.ts`.
4. Review `harness.toml`. The base check intentionally requires no secrets.
   Release readiness additionally requires a chosen SPDX `license`, an explicit
   `repository`, a customized description, and `private: false`.
5. Run the local proof:

```bash
bun run requirements
bun run check
bun pm pack --dry-run
```

The starter API includes `formatTerminal(text, color)` and semantic `colors`
helpers backed by `Bun.color` with auto-detecting ANSI output. Use them in
scripts for consistent terminal logs; see [Automatic terminal color](#automatic-terminal-color).

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

For a template that declares `harness.toml`, the wrapper proves the source
requirements and manifest before Bun can replace the destination. After Bun
materializes the package name and removes `bun-create`, the wrapper reruns the
requirements, regenerates `files.md`, and validates the generated manifest
before reporting success or registering a Factory marker. A failed generated
scaffold is retained for diagnosis and is never registered.

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
bun run format          # writes Prettier formatting across the project
bun run format:check    # verifies formatting without changing files
bun run lint            # runs the pinned ESLint flat config
bun run lint:fix        # applies safe ESLint fixes, then reports remaining violations
bun run typecheck
bun run build
bun run build:metafile # writes metafiles plus a machine-readable build summary
bun run requirements  # validates runtime + package identity; requires no secrets
bun run requirements:release # proves explicit release identity; still secret-free
bun run requirements:publish # adds only the automated-publish token requirement
bun run lockfile:check # native frozen dry run; proves package.json ↔ bun.lock coherence
bun run generate:files # refreshes the tracked project file index
bun run check:files    # validates files.md and package.json.files against the source tree
bun run check           # file index + typecheck + test + build
bun run prepack         # same checks run automatically before Bun packs/publishes this directory
bun run release:dry-run # release requirements + secret-free Bun package inspection
bun run publish:ci      # fail-fast requirements, then authenticated npm publish
bun run cron:preview -- "0 * * * *" "2026-01-01T00:30:00Z" # next UTC match; no job registration
bun run color-test     # demos auto/fixed Bun.color terminal output and brand formats
bun run bench          # Bun.nanoseconds throughput JSON
bun run profile:cpu    # same workload under --cpu-prof → ./profiles/*.cpuprofile
```

## Bun cron

Use `bun run cron:preview -- "<schedule>" "<relative-date>"` before installing a
schedule. The command calls `Bun.cron.parse` directly and prints one JSON line.
It has no dependencies, loads no secrets, and never registers an in-process or
OS-level job. Omit the schedule to use `CRON_SCHEDULE`, then the preview-only
`@hourly` default. Omit the relative date to start from the current time.

The Bun 1.3.14 baseline accepts standard five-field expressions and nicknames
such as `@hourly`. Seconds are not supported. For example, `*/30 * * * *` means
every 30 minutes; `*/30 * * * * *` is invalid. On this baseline,
`Bun.cron.parse` and in-process scheduling interpret schedules in UTC. OS-level
jobs use the host's local timezone. If you raise `engines.bun`, verify these
semantics against Bun's current cron documentation and runtime rather than
inferring them from a newer `@types/bun` package.

The package script pins `TZ=UTC`. If you call `scripts/cron-preview.ts`
directly, set `TZ=UTC` yourself. `CRON_TZ`, when present, must also be `UTC`;
Bun 1.3.14 does not implement the timezone option shown in forward Bun docs.
Pass relative time as Unix milliseconds or an ISO timestamp ending in `Z` or a
numeric offset such as `-06:00`. The command rejects timezone-naive timestamps
because `Date` would interpret them through the process timezone before cron
parsing begins.

If the work belongs to the current process and must share its pools or caches,
use `Bun.cron(schedule, handler)`. The next occurrence is scheduled only after
the handler settles, so invocations do not overlap. Keep the returned
`CronJob`, then call `stop()`, `unref()`, or `ref()` explicitly as lifecycle
ownership changes. A thrown error or rejected promise follows Bun's normal
uncaught-error behavior; the job can continue only while the process survives.

If the work must survive process restarts, register it explicitly from an
operator or provisioning command:

```ts
await Bun.cron('./worker.ts', '30 2 * * 1', 'weekly-report');
await Bun.cron.remove('weekly-report');
```

The target script exports a default object with `scheduled(controller)`. Bun
owns the platform integration through crontab, launchd, or Task Scheduler. Do
not run registration from package import, `bun create`, lifecycle hooks, tests,
or `bun run check`; those paths must remain deterministic and side-effect free.
Registration does not portably capture `TZ`, secrets, `NODE_ENV`, or
`CRON_SCHEDULE`. A persistent worker must retrieve runtime credentials through
its deployment owner, and schedule changes require explicit re-registration.

[Read Bun's cron documentation](https://bun.com/docs/runtime/cron) before
shipping a schedule or changing the runtime floor.

`bun run check` first validates `harness.toml`, the active Bun version, and
concrete package identity. The harness also locks the critical `bunfig.toml`
values for isolated installs, first-lock bootstrap, parent-death behavior,
console depth, and coverage accounting. It requires non-empty `README.md`,
`src/index.ts`, and `test/index.test.ts`, then verifies the generated file index,
formatting, lint, types, tests, and build in that order. Prettier and ESLint are
pinned local development dependencies, so these commands do not depend on
whatever versions a global tool happens to provide.

The harness separates development, release readiness, and authenticated
publication. `check` has an empty `requiredEnv` list and must stay secret-free.
`release` also requires no credentials, but rejects the starter description,
`UNLICENSED`, a missing repository URL, or `private: true`. The generated
package deliberately starts private, so Bun itself rejects an accidental direct
publish. Release and publish modes additionally require a Bun text lockfile
declaring `lockfileVersion: 1` and `configVersion: 1`. Their command routes then
run `bun install --frozen-lockfile --dry-run --ignore-scripts`, so a merely
present or hand-written lockfile cannot pass when it disagrees with
`package.json`. `publish` applies the same release policy and adds a non-empty
`NPM_CONFIG_TOKEN` before invoking `bun publish`. The validator reports variable
names only and never prints values. Interactive or custom-registry publication
may still use Bun's native configuration directly after the package has been
deliberately armed; `publish:ci` is the deterministic non-interactive route.

Prepare a release deliberately:

1. Replace the starter description.
2. Replace `UNLICENSED` with the chosen SPDX license expression.
3. Add an explicit HTTPS or Git `repository` URL.
4. Change `private` from `true` to `false`.
5. Commit the generated `bun.lock` after dependency review.
6. Run `bun run lockfile:check`; resolve package/lock drift deliberately.
7. Run `bun run release:dry-run` without credentials.
8. Supply `NPM_CONFIG_TOKEN` only to `bun run publish:ci`.

### Automatic terminal color

The starter API exports `formatTerminal(text, color, depth)`, reusable `colors`
helpers, and a typed terminal-format map. Its default `"auto"` depth calls
`Bun.color(color, "ansi")`, allowing Bun to select 16-color, 256-color, or true
color for the active environment while respecting `NO_COLOR` / `FORCE_COLOR`.
When the output stream does not support ANSI or the color cannot be parsed, it
returns the original plain text without a stray reset sequence.
`AUTO_TERMINAL_COLOR_FORMAT` remains the literal `"ansi"` for code that needs
to inspect or pass the automatic format directly.

```ts
import { colors, formatTerminal } from 'my-library';

console.log(formatTerminal('Brand mint', '#7dd3c0'));
console.log(colors.green('✅ Success'));
console.log(colors.red('❌ Failure'));
```

Use `depth: "16"`, `"256"`, or `"truecolor"` only for a serialization contract
that requires a fixed depth; ordinary terminal output should retain `"auto"`.
`terminalColorFormat(depth)` maps those values to Bun's `"ansi-16"`,
`"ansi-256"`, and `"ansi-16m"` formats. `terminalColorOpen()` supports custom
balanced spans; otherwise prefer `formatTerminal()`, which appends `ANSI_RESET`
only after a real opener.

Run `bun run color-test` in a terminal to exercise the same Bun.color pipeline
and print the reusable `brandHex` / `brandRgb` manifest representations.

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
| `NPM_CONFIG_TOKEN`         | Automated registry authentication via `publish:ci`       | `release:dry-run` remains secret-free; `requirements:publish` exits before registry upload    |
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
publishing, lifecycle, release requirements, and file accountability;
environment inputs and flags are separate groups. Its JUnit property map names every native and enriched
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

### Bun ecosystem integration

The starter deliberately demonstrates Bun-native primitives instead of adding
wrapper dependencies: `Bun.color` for terminal/CSS color conversion,
`Bun.file` and `Bun.write` for file I/O, `bun:test` for tests and coverage, and
`bunfig.toml` for the isolated global-store install policy. Explore `scripts/`
for executable examples of those APIs.

### Bun-native publishing

The template declares `publishConfig.access: "public"` and
`publishConfig.tag: "latest"`, matching its unscoped public-library default.
Before publishing a scoped restricted package, deliberately change `access` to
`restricted` or pass Bun's `--access` and `--tag` flags for that release. Keep
registry URLs and credentials out of the template; configure them in
`bunfig.toml`, `.npmrc`, or with Bun's `--registry` flag. Start with:

```bash
bun run release:dry-run
bun run publish:ci
```

`release:dry-run` first runs the frozen lockfile check, then uses
`bun pm pack --dry-run`, which inspects the exact package surface without
requesting registry authentication. Bun 1.3.14's
`bun publish --dry-run` still reaches its authentication boundary, so it is not
the secret-free proof route. `prepack` runs the proof contract before Bun packs
this directory. `postpublish` then prints the published package/version/tag for
an operator to verify. Neither hook runs when a prebuilt `.tgz` is supplied to
`bun publish`, so archive-based Factory publishing remains an explicit separate
operation. For Bun's native release reference, see
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
parent and sets `[console] depth = 6` for readable nested `console.log()` output;
Bun's default is `2`, and `bun --console-depth=N run …` overrides the project
setting for one invocation. Put the runtime flag before `run`. Raw `Bun.inspect`
uses its explicit `{ depth }` option instead. Installs use Bun's isolated linker
with the global virtual store, so warm installs can reuse package trees across
projects without weakening dependency isolation. The project keeps
`frozenLockfile = false` only so a brand-new scaffold can create its first lock
and developers can make intentional dependency changes; release and publish
always override it with the native frozen dry-run proof.
