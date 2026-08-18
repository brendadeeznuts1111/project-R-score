# `bun publish` alignment reference

**Upstream source:**
[Bun `bun publish` documentation](https://bun.com/docs/pm/cli/publish).  
**Runtime reviewed:** Bun 1.3.14.  
This is a semantic map, not a replacement for the upstream reference. Re-check
the active CLI with `bun publish --help` when updating Bun.

## Ownership boundaries

| Plane                     | Owns                                                                                                                             | Does not own                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Bun `publish`             | Packing the current package, native registry upload, publish lifecycle, npm-compatible registry configuration, and publish flags | Factory R2 artifact indexing or portal snapshots                                    |
| Template `package.json`   | Package metadata, `files`, safe `publishConfig` defaults, and proof lifecycle scripts                                            | Registry URL, authentication token, and a user's access policy for a scoped package |
| Factory artifact registry | Explicit archive upload/index and snapshot refresh                                                                               | Native npm registry publication or Bun lifecycle execution                          |
| Operator / CI             | Registry/account selection, credentials, release version, release tag, access override, and final release verification           | Silent policy changes in the reusable template                                      |

## Native route and Factory route

| Intent                         | Command                                | Lifecycle                                                                         | Result                                                    |
| ------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Inspect release package        | `bun run release:dry-run`              | Release requirements pass, then `bun pm pack --dry-run` runs the local lifecycle  | No upload and no registry credential requirement          |
| Simulate native publication    | `bun publish --dry-run`                | Bun packs the current directory and runs the local lifecycle                      | No upload, but Bun 1.3.14 still requires registry auth    |
| Native registry release        | `bun publish`                          | Bun packs the current directory, runs `prepack`, then `postpublish` after success | Package is sent to the configured npm-compatible registry |
| Create a Factory artifact      | `bun pm pack`                          | `prepack` runs before the archive is created                                      | Local `.tgz` with the template's allowlisted files        |
| Upload Factory artifact        | `bun run factory:publish -- <archive>` | No Bun lifecycle: the archive already exists                                      | Explicit R2 artifact/index update                         |
| Publish a prebuilt npm tarball | `bun publish ./package.tgz`            | No Bun publish lifecycle                                                          | Archive is uploaded as supplied                           |

The last two routes are deliberately separate from a source-directory Bun
publish. A prebuilt archive must have been produced by a checked process.

## Template contract

```json
{
  "private": true,
  "license": "UNLICENSED",
  "files": ["src", "README.md"],
  "publishConfig": {
    "access": "public",
    "tag": "latest"
  },
  "scripts": {
    "check": "…",
    "prepack": "bun run check",
    "postpublish": "bun run scripts/postpublish.ts",
    "requirements:release": "bun scripts/requirements.ts release",
    "requirements:publish": "bun scripts/requirements.ts publish",
    "release:dry-run": "bun run requirements:release && bun pm pack --dry-run",
    "publish:ci": "bun run requirements:publish && bun publish"
  }
}
```

`prepack` is the package-integrity gate: it refreshes and validates `files.md`,
type checks source/tests/scripts, runs tests, and builds the source entry point.
The separate release gate requires a deliberate description, repository,
license, `private: false`, and a non-empty `bun.lock`. The publication gate adds
only the non-empty token requirement. A new scaffold therefore remains runnable
and packable but cannot be published accidentally; Bun 1.3.14 independently
rejects its native publish path while `private` is true.

`postpublish` has no external side effects; it reports package/version/tag for
operator verification. `files` remains the package boundary, so local proof
files, reports, profiles, scripts, and tests are not published.

`publishConfig` is intentionally limited to the generic unscoped-library
defaults. Do not commit a registry URL or credential into the template. A scoped
restricted package must explicitly choose `restricted` access before its
release.

## Configuration and credentials

| Input                    | Owner                       | Purpose                                           | Template policy                                                                    |
| ------------------------ | --------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `publishConfig.access`   | package manifest            | Default package access (`public` or `restricted`) | Template defaults to `public`; revise deliberately for a scoped restricted package |
| `publishConfig.tag`      | package manifest            | Default distribution tag                          | Template defaults to `latest`; use CLI `--tag` for one-off channels                |
| `bunfig.toml` / `.npmrc` | project or user environment | Registry/scoped registry configuration            | Never bake a registry URL into the reusable template                               |
| `NPM_CONFIG_TOKEN`       | Proton Pass → process env   | Non-interactive Bun registry authentication       | `.env.example` names it empty; never write its value to files or source control    |
| `--registry <url>`       | release command             | Overrides configured registry for a release       | Prefer for an intentional one-off registry target                                  |
| `--otp` / `--auth-type`  | release command             | Registry two-factor authentication                | Use only at publish time; never persist an OTP                                     |

## Flag map (Bun 1.3.14)

| Category               | Flags                                                                                                          | Template/operator guidance                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Release                | `--dry-run`, `--access`, `--tag`, `--tolerate-republish`, `--gzip-level`                                       | Native controls. Use the template's pack-based `release:dry-run` when proof must remain secret-free.    |
| Registry/auth          | `--registry`, `--config`, `--otp`, `--auth-type`, `--ca`, `--cafile`                                           | Keep endpoints and credentials out of template source.                                                  |
| Lifecycle/security     | `--ignore-scripts`, `--trust`, `--minimum-release-age`, `--no-verify`                                          | Do not use `--ignore-scripts` for a checked release; reserve the rest for reviewed exception workflows. |
| Dependency/install     | `--production`, `--omit`, `--frozen-lockfile`, `--force`, `--no-save`, `--lockfile-only`, `--linker`, `--yarn` | Generally unnecessary for the source-first template release path.                                       |
| Platform/network/cache | `--backend`, `--network-concurrency`, `--concurrent-scripts`, `--cache-dir`, `--no-cache`, `--cpu`, `--os`     | Diagnose or tune only with an explicit release-environment need.                                        |
| Output/context         | `--cwd`, `--silent`, `--quiet`, `--verbose`, `--no-progress`, `--no-summary`                                   | Useful for CI/log shaping; do not suppress the proof gate.                                              |

`bun pm pack` has its own focused flags: `--dry-run`, `--destination`,
`--filename`, `--gzip-level`, `--quiet`, and `--ignore-scripts`. The last one
also bypasses the package proof and is unsuitable for a normal release archive.

## Release proof

```text
source change
  → bun run check
  → customize description / license / repository; set private=false
  → review and retain bun.lock
  → bun run release:dry-run
  → review the exact package files
  → supply NPM_CONFIG_TOKEN from Proton Pass
  → bun run publish:ci          (native registry route)
       or
  → bun pm pack → bun run factory:publish -- <archive>  (Factory artifact route)
  → verify registry or Factory index state
```

For a retry after the exact version was already accepted, use
`bun publish --tolerate-republish` only when the registry's idempotent success
semantics are desired. It is not a substitute for version management.

## Verified template baseline

- `bun run check` passes in a fresh local scaffold without credentials.
- `bun run requirements:release` fails on the four deliberate safe defaults.
- `bun pm pack --dry-run` triggers `prepack` and contains only `package.json`,
  `README.md`, and `src/index.ts`.
- `bun run postpublish` is side-effect-free and emits package/version/tag.
- No actual npm registry publish is performed by this repository proof.
