# Bun enhancement pipeline

Project R exposes Bun adoption decisions through one data contract:
[`config/enhancements/registry.jsonc`](../../config/enhancements/registry.jsonc).
The registry is discovery data, not a second controller. Runtime behavior stays
in the owning module and CI behavior stays in repository scripts.

```bash
bun run enhancements -- show
bun run enhancements -- check
bun run enhancements -- agent-test
bun run docs:enhancements
```

`bake` is the only write mode. It refreshes `public/.well-known/experiments`;
review that generated diff separately.

## Kind plus independent states

Every item first declares a kind: `guarded-feature`, `runtime-capability`,
`cli-capability`, or `compatibility-lane`. It then reports facts that must not
be collapsed:

1. **Availability** — the active Bun runtime satisfies `minimumBunVersion`.
2. **Lifecycle** — Project R adoption is proposed, experimental, beta, stable,
   deprecated, or removed.
3. **Enablement** — only for guarded features, the environment default plus an
   allowed explicit override. Other kinds report `enabled: null` because
   availability does not prove invocation or configuration.

`introducedIn` is historical provenance and may be `null` when the exact first
release is not proven. Never substitute the oldest known fix or the currently
installed version. `minimumBunVersion` is an executable compatibility floor, not
an introduction claim.

| Status       | Default                                             | Promotion evidence                                             |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------- |
| Proposed     | Always off; an environment override is ignored      | owner and guarded implementation PR                            |
| Experimental | Off; strict boolean override accepted               | bounded dev proof for both paths                               |
| Beta         | On in staging, off elsewhere; override accepted     | at least 7 days, zero critical errors, performance ratio ≥0.90 |
| Stable       | On when the runtime is compatible; no flag remains  | 10% → 50% → 100%, then 3 days at 100%                          |
| Deprecated   | Off                                                 | replacement and removal owner                                  |
| Removed      | Off; no live implementation may depend on the entry | cleanup proof                                                  |

Promotion remains a reviewed repository change. The registry describes the
decision and the CLI rejects inconsistent states; it does not promote itself
from wall-clock time or mutable telemetry.

## Dynamic resolution

`lib/enhancements/registry.ts` parses JSONC once at the wire boundary and
creates a typed snapshot. It reads strict `true`, `false`, `1`, or `0` overrides
from `Bun.env`. Proposed, deprecated, removed, and incompatible items remain
disabled regardless of an override.

`lib/enhancements/store.ts` owns development reload. A file-system notification
parses a complete candidate and atomically swaps the in-memory snapshot. A
malformed edit is rejected and the last valid snapshot remains live. The
compatibility bridge deliberately uses `node:fs.watch`: Bun's `--watch` and
`--hot` restart or reload imported code; there is no `Bun.watch()` callback API.
Production Pages serves the committed bake and never watches repository files.

Do not mutate `process.env` to broadcast new state. Environment variables are
inputs; consumers read the current store snapshot.

The local avatar route is the first real consumer. When `bun-image` is enabled
it runs the native transform; when disabled it serves a prebuilt WebP and
returns 503 on a cache miss. Project R has no `sharp` dependency, so pretending
that Sharp remains a fallback would make the registry lie about deployability.

## Agent discovery

Fetch `/.well-known/experiments` before choosing an enhancement-specific path.
Each row exposes `kind`, `available`, nullable `enabled`, `minimumBunVersion`,
an optional `bunVersionRange`, the official docs, and the decision reason. Root
HTML advertises it with:

```http
Link: </.well-known/experiments>; rel="help"
```

The repository has no `desk.json` discovery contract. Adding an unrelated root
manifest would violate root-placement policy, so the standards-based well-known
route is the machine entrypoint.

## Promotion and rollback

For each status change:

- test both enabled and fallback paths;
- record the evidence paths in the registry;
- run the relevant MIME, 404, Range, and 304 checks for public artifacts;
- update `status`, criteria evidence in the owning PR, and the generated bake;
- run `bun run enhancements -- check` and the owning product gate.

