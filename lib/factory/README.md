# Factory — R2-backed artifact registry

Registry client, CLI, and template scaffolding for the FactoryWager internal
package registry.

## Structure

| File                  | Role                                                                             |
| --------------------- | -------------------------------------------------------------------------------- |
| `artifact.ts`         | Branded ArtifactName/Version/Id types + ArtifactRelease schema                   |
| `object-store.ts`     | `RegistryObjectStore` — memory (tests) + `S3Client` SigV4 (live)                 |
| `markdown.ts`         | `Bun.markdown` helpers — **Bun runtime only** (never import from `functions/`)   |
| `registry.ts`         | RegistryClient: publish, install, list, search, fetchReadme                      |
| `health.ts`           | Bun-host health report: R2 probe, package/version counts, integrity status       |
| `integrity.ts`        | Full artifact size + SHA-256 verification                                        |
| `alerts.ts`           | Slack and Telegram alert delivery without secret logging                         |
| `monitoring.ts`       | One-shot integrity cycle + in-process Bun cron complement                        |
| `server.ts`           | Bun VM gateway: `routes` (health/ready/index/POST publish) + `fetch` object keys |
| `cli.ts`              | CLI (env, publish, list, search, install, readme, snapshot, create, help)        |
| `publish-metadata.ts` | package.json + README from publish path / `.tgz` (BM-5; prefer over CWD)         |
| `semver.ts`           | Bun.semver wrappers: sortVersions, satisfiesRange, resolveVersion                |
| `index.ts`            | Barrel exports                                                                   |

## Quick start

```bash
bun run factory --version
bun run factory:list
bun run factory:snapshot          # → public/registry/registry.json
bun run factory:create -- factory-library ./packages/my-lib
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
