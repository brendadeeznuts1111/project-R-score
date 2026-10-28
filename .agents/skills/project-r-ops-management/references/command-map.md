# Command map

Run from the claimed Project R worktree.

## Runtime and lane preflight

```bash
bun --version
bun --revision
bun run bun:channel:check
bun run lane:status
```

## Bun scaffold, config, and lockfile proof

```bash
bun run factory:templates
bun test tests/factory-template.test.ts tests/cli.test.ts tests/console-depth.test.ts
bun run portal:doctor -- --group bunfig
bun run install:verify
bun tools/bun-doc-refs.ts check .bun-create/factory-library/scripts lib/factory/cli.ts
```

For an installed-artifact journey, create a disposable destination with
`bun run factory:create -- factory-library <destination> --no-git`, then run
`bun run check`, `bun run lockfile:check`, and the secret-free
`bun run release:dry-run` after deliberately arming fixture package metadata.
The Factory lockfile gate must first require and parse `bun.lock`; Bun 1.3.14's
frozen dry run can succeed without creating a missing lockfile. The subsequent
`bun install --frozen-lockfile --dry-run --ignore-scripts` is the native
package-to-lock coherence proof.

Keep ownership explicit:

- `harness.toml` is the Factory closed schema and config mirror.
- `bun.lock`, `bunfig.toml`, CLI flags, and `Bun.*` APIs are Bun-owned.
- The standalone library template carries isolated/global-store settings for
  portability and keeps only its first-lock development bootstrap unfrozen.
- Project R root install policy remains machine-owned and hardened; prove it
  with the bunfig doctor and install verifier above.

## Structured-data capability proof

```bash
bun --version
bun --revision
bun run data-formats:check
```

This is the read-only proof for JSON, JSONC, JSON5, JSONL, YAML, TOML, and XML.
It validates positive operations, malformed-input behavior, semantic round trips
for parse/stringify formats, byte ceilings, hashes, and correctly converted
`durationNs`/`durationMs` evidence. `Bun.XML` is reported as `runtime-gated`
until the active runtime meets the manifest minimum and exposes every required
operation.

Refresh the protected static artifact only as an explicit write:

```bash
bun run data-formats:bake
```

Do not enable the surface until runtime gates, operation proof, and live
Cloudflare Access proof all pass. A bake is not a runtime promotion or an
Access-policy mutation. The full integrity, promotion, and rollback contract is
in [`structured-data-runbook.md`](structured-data-runbook.md).

## Skill health and dynamic evidence

```bash
bun run skills:rate
bun run skills:rate:dynamic
bun run skills:schedule:check
```

The first command reports static compliance only. The dynamic command executes
bounded, scoped structure/runtime/contract proofs and reports an evidence score,
overall score, and confidence separately only for skills with explicitly owned
runtime or contract evidence. Other skills remain `unproven`, not numerically
ranked. The six-hour `skill-deep-score` scheduler job owns recurring dynamic
collection; do not run a second daemon.

## Bun channel proof

```bash
bun run bun:channel:check
bun test tests/bun-channel-doctor.test.ts tests/bun-channel-doctor-cron.test.ts
bun run type-check:ci
```

## Bun enhancement proof

```bash
bun run enhancements -- show
bun run enhancements -- check
bun run enhancements -- agent-test
```

`show` resolves the current Bun runtime and environment without writing. `check`
validates registry structure, evidence paths, and the committed well-known bake.
`agent-test` proves the experimental image resolver selects fallback and native
states as the flag changes. It does not execute image behavior; the owning
avatar and server tests remain separate. Use `bake` only for an intentional
generated-artifact refresh.

For runtime promotion evidence, invoke the same focused tests and benchmark
through explicit stable and temporary canary binaries:

```bash
bun run bench:bun-upgrade
/absolute/path/to/temporary/canary/bun tools/benchmarks/bun-upgrade-probes.ts
```

Never run `bun upgrade --canary` against the reviewed stable executable. A
Windows ARM64 cross-compile proves artifact generation only; execution proof
requires a Windows ARM64 host. The offline desk experimental proof is:

```bash
bun run build:desk:offline
bun test tests/build-offline-desk.test.ts
```

It produces one self-contained local HTML artifact while leaving the online desk
source unchanged; promotion still requires rollout evidence.

`bun:channel:check` is read-only. `bun:channel:report` is the explicit derived
artifact write. Scheduler registration and removal are manual host mutations.

## Bun API documentation provenance

