# Factory — R2-backed artifact registry

Registry client, CLI, and template scaffolding for the FactoryWager internal
package registry.

## Structure

| File                   | Role                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| `artifact.ts`          | Branded ArtifactName/Version/Id types + ArtifactRelease schema                   |
| `object-store.ts`      | `RegistryObjectStore` — memory (tests) + `S3Client` SigV4 (live)                 |
| `markdown.ts`          | `Bun.markdown` helpers — **Bun runtime only** (never import from `functions/`)   |
| `registry.ts`          | RegistryClient: publish, install, list, search, fetchReadme                      |
| `health.ts`            | Bun-host health report: R2 probe, package/version counts, integrity status       |
| `integrity.ts`         | Full artifact size + SHA-256 verification                                        |
| `alerts.ts`            | Slack and Telegram alert delivery without secret logging                         |
| `monitoring.ts`        | One-shot integrity cycle + in-process Bun cron complement                        |
| `server.ts`            | Bun VM gateway: `routes` (health/ready/index/POST publish) + `fetch` object keys |
| `cli.ts`               | CLI (registry operations, scaffold, color diagnostics, help)                     |
| `color-diagnostics.ts` | Cached Bun.color probes and palette generation                                   |
| `publish-metadata.ts`  | package.json + README from publish path / `.tgz` (BM-5; prefer over CWD)         |
| `semver.ts`            | Bun.semver wrappers: sortVersions, satisfiesRange, resolveVersion                |
| `index.ts`             | Barrel exports                                                                   |

## Quick start

```bash
bun run factory --version
bun run factory:list
bun run factory:snapshot          # → public/registry/registry.json
bun run factory:create -- factory-library ./packages/my-lib
bun run factory:templates         # local, npm, GitHub, and artifact-registry lanes
bun run factory -- colors 'rgba(224 108 117 / 0.5)' --diagnose
```

See [proof claim](../../docs/harness/PROOF.md) `factory-registry-cli-v1`.  
Pages portal proxy: claim `factory-registry-pages-proxy-v1` ·
`functions/api/registry/`.

