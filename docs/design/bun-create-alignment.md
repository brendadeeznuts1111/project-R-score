# `bun create` alignment reference

**Upstream source:**
[Bun `bun create` documentation](https://bun.com/docs/runtime/templating/create).
This is a semantic map, not a copied substitute for the upstream page. Bun owns
CLI behavior; this document owns FactoryWager routing, template policy, and
proof. Use [`bun init`](https://bun.com/docs/runtime/templating/init) instead
when the intended result is an empty project. Re-check the upstream source when
changing Bun versions.

For the generated library's test-output mapping, see
[`bun-test-reporter-alignment.md`](bun-test-reporter-alignment.md).

## Ownership boundaries

| Plane                              | Owns                                                                                                                                                                  | Does not own                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Bun `create`                       | Route recognition, download/copy behavior, destination semantics, manifest materialization, lifecycle order, Git initialization                                       | Factory registry publishing and repository-specific template policy |
| Factory wrapper (`factory create`) | Local-repository template routing, `--publish` marker guard, `--replace-local` safety guard, source-status output                                                     | npm/GitHub template internals and Bun flag semantics                |
| `factory-library` template         | Library files, source-first package contract, private-by-default release arming, machine-readable harness requirements, local hook messages, developer proof commands | React/Tailwind/shadcn app generation or remote-template behavior    |
| Factory R2 registry                | Explicit artifact publish/install                                                                                                                                     | `bun create` template discovery                                     |

## Route matrix

| Route                        | Bun input form                                                               | Upstream result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Factory wrapper action                                                                                                                                                                                 | Configuration / credentials                                                                                        | Destination safety                                                           | Alignment                        |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------- |
| React component              | `./Component.tsx` or `.jsx`                                                  | Uses Bun’s bundler to analyze the module graph, collects dependencies, scans exports for a React component, writes scripts/dependencies, installs missing packages with `bun install --only-missing`, and generates `${component}.html`, `${component}.client.tsx`, and `${component}.css` before starting a dev server. Tailwind detection adds `tailwindcss`, `bun-plugin-tailwind`, and Bun configuration. shadcn detection can add components, `styles/globals.css`, a production build file, aliases, and `components.json`. | Transparent passthrough; never substituted with `factory-library`.                                                                                                                                     | Component source and its dependencies.                                                                             | App-specific; defer to Bun.                                                  | Supported passthrough            |
| npm `create-*`               | `<template> [destination]`                                                   | Resolves/runs the corresponding `create-<template>` package. A same-named local template wins.                                                                                                                                                                                                                                                                                                                                                                                                                                    | Transparent passthrough; the source label is `npm`.                                                                                                                                                    | npm/Bun registry configuration; template package owns extra prompts and may detect Bun itself.                     | Remote overwrite protection requires `--force`.                              | Supported passthrough            |
| GitHub                       | `owner/repo` or `github.com/owner/repo`                                      | Downloads a tarball from GitHub’s API, extracts/copies it, installs dependencies, and initializes Git unless disabled.                                                                                                                                                                                                                                                                                                                                                                                                            | Transparent passthrough; the source label is `github`.                                                                                                                                                 | `GITHUB_TOKEN` preferred, `GITHUB_ACCESS_TOKEN` fallback, `GITHUB_API_DOMAIN` for Enterprise/proxy.                | Remote overwrite protection requires `--force`.                              | Supported passthrough            |
| Local                        | working-project `./.bun-create/<name>` or `$HOME/.bun-create/<name>`         | Copies local files, updates `name` to the destination basename, and removes `bun-create` metadata.                                                                                                                                                                                                                                                                                                                                                                                                                                | Detects working-project, configured-global, and repository-local templates before routing; requires an explicit, non-current-directory destination and `--replace-local` for an existing local target. | `BUN_CREATE_DIR` changes Bun’s global `$HOME/.bun-create` lookup path; it does not replace working-project lookup. | **Destructive by default:** an existing destination is recursively replaced. | Supported; guarded by docs/tests |
| Factory R2 artifact registry | `bun run factory:publish -- <archive>` / `bun run factory:install -- <name>` | Not an upstream `bun create` route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Kept separate; `--publish` records a marker only after an explicit-destination scaffold.                                                                                                               | R2 credentials / Factory registry token.                                                                           | Publishing is explicit/manual.                                               | Intentional separation           |

Discover this matrix from the CLI with `bun run factory:templates`.

## Harness proof decision

The Factory `bun create` route is a variant of the existing Factory CLI
boundary, not a new journey or maintenance tenant. The slim proof claim is
`factory-bun-create-template`: its ratchet and fresh rerun are
`bun test tests/factory-template.test.ts tests/cli.test.ts`; a failure means the
wrapper altered source routing or the local template contract drifted.

Its evidence is the two focused suites, `.bun-create/factory-library/`,
`lib/factory/cli.ts`, and this alignment reference. It overlaps the R2 artifact
claim only at the CLI boundary; the source routes and template contents are a
separate contract. It is deliberately `human-only` until a dedicated CI path is
warranted; owner: `.bun-create/factory-library/`. No new journey brief,
workflow, or package script is needed.

## Upstream example map

| Official example category                       | Factory mapping                                                                                                                                                                                                                                       | Template decision                                                                                                                                                  | Proof / reference                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Component command and generated HTML/client/CSS | Upstream component route only; Bun generates `${component}.html`, `${component}.client.tsx`, and `${component}.css`.                                                                                                                                  | Do not add browser/app files to `factory-library`.                                                                                                                 | `factory create ./Component.tsx` |
| Tailwind and shadcn snippets                    | Tailwind detection adds `tailwindcss` and `bun-plugin-tailwind` plus Bun configuration. shadcn detection can run its component add command and create a build file, alias configuration, `components.json`, and `styles/globals.css` for Tailwind v4. | Do not preinstall Tailwind, shadcn, or a Bun plugin in a general-purpose library.                                                                                  | Upstream component route         |
| npm `bun create` ↔ `bunx create-*` equivalence  | Wrapper preserves the command contract.                                                                                                                                                                                                               | No template modification. A specific `create-*` package may detect Bun and use it for installation, but that is package-owned rather than a generic Bun guarantee. | `factory create remix my-app`    |
| GitHub forms with/without destination           | Wrapper accepts both forms.                                                                                                                                                                                                                           | `--publish` requires an explicit destination to prevent an ambiguous marker path.                                                                                  | CLI regression test              |
| Local template folder and minimal manifest      | Repository expands the manifest with library exports, scripts, tests, type checks, and package allowlist. Local manifest names may be scoped (the upstream example uses an `@bun-examples/*` name).                                                   | Keep `{{name}}` only in template `package.json.name`; Bun replaces it.                                                                                             | Fresh local scaffold             |
| `bun-create` manifest examples                  | Bun removes the field from generated `package.json`. The upstream example includes `preinstall`, `postinstall`, and `start`; its lifecycle table/order explicitly documents pre/post execution.                                                       | Hooks are concise messages only; `bun run check` is explicit proof. The library does not rely on a `start` field.                                                  | Fresh local scaffold             |
| Bun-native cron                                 | The generated project exposes a dependency-free `cron:preview` command backed directly by `Bun.cron.parse`.                                                                                                                                           | Previewing is safe during development. Job registration remains an explicit operator action and never runs from create hooks, imports, or checks.                  | Source and materialized tests    |

## High-level flow

```text
input
 ├─ component (.tsx/.jsx) ──────────────→ Bun bundler → export scan → HTML/client/CSS
 │                                          → bun install --only-missing → dev server
 ├─ GitHub (owner/repo) ─────────────────→ GitHub API tarball → extract → install + Git
 ├─ npm (template) ─────────────────────→ registry metadata/tarball → create-* flow
 └─ local (project root/global template) → delete destination → copy without node_modules
                                           → rewrite manifest → preinstall → install decision
                                           → postinstall → Git (may overlap install)
```

Factory only adds local repository routing plus explicit-destination and
`--replace-local` guards for its destructive local-template path, as well as the
marker guard. Before Bun can create or replace the destination, the wrapper runs
the requirements and manifest/file proof for a local template that declares
`harness.toml`. A marker request then validates the R2 credential and account
requirements, so a broken template or missing publish environment cannot leave a
partially successful scaffold. It does not alter Bun’s branch selection or
lifecycle order. Bun notes that local copying uses platform-specific fast paths
(`fcopyfile` on macOS and `copy_file_range` on Linux); when dependencies exist,
install and Git work can overlap. Its documented libgit2 experiment was slower,
so neither its presence nor the timing of those phases is a supported automation
contract.

After Bun returns success, Factory treats the materialized scaffold as a second
handoff: it reruns requirements, regenerates `files.md` to account for an
installed `bun.lock`, and validates the generated manifest before reporting
success or writing a marker. A failing output is retained for diagnosis but is
not registered.

For the npm branch, Bun’s implementation reference describes registry metadata
and tarball retrieval for its upstream example-template path. Individual
`create-*` packages still own their prompts, dependency choices, and any
runtime-specific installation behavior.

`factory-library` starts with `private: true` and `license: UNLICENSED`.
Development checks accept those safe defaults. The secret-free release gate
requires a customized description, explicit repository URL, chosen SPDX license
expression, `private: false`, and a schema-1 Bun text lockfile coherent with
`package.json` under `bun install --frozen-lockfile --dry-run --ignore-scripts`;
the publication gate adds only `NPM_CONFIG_TOKEN`. This preserves Proton Pass as
credential authority while making publication an explicit package-owner
decision.

The generated library is a standalone repository artifact, so its project
`bunfig.toml` deliberately carries `linker = "isolated"` and
`globalStore = true` instead of depending on a Project R operator's machine
profile. It keeps `frozenLockfile = false` for the initial lockfile bootstrap
and intentional dependency edits; release and publish always override that
development setting with the frozen dry-run command above. `harness.toml`
mirrors those critical config values plus `run.noOrphans`, console depth, and
coverage accounting so Factory preflight and materialized-output validation
reject config drift at the handoff.

## Execution-order matrix

| Phase                    | Applies to           | Bun-owned contract                                                                                                                                                                    | Factory policy / implementation                                                                                            | Operator proof                                     |
| ------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Resolve                  | npm / GitHub / local | Locates a remote package/repo or local template.                                                                                                                                      | Detect repo-local templates; do not rewrite remote identifiers.                                                            | `bun run factory:templates`                        |
| Overwrite decision       | npm / GitHub         | Stops for existing files unless `--force`.                                                                                                                                            | Pass `--force` through unchanged.                                                                                          | Use a disposable destination in dry runs.          |
| Local destination reset  | local only           | Deletes destination recursively before copying and does not copy or traverse template `node_modules`; Bun calls out this optimization as faster than a general `cp`.                  | Document as destructive; template never contains dependency output.                                                        | Local overwrite regression probe.                  |
| Manifest materialization | local only           | Writes destination-derived `name` and removes `bun-create`.                                                                                                                           | Source-first exports/type metadata remain; hooks cannot persist into consumer install.                                     | Generated `package.json` inspection.               |
| Preinstall hook          | local only           | Bun's documented local flow places declared preinstall setup before the install decision. Active Bun 1.3.14 skips it when `--no-install` is passed; the normal-install route runs it. | Status message only; no registry or project mutation.                                                                      | Normal-install probe; no-install regression probe. |
| Install decision         | remote / local       | Installs unless `--no-install` or no dependencies exist.                                                                                                                              | Pass through `--no-install`; no lockfile/dependency tree is expected.                                                      | Minimal scaffold regression test.                  |
| Postinstall hook         | local only           | Executes declared setup after the install decision. Active Bun 1.3.14 retains this dependency-free hook under `--no-install`.                                                         | Next-step message only; avoid dependency-sensitive proof here.                                                             | Scaffold stdout.                                   |
| Git initialization       | remote / local       | Initializes/commits a new repository unless `--no-git`; Bun also maps a template `gitignore` file to `.gitignore` because npm strips `.gitignore` from published packages.            | Pass through `--no-git` for monorepo destinations; template keeps a normal `.gitignore` and uses a package file allowlist. | Minimal scaffold regression test.                  |
| Implementation details   | internal Bun         | Install/Git overlap and filesystem optimizations are not CLI contracts. Bun documents that its tested libgit2 path was slower in its microbenchmark.                                  | Never depend on timing, copy primitive, or libgit2 availability.                                                           | Not applicable.                                    |

## Flag matrix

| Flag              | Owner        | Applies to                            | Wrapper behavior                                                                                                | Template / safety effect                                                                                                 | Verification                    |
| ----------------- | ------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| `--force`         | Bun          | Remote templates                      | Passed through.                                                                                                 | Applies to remote overwrite protection. Local templates are destructive by default with or without this flag.            | Local/remote destination review |
| `--no-install`    | Bun          | Remote and local                      | Passed through.                                                                                                 | Local hook remains dependency-free; generated tree has no `node_modules` or lockfile.                                    | CLI regression test             |
| `--no-git`        | Bun          | Remote and local                      | Passed through.                                                                                                 | Suitable for a library under an existing monorepo.                                                                       | CLI regression test             |
| `--open`          | Bun          | Primarily app/component scaffolds     | Passed through.                                                                                                 | Bun starts and opens the project in a browser after completion; it has no special value for the source-library template. | Active `bun create --help`      |
| `--publish`       | Factory only | Explicit-destination scaffolds        | Intercepted before Bun; rejects no-destination use and fails if the generated manifest cannot produce a marker. | Registers metadata marker, never a distributable archive.                                                                | CLI regression test             |
| `--replace-local` | Factory only | Existing repository-local destination | Intercepted before Bun; rejected for remote/component routes.                                                   | Makes intentional local replacement explicit; never permits the current working directory.                               | CLI regression test             |

Factory’s explicit destination and `--replace-local` requirements for known
repository-local templates are safety policies, not Bun flags: direct
`bun create <local-template>` retains Bun’s optional-destination and local
replacement behavior.

## Environment matrix

| Variable                                    | Owner              | Route / consumer                | Scope and precedence                                                               | Current Factory policy                                                                                                                                                                                    | Safe verification                    |
| ------------------------------------------- | ------------------ | ------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `BUN_CREATE_DIR`                            | Bun                | Global local-template discovery | Explicit caller value wins; it changes the global `$HOME/.bun-create` lookup path. | Wrapper respects the caller value, detects a configured local template before applying local-destination safety, and supplies repo `.bun-create` only when absent; project-root lookup remains Bun-owned. | Configured-local CLI regression test |
| `NPM_CLIENT`                                | Bun                | npm `create-*` template route   | Optional absolute path to the npm client executable.                               | Passed through unchanged; Factory does not select or synthesize an npm client.                                                                                                                            | Active `bun create --help`           |
| `GITHUB_TOKEN`                              | Bun                | GitHub templates                | Preferred when both GitHub token variables exist.                                  | Project/Reasonix environment supplies it to Bun; do not globally export secrets.                                                                                                                          | `bun run env:check:channel-auth`     |
| `GITHUB_ACCESS_TOKEN`                       | Bun                | GitHub templates                | Fallback token.                                                                    | Retained for compatibility in injected env.                                                                                                                                                               | Masked env check                     |
| `GITHUB_API_DOMAIN`                         | Bun                | GitHub Enterprise/proxy         | Use only for non-default GitHub API hosts.                                         | Project env owns the value; public GitHub uses Bun’s default.                                                                                                                                             | Masked env check                     |
| `FACTORY_WAGER_TOKEN`                       | Factory/Bun config | Scoped npm registry             | Referenced by `bunfig.toml` scope configuration.                                   | Not a `bun create` variable; keep in project/Reasonix env.                                                                                                                                                | Bun scoped-install workflow          |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Factory            | Artifact registry               | Required only for explicit Factory registry operations.                            | Not passed as a Bun create concern.                                                                                                                                                                       | `bun run factory:env`                |

## Template contract and proof

| Contract                               | Template location                    | Proof                                                       |
| -------------------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| Bun-init-aligned no-emit type checking | `tsconfig.json`                      | `bun run typecheck`                                         |
| Source-first package exports           | `package.json`                       | `bun run check`                                             |
| Watch workflows                        | `dev` / `test:watch` scripts         | Manual local development                                    |
| Publishable file allowlist             | `package.json.files`                 | `bun pm pack --dry-run`                                     |
| Benchmark/profile artifacts stay local | `.gitignore`, `bench`, `profile:cpu` | Generated project check                                     |
| Local template, flag, and marker guard | Factory CLI + tests                  | `bun test tests/factory-template.test.ts tests/cli.test.ts` |

## Verified baseline

Verified on Bun 1.3.14:

- Repository-local `factory-library` resolves through the wrapper.
- `--no-install --no-git` produces no dependency tree, lockfile, or Git repo.
- A local existing destination is replaced.
- A generated library passes `bun run check` and `bun pm pack --dry-run`.