Rollback is operationally simple: set an accepted beta/experimental flag to
`false`, then demote the registry status in a reviewed PR and open the owning
follow-up. Stable features have no flag; rollback requires restoring a guarded
fallback in source before demotion. Git history plus deployment artifacts are
the audit trail; do not create an unowned mutable history database.

## Upstream provenance corrections

- The native class is `Bun.Glob`, not `Bun.glob`. Its exact introduction is
  intentionally unknown in the registry because current evidence only proves it
  existed by Bun 1.0.27.
- `Bun.cron` OS registration and parsing shipped in 1.3.11; the in-process
  callback used by this proposal shipped in 1.3.12.
- `Bun.JSONC.parse` and `Bun.Archive` shipped in 1.3.6.
- `Bun.WebView` shipped in 1.3.12 and remains experimental upstream.
- `Bun.Image` and experimental HTTP/3 support shipped in 1.3.14.

Resolve future claims with `bun tools/bun-doc-refs.ts history <api> --json` and
the exact official Bun release post before updating this registry.

## Runtime upgrade evidence

The registry tracks `bun-runtime-1-4` as an experimental compatibility target,
not as the production runtime. Project R remains pinned to stable Bun 1.3.14;
the channel doctor is read-only and promotion is a separate reviewed change. Do
not run `bun upgrade --canary` against the installed stable executable. Copy the
binary to a temporary directory or use an explicitly resolved canary binary and
invoke it by absolute path.

The 2026-08-16 probe used Bun `1.4.0-canary.1+8326d1bd3`:

- the focused BunFile contract passed MIME, Range/206, Last-Modified/304,
  buffered ETag, stream, and HEAD checks;
- the enhancement registry and development reload tests passed;
- the broad `bun test --parallel tests` command accidentally selected 984 test
  files across nested projects because `tests` is a filename pattern, not a
  root-directory boundary. Its crash reproduces on stable 1.3.14 and canary when
  two malformed nested-project test cases run together, so it is not evidence of
  a canary regression;
- an explicit 678-file root-owned list completed without a panic on canary
  (5,043 pass, 33 fail) and stable (5,059 pass, 24 fail). Those remaining
  differences still block promotion until classified;
- no official evidence supports describing Bun 1.4 as a “Rust rewrite”, so that
  phrase is intentionally absent from the machine contract.

`bun test --parallel` already implies `--isolate`. Keep `test:isolate` as the
serial diagnostic lane and do not add both flags to the same command. Bun's
native `--changed` flag remains wrapped by `bun run test:changed` so the repo
can retain its empty-set and main-head policy.

## Artifact integrity and performance probes

Registry tarballs retain SHA-256 for npm-compatible SRI and now publish an
independent `{ algorithm: "sha3-256", digest }` record for Project R
verification. Consumers must verify the declared algorithm; a SHA3 digest must
never be mislabelled as npm's `sha256-...` integrity field.

Run `bun run bench:bun-upgrade` with each explicit runtime binary. The probe
uses `Bun.nanoseconds()` for elapsed measurement and emits both raw nanoseconds
and derived milliseconds (`ms = ns / 1_000_000`). It measures `Bun.gzipSync` and
an in-memory source-map build. One sample is not a performance claim: retain
multiple runs under the same machine load before using a ratio for promotion.

Windows ARM64 cross-compilation is a build proof, not an execution proof. Bun
1.3.14 successfully produced a PE32+ AArch64 executable with
`--target=bun-windows-arm64`; native runtime validation still requires a Windows
ARM64 host.

The offline desk is now experimental. `bun run build:desk:offline` stages a
disposable entry, embeds the ten registry datasets, removes network-only
dependencies, and uses `bun build --compile --target=browser` to emit one HTML
artifact. Focused tests assert that the online source is unchanged and the
output has no relative or root-relative script/link dependencies. This is local
build proof, not yet a production rollout.
