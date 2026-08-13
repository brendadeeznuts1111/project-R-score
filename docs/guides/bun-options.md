# `BUN_OPTIONS` Runtime Argument Contract

`BUN_OPTIONS` prepends runtime arguments to every Bun execution started with
that environment. Keep it scoped to one command or a deliberate CI job; use
`bunfig.toml` or package scripts for stable project policy.

Authority: Bun documents the global prepend behavior in
[Environment Variables](https://bun.com/docs/runtime/environment-variables#configuring-bun)
and support in
[standalone executables](https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options).
The parsing and argv details below are verified on the repository pin, Bun
1.3.14, by
[`tests/bun-options-contract.test.ts`](../../tests/bun-options-contract.test.ts).

## Behavior table

| Aspect                 | Repository contract                                                      | Boundary                                                                                 |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Scope                  | Prepended to every Bun execution inheriting the variable                 | A flag can be valid, ignored, or rejected depending on the selected subcommand           |
| Syntax                 | Whitespace separates arguments; quoted groups stay together              | Bun 1.3.14 retains the quote characters instead of shell-unquoting the value             |
| Script arguments       | Does not insert entries into `process.argv`                              | User positional arguments keep their script-visible positions                            |
| Runtime arguments      | Injected entries appear first in `process.execArgv`                      | Treat this as runtime state, not application input                                       |
| Repeated flags         | A later explicit CLI value wins for the verified `--console-depth` case  | Do not generalize this observation to every flag without a focused proof                 |
| `bunfig.toml`          | `BUN_OPTIONS` can override a conflicting runtime default                 | Prefer checked-in bunfig for durable project defaults                                    |
| Standalone executables | Read `BUN_OPTIONS` at runtime                                            | Embedded arguments use `--compile-exec-argv`; deployment env remains an override surface |
| `bunx`                 | Inherits the environment because it is a Bun execution                   | Put bunx-owned flags such as `--no-install` directly on `bunx` for clarity               |
| `NODE_OPTIONS`         | Separate Node-compatibility input, not a fallback spelling for Bun flags | Do not claim a universal priority relationship                                           |
| Diagnostics            | Inspect `process.execArgv` in a controlled probe                         | `bun --verbose` is not an effective-argv diagnostic                                      |
| Security               | Never place credentials or tokens in the value                           | Environment and process diagnostics can expose command arguments                         |
| Disable                | Unset the variable or use `BUN_OPTIONS=''` for one command               | Repository spawn wrappers clear inherited values when hermetic behavior matters          |

## Tokenization is not shell parsing

Simple, space-free arguments are the portable shape:

```bash
BUN_OPTIONS="--console-depth=5 --no-clear-screen" bun run dev
```

Do not use shell quoting to smuggle spaces into a flag value. On Bun 1.3.14,
this keeps the quotes as part of `process.title`:

```bash
BUN_OPTIONS='--title="hello world"' bun app.ts
```

An unquoted space creates another argument, and backslash escaping is not a
portable substitute. Put complex values directly on the CLI, in a wrapper, or in
the owning configuration file.

## Precedence and flag placement

Conceptually, Bun prepends `BUN_OPTIONS` before the arguments written on the
command line. The explicit CLI therefore occurs later. This verified example
selects depth 4:

```bash
BUN_OPTIONS="--console-depth=1" bun --console-depth=4 run inspect.ts
```

Flags for Bun belong before `run`. Arguments after the package script name are
script arguments, so `bun run dev --no-hot` is not a reliable way to negate a
runtime option. Bun 1.3.14 does not advertise a `--no-hot` flag.

The supported inspection-depth flag is `--console-depth`, not `--inspect-depth`:

```bash
bun --console-depth=6 run inspect.ts
```

## Recommended use

Use `BUN_OPTIONS` for short-lived, uniform runtime controls where every Bun
invocation in scope should inherit the same compatible flag. Examples include a
focused profiling job or a one-command console-depth override.

Prefer the owning plane when a setting is stable or command-specific:

| Need                                 | Owner                                               |
| ------------------------------------ | --------------------------------------------------- |
| Project-wide runtime default         | `bunfig.toml`                                       |
| One package script                   | The explicit `package.json` command                 |
| One operator invocation              | Direct Bun CLI flag                                 |
| Standalone binary build default      | `--compile-exec-argv` / `compile.execArgv`          |
| Application configuration or secrets | Typed environment/config input, never `BUN_OPTIONS` |

Avoid globally exporting `--env-file`, `--hot`, `--watch`, or package-manager
flags across unrelated commands. Their semantics are command-specific and can
make tests, builds, hooks, or compiled programs inherit behavior they did not
request.

## Repository integration

| Layer                                          | Owner                                                                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Typed contract and redacted runtime assessment | [`lib/bun-runtime-env.ts`](../../lib/bun-runtime-env.ts)                                                        |
| Canonical Bun reference lookup                 | [`tools/bun-doc-refs.ts`](../../tools/bun-doc-refs.ts)                                                          |
| Bun docs registry                              | [`tools/bun-docs-curated.ts`](../../tools/bun-docs-curated.ts) → `tools/bun-docs-catalog.json`                  |
| Hermetic staged-test wrapper                   | [`scripts/bun-test-changed-staged.ts`](../../scripts/bun-test-changed-staged.ts) clears inherited `BUN_OPTIONS` |
| Runtime proof                                  | [`tests/bun-options-contract.test.ts`](../../tests/bun-options-contract.test.ts)                                |

The runtime assessment reports only `configured` or `unset`; it never emits the
raw value. Verify the contract with:

```bash
bun test tests/bun-options-contract.test.ts tests/bun-runtime-env.test.ts
bun run docs:map:check
```