```bash
bun test tests/bun-doc-refs-scanner.test.ts tests/bun-docs-catalog.test.ts tests/bun-docs-release.test.ts
bun tools/bun-docs-catalog.ts verify
bun run docs:provenance:check
```

The ordinary provenance gate requires every recorded introduction, fix, change,
and `releaseHits` event to match the exact official RSS version, canonical
publication timestamp, and Bun post URL. It permits explicitly unknown release
history rather than inventing a date. Use
`bun run docs:provenance:check -- --require-release` only as a deliberate
completeness ratchet. Persisted feed, overlay, scrape-state, and catalog inputs
fail closed; recover incomplete scrape state with
`bun tools/bun-docs-releases.ts scrape --force` after reviewing the artifact.

## Bun 1.4 release-graph proof

```bash
bun run docs:blog-assets:check
bun run channels:bun-1.4:check
bun test tests/bun-1.4-capabilities.test.ts tests/bun-1.4-feeds.test.ts tests/bun-1.4-channel-release.test.ts
(
  cd .agents/skills/ast-grep
  bun run bun:1.4:migration:check
)
```

The source manifest owns assets and rights state; the capability registry owns
release fact ↔ adoption ↔ contract relations; the channel-release registry owns
active item membership and archive addressing; the ast-grep audit owns
syntax-shaped migration findings and its reviewed negative-contract expectation.
Do not use one as proof for a different layer.

## Test and snapshot proof

| Intent                   | Command                                                  | Contract                                                                     |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Changed-file development | `bun run test:watch`                                     | Watch the affected set through the owned wrapper and timing cache.           |
| Focused proof            | `bun test <test-file...>`                                | Name exact files; add `-t <pattern>` only for a narrower behavior.           |
| Focused coverage         | `bun run test:coverage -- <test-file...> [-t <pattern>]` | Exact files first; wrapper owns text + LCOV output under `coverage/focused`. |
| Changed staged scope     | `bun run test:changed`                                   | `--changed` plus Bun 1.4 adaptive timings and parallel files.                |
| Snapshot catalog check   | `bun run check:snapshots`                                | Validate headers, registrations, and orphan state without running tests.     |
| Snapshot contract proof  | `bun run test:snapshots`                                 | Run every registered snapshot suite.                                         |
| Scoped snapshot update   | `bun tools/bun-test-snapshots.ts --update --id <id>`     | File-scoped `-u`; review and stage only the owned diff.                      |
| Staged gate              | `.husky/pre-commit`                                      | Path-gated staged checks.                                                    |
| Merge-base test proof    | `bun run test:changed:main -- --parallel=4`              | Bun 1.4 timings plus bounded workers; isolate every writable fixture.        |
| Merge proof              | `bun run bun:ci`                                         | Clean-worktree local authority, including the snapshot catalog.              |

Flag boundaries:

- `--parallel[=N]` distributes files and implies `--isolate`; never pass both.
- `--concurrent` and `--max-concurrency` control tests within a file.
- `--shard=M/N` splits files across deliberate CI jobs; it is not a local
  default.
- `-u` / `--update-snapshots` mutates expected output. Keep it file-scoped and
  never place it in a verification or merge command.
- `--randomize --seed=<n>` and `--rerun-each=<n>` are diagnostic lanes for
  ordering and flake detection. Record the seed or repetition count.
- `--timings=<path> --update-timings` is the finite-run scheduling pair. The
  owned wrapper defaults to `.cache/bun-test-timings.json`; `--no-timings` is a
  diagnosis-only opt-out.
- `--coverage`, `--bail`, `--retry`, and `--smol` change the proof being run;
  add them only when the owning script or investigation requires them.

For a slow pre-commit hook, run `bun run precommit:profile`. The emitted
`reports/precommit-cpu.md` uses Bun 1.4's boolean `--cpu-prof-md` with separate
`--cpu-prof-dir` and `--cpu-prof-name` routing. For CI wall-time, inspect
`reports/ci-core-timing.json`: `wallMs` is elapsed time and `totalMs` is the
parallel step sum.

## Release proof

```bash
bun --version
bun --revision
bun run bun:channel:check
bun run check:release-tracker
bun run type-check:ci
```

Before merge, run `.husky/pre-commit` and `bun run bun:ci` from a clean
worktree.

## Security proof

```bash
bun run security:guard:deps
bun run security:audit
```

## Search governance proof

```bash
bun run search:policy:check
bun run search:status:unified:strict
bun run search:bench:gate --json
```

Refresh owned artifacts only when strict status reports drift. Baseline
promotion requires explicit approval and `.search/POLICY_CHANGELOG.md` evidence.