Live R2 uses
[`Bun.S3Client`](https://bun.com/docs/runtime/s3#bun-s3client-bun-s3) (SigV4)
via `createS3RegistryStore`. Unit tests inject `createMemoryObjectStore()` —
green tests prove coordination, not deployed bucket health (`factory env` / live
ping).

## `factory create` → `bun create`

Scaffolding **delegates to Bun** — Factory adds an optional registry marker and
interactive spawn. Canonical Bun docs:
[runtime/templating/create](https://bun.com/docs/runtime/templating/create)
(_optional_ — Bun needs no config; create only speeds setup). Empty project
without a template: [bun init](https://bun.com/docs/runtime/templating/init).
The complete upstream-to-Factory map is in
[`bun-create-alignment.md`](../../docs/design/bun-create-alignment.md). The
corresponding native registry and Factory-artifact publication map is in
[`bun-publish-alignment.md`](../../docs/design/bun-publish-alignment.md).

| Source                                                | Example                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| Local repository template                             | `bun run factory:create -- factory-library my-lib`                    |
| npm `create-*` package                                | `bun run factory:create -- remix my-app` ≡ `bunx create-remix my-app` |
| GitHub                                                | `bun run factory:create -- vercel/next.js my-app`                     |
| Factory R2 registry (artifact, not a scaffold source) | `bun run factory:install <name>`                                      |

List the routing guide with `bun run factory:templates`. The `factory:create`
script is intentionally create-only; use `factory` or `factory:templates` for
non-create subcommands. That guide also identifies the Factory-only local
replacement guard; it never applies to npm, GitHub, or component routes.

**Template search path:** project [`.bun-create/<name>`](../../.bun-create/) ·
`$HOME/.bun-create/<name>` · global override `BUN_CREATE_DIR`.  
Ship template:
[`.bun-create/factory-library`](../../.bun-create/factory-library/)
(`package.json` `"bun-create": { preinstall, postinstall }`).  
Scaffold metrics: `bun run bench` (`Bun.nanoseconds` → JSON) ·
`bun run profile:cpu` (`--cpu-prof` / `--cpu-prof-md` → `./profiles/`) — see
template README and harness tenant
[`bun-bench-profiling.md`](../../docs/harness/tenants/bun-bench-profiling.md).
Prefer the harness entrypoints over `scratch/` / `examples/` profiling demos.

**Bun flags** (passed through): `--force` · `--no-install` · `--no-git` ·
`--open`. **Factory-only safety flags:** `--publish` and `--replace-local`.
Verify the active Bun runtime with `bun create --help` before depending on a
flag. **Env** (GitHub / Enterprise): `GITHUB_TOKEN` (preferred) ·
`GITHUB_ACCESS_TOKEN` · `GITHUB_API_DOMAIN`; npm templates can also receive
`NPM_CLIENT` (absolute executable path) — key names in
[`BUN_GITHUB_ENV`](../github-repository-ref.ts).

`--force` is Bun's remote-template overwrite override. Local templates replace
their destination by design whether or not that flag is present.

For that reason, the Factory wrapper requires an explicit destination for its
repository-local templates:
`bun run factory:create -- factory-library ./my-lib`. It also refuses an
existing local destination until `--replace-local` states that replacement is
intentional; it always refuses the current working directory. Direct
`bun create factory-library` retains Bun's upstream optional-destination
behavior; use it only when its implicit destination is intentional.

`--publish` records scaffold metadata only. Create and verify a `bun pm pack`
archive before using `factory publish` for a distributable release. Treat the
destination as disposable: local templates may replace it.

## `factory colors` → `Bun.color`

Use the color command to inspect the installed runtime instead of relying on a
copied output table:

```bash
bun run factory -- colors '#e06c75'
bun run factory -- colors 'rgba(224 108 117 / 0.5)' --diagnose
bun run factory -- colors --palette '#e06c75' --perceptual
bun run factory -- colors --palette '#e06c75' --perceptual --json
bun run issue:context -p '#e06c75' --tones '0,0.1,0.3,0.6,1'
bun run issue:context -p '#e06c75' --gradient '#2ecc71' --steps 16 --hsl --format HEX -m
bun run issue:context -p '#e06c75' --tones '0,0.2,0.5' --theme dark -m
```

The formatter table covers all 16 formats in the current Bun declarations,
including `lab`. `ansi` may return an empty string when stdout has no color
support; the command labels that as `terminal-disabled`, distinct from an
unsupported input (`null`). ANSI sequences are escaped in tables so diagnostics
cannot recolor or corrupt their own output.

| Boundary              | Runtime contract                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Alpha                 | `css`, `rgba`, `{rgba}`, and `[rgba]` retain it; `rgb`, `hsl`, `lab`, `hex`, `HEX`, and `number` omit it |
| `transparent`         | Concrete RGBA with alpha `0`                                                                             |
| `currentcolor`        | Symbolic, context-dependent CSS; valid for diagnosis but not palette math                                |
| `color(display-p3 …)` | Preserved as a symbolic wide-gamut string on Bun 1.3.14; not silently described as sRGB-clipped          |
| Out-of-range channels | Bun 1.3.14 clamps them; palette math also clamps before formatting                                       |
| Invalid input         | `null`, rendered as `unsupported`; palette mode exits with a direct error                                |

`--perceptual` is the stable CLI spelling for linear-light RGB mixing. It avoids
mixing gamma-encoded channel values, but it is not an OKLab/Lab uniformity
claim. The default palette uses encoded sRGB mixing, and both modes preserve the
base color at the center of 15 steps.

`--tones` replaces the default 15 positions with an explicit comma-separated
list. Each value is a mix amount from `-1` (black), through `0` (the unmodified
base), to `1` (white). `issue:context` is the short package-script route to the
same canonical command; `-p` aliases `--palette`.

Gradient mode interpolates between two concrete endpoints. It uses encoded RGB
by default; `--hsl` selects shortest-path hue interpolation. `--steps` accepts
`2` through `256`, and `--format` accepts any format from the live Bun color
surface. `-m` / `--markdown` emits a paste-ready table suitable for issue or PR
context; `--json` remains the machine-data route.

### Theme and terminal color

`--theme auto|dark|light` labels the intended presentation context in table,
Markdown, and JSON output. The default is `auto`. Theme selection never mutates
[`theme.jsonc`](../../public/portal/theme.jsonc), changes interpolation, or
creates another palette owner; it is context metadata for consumers deciding
where to place the generated colors.

An additional `--color` depth flag is intentionally unnecessary today:

| Need                             | Supported route                         |
| -------------------------------- | --------------------------------------- |
| Disable CLI chrome color         | `NO_COLOR=1 bun run issue:context …`    |
| Force Bun's detected ANSI output | `FORCE_COLOR=1 bun run issue:context …` |
| Serialize 16-color codes         | `--format ansi-16`                      |
| Serialize 256-color codes        | `--format ansi-256`                     |
| Serialize true-color codes       | `--format ansi-16m`                     |

`--format` controls generated gradient values; it does not override the
terminal’s capabilities. CLI chrome continues to use Bun’s
`Bun.enableANSIColors` detection through the shared console layer. Add a
separate `--color` flag only if a future renderer must override that runtime
decision independently of output serialization.

The library exports the pure diagnostic, cache, parse, and palette helpers from
[`index.ts`](./index.ts). For direct build-time conversion, prefer Bun's native
macro import—no project-specific palette owner is required:

```ts
import { color } from 'bun' with { type: 'macro' };

const accent = color('#e06c75', 'css');
```

The public helper signatures have compile-only contracts using Bun's
[`expectTypeOf`](https://bun.com/reference/bun/test/expectTypeOf):

```bash
bun run check:factory-color:types
```

This command runs TypeScript over
[`factory-color-types.test-d.ts`](../../tests/factory-color-types.test-d.ts).
Keep value assertions in `factory-color-diagnostics.test.ts`; use `expectTypeOf`
here for parameter, return, union, and narrowing contracts that would otherwise
disappear when Bun strips TypeScript at runtime.

Canonical references: [Bun.color](https://bun.com/docs/runtime/color) ·
[macros](https://bun.com/docs/bundler/macros) ·
[`expectTypeOf`](https://bun.com/docs/test/writing-tests#expecttypeof).

## Registry defaults and malformed input

Defaults apply only when an input is absent. Supplied blank or invalid values
are rejected rather than silently changed, except that blank environment values
in an ordered fallback chain are treated as absent so the next configured source
can be used.

| Input                        | Absent                         | Supplied malformed                                                                                     |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Artifact `type`              | `library`                      | Reject publish                                                                                         |
| Dist-tag                     | `latest`                       | Reject publish                                                                                         |
| Publisher                    | `factory-cli`                  | Reject publish                                                                                         |
| HTTP multipart `tags`        | `latest`                       | HTTP 400                                                                                               |
| `REGISTRY_MAX_PUBLISH_BYTES` | 50 MiB                         | HTTP 503; publish is unavailable                                                                       |
| `REGISTRY_PORT` / `PORT`     | `3000`                         | Server startup fails clearly                                                                           |
| Programmatic `port: 0`       | n/a                            | Explicit Bun ephemeral-port request; allowed only when passed as an option                             |
| Publish token                | Publishing disabled (HTTP 503) | Blank preferred token falls through to `REGISTRY_SECRET`; an explicit blank option disables publishing |

`REGISTRY_PORT` takes precedence over `PORT` when non-empty. `REGISTRY_HOST`
defaults to `0.0.0.0` only when absent; production operators should set it (or
place a reverse proxy in front) intentionally.
