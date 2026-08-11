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

| Mode                  | Example                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| Local template (repo) | `bun run factory:create -- factory-library my-lib`                     |
| Same, publish to R2   | `bun run factory:create -- factory-library my-lib --publish`           |
| React component env   | `bun create ./MyComponent.tsx` (or `factory create ./MyComponent.tsx`) |
| GitHub                | `bun create user/repo dest`                                            |
| npm create-*          | `bun create remix` ≡ `bunx create-remix`                               |

**Template search path:** project [`.bun-create/<name>`](../../.bun-create/) ·
`$HOME/.bun-create/<name>` · global override `BUN_CREATE_DIR`.  
Ship template:
[`.bun-create/factory-library`](../../.bun-create/factory-library/)
(`package.json` `"bun-create": { preinstall, postinstall }`).  
Scaffold metrics: `bun run bench` (`Bun.nanoseconds` → JSON) ·
`bun run profile:cpu` (`--cpu-prof` → `./profiles/`) — see template README and
harness tenant
[`bun-bench-profiling.md`](../../docs/harness/tenants/bun-bench-profiling.md).

**Flags** (passed through): `--force` · `--no-install` · `--no-git` ·
`--open`.  
**Env** (GitHub / Enterprise): `GITHUB_TOKEN` (preferred) ·
`GITHUB_ACCESS_TOKEN` · `GITHUB_API_DOMAIN` — key names in
[`BUN_GITHUB_ENV`](../github-repository-ref.ts).

⚠️ Local templates **delete** an existing destination directory; remote
templates do not overwrite without `--force`.

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

The library exports the pure diagnostic, cache, parse, and palette helpers from
[`index.ts`](./index.ts). For direct build-time conversion, prefer Bun's native
macro import—no project-specific palette owner is required:

```ts
import { color } from 'bun' with { type: 'macro' };

const accent = color('#e06c75', 'css');
```

Canonical references: [Bun.color](https://bun.com/docs/runtime/color) ·
[macros](https://bun.com/docs/bundler/macros).
