# Bun test, invariants, and snapshot architecture

Project R separates execution, truth, comparison, and presentation. Bun's test
runner executes tests and emits runner evidence. Domain modules own formulas and
state transitions. Snapshot tooling compares normalized artifacts only after the
relevant invariants pass. Report and notification adapters consume the combined
result; they never decide truth.

This is the research map and staged implementation boundary for improving
snapshot quality without turning rules, skills, or a central framework into the
controller.

## Runtime capability map

The pinned stable runtime is Bun 1.3.14. Use the exact-file forms below for
owned lanes; a bare positional value such as `tests` is a substring filter and
can collect unintended nested files.

| Bun capability                       | Stable semantics                                                  | Project R mapping                                       | Boundary                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Discovery and filtering              | Recursive test discovery; exact `./file.test.ts`; regex `-t`      | Explicit files in focused, snapshot, and contract lanes | Do not use a bare repository-wide update                                                 |
| `--changed[=REF]`                    | Git changes plus transitive import graph                          | `scripts/bun-test-changed.ts`                           | Developer selection, not complete merge proof; data and dynamic imports may be invisible |
| `--isolate`                          | Fresh global/module registry per file; resource cleanup           | `test:isolate` and changed-lane options                 | Use for state-sensitive domain tests                                                     |
| `--parallel[=N]`                     | Worker processes; implies isolation                               | Default changed lane and opt-in full lane               | Allocate ports/state by worker ID; do not also add `--isolate`                           |
| `--concurrent`                       | Overlaps async tests inside one worker/global                     | Not used directly                                       | Avoid for mutable domain fixtures                                                        |
| `--shard=i/n`                        | Deterministic file partition after selection                      | Local wrappers and four hosted shards                   | Balances files, not domain complexity                                                    |
| `--randomize --seed=N`               | Reproducible test order                                           | No regular robustness lane yet                          | Runner seed is not a generated-data seed                                                 |
| `--rerun-each`, `--retry`, `repeats` | Stress/retry execution                                            | Mostly ad hoc                                           | Never use retries to define correctness                                                  |
| Timeouts                             | CLI/per-test bounded execution                                    | Root 10s default; lanes override deliberately           | No infinite CI timeouts                                                                  |
| Snapshots                            | File, inline, error, and property-matcher snapshots; `-u`         | 11 catalogued suites and 19 exports                     | Property matchers mask fields; they are not property-based tests                         |
| JUnit                                | End-of-run CI interchange; no per-test stdout or exact timestamps | `test:ci`, shards, failure bake                         | Not the comprehensive quality schema                                                     |
| Inspector reporters                  | Streaming lifecycle/test events and JSONL                         | `scripts/inspect-tests.ts`                              | Observability lane, not verdict owner                                                    |
| Coverage                             | Text/LCOV, thresholds and filtering                               | Focused and CI coverage paths                           | Reachability is not invariant completeness                                               |
| Watch                                | Reactive rerun; combines with changed selection                   | Day-loop commands                                       | Not retained evidence                                                                    |

Official sources:

- [Bun test runner](https://bun.com/docs/test)
- [Test discovery](https://bun.com/docs/test/discovery)
- [Parallel and isolated runs](https://bun.com/docs/test/parallel)
- [Writing tests](https://bun.com/docs/test/writing-tests)
- [Runtime behavior](https://bun.com/docs/test/runtime-behavior)
- [Snapshots](https://bun.com/docs/test/snapshots)
- [Reporters](https://bun.com/docs/test/reporters)
- [Coverage](https://bun.com/docs/test/code-coverage)
- [Bun 1.3.13](https://bun.com/blog/bun-v1.3.13)
- [Bun 1.3.14](https://bun.com/blog/bun-v1.3.14)

Current Bun documentation also describes timing-balanced parallelism. Treat
`--timings` and `--update-timings` as Bun 1.4/canary candidates until the pinned
runtime exposes them and a focused repository proof passes.

## Repository execution map

Project R currently has about 690 root test files, 55 `test:*` package scripts,
and 12 declared workspaces. The important paths are:

| Intent                    | Owner                                             | What it proves                                                                                  |
| ------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Runtime defaults          | `bunfig.toml`, `tests/preload.ts`                 | Timeout, preload, coverage threshold, selected concurrency and ignore policy                    |
| Changed day loop          | `scripts/bun-test-changed.ts`                     | Native changed selection with parallel/serial/isolate/shard/watch options                       |
| Local merge authority     | `scripts/bun-ci.ts`                               | Core contracts, changed/fixed harness tests, snapshot catalog, types, security, portal registry |
| Broad suite               | `test`, `test:ci`, `test:parallel`, hosted shards | Larger root-owned test evidence; distinct from `bun:ci`                                         |
| Workspace selection       | `scripts/affected-workspaces.ts`                  | Affected workspace tests; currently separate from `bun:ci`                                      |
| Snapshot catalog          | `lib/portal/bun-test-snapshots.ts`                | Reviewed Bun Snapshot v1 files and scoped update routes                                         |
| Local data-plane captures | `tools/snapshot-core.ts`                          | Prediction, portal, gaps, and limits artifacts under `artifacts/snapshots/`                     |
| Failure presentation      | `tools/failures-bake.ts`                          | JUnit-derived JSON and HTML, not a business verdict                                             |

`bun:ci` is focused merge authority, not a synonym for all 690 root test files.
The hosted sharded workflow is broad evidence but remains non-authoritative and
serial while its isolation debt is unresolved.

## Separation of truth

```text
Bun runner context
  file selection, isolation, timeout, runner seed, reporter
                         |
domain-owned evaluator  |  pure formulas and state transitions
                         v
quality result protocol
  invariant records, source/runtime metadata, generated-data seed
                         |
generic snapshot engine
  canonical bytes, digest, accepted baseline, semantic diff
                         |
adapters
  JSON, Markdown, HTML, JUnit link, optional Telegram notification
```

The protocol combines independent evidence. It does not own formulas, rates,
thresholds, field lists, policy decisions, or snapshot approval.

### Invariant classes

| Class     | Owner and proof                                                                  | Snapshot acceptance                                                 |
| --------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Technical | Parser/schema/serialization/redaction/hash code with unit and boundary tests     | Deterministic drift may become an update candidate after tests pass |
| Domain    | The implemented domain model with examples and generated properties              | Manual domain review                                                |
| Policy    | Rates, eligibility, thresholds, source priority, permissions and promotion rules | Manual policy-owner review; never inferred from a green snapshot    |

A snapshot match does not prove an accounting invariant. Bun's test-order seed
does not reproduce generated business values. Coverage does not measure domain
rule completeness.

### Verdict lattice

Use categorical verdicts, not a weighted score:

1. a hard technical, security, or domain failure is `failed`;
2. a protected domain/policy change is `review-required`;
3. snapshot-only drift is `update-candidate` only when all checks pass and every
   changed projection is eligible;
4. non-blocking warnings produce `passed-with-warnings`;
5. otherwise the result is `passed`.

No average score can hide one failed accounting, authorization, compliance, or
model-eligibility invariant.

## Domain map

The first property adapters should live beside existing authority:

| Domain             | Existing authority                                                                          | High-value generated properties                                                                                   | Protected policy                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Partner settlement | `lib/partner-profile/ledger.ts`, `settlement-runner.ts`, `finance-report.ts`                | Cumulative balances; net flow; commission/net algebra; idempotency; currency-safe round trips                     | Rates, cadence, currency, source/provenance                      |
| Operations limits  | `lib/operations/limit-patterns.ts`, `limit-raises-snapshot.ts`, `account-limit-profiles.ts` | Raises + decreases = changes; net delta; scoped aggregate reconciliation; deterministic order                     | Legal ceilings, jurisdiction, source tiers, allow/deny decisions |
| Seat capital       | `lib/telegram/seat-capital-desk.ts`, `seat-desk-snapshot.ts`                                | Status counts reconcile; normalization idempotence; redaction under adversarial inputs; order independence        | Destinations, funding gates, partner-facing semantics            |
| Model circuits     | `lib/operator-research/model-contracts.ts`, `edge-engine.ts`                                | Diagnostic fields never affect weights; finite/bounded output; eligibility equivalence                            | Weight inputs, source eligibility, locked flags, model sinks     |
| Identity           | `lib/identity/`                                                                             | Secret non-disclosure; lockout/session state machines; single-use recovery/challenges; authorization monotonicity | Roles, TTLs, MFA and fail-open/fail-closed policy                |
| Structured data    | `lib/data-format-lab.ts`, `data-format-operation-proof.ts`                                  | JSON/JSON5 round trips; JSONL chunk equivalence; canonical hash; size boundaries; XML security cases              | Exposure, Access, minimum runtime, XML entity policy             |

The proposed `masters`, `owed`, and customers-per-host formulas are not yet
implemented domain contracts. `owed` appears only in a design document, while
the live partner ledger uses gross, commission, net, and adjustment. Do not
encode or approve those proposed formulas until their owner and wire shape are
selected.

## Snapshot systems and upgrade sequence

There are three different artifact systems; do not merge their meanings:

1. committed `bun:test` snapshots under `tests/__snapshots__/`;
2. gitignored data-plane captures under `artifacts/snapshots/`;
3. operational registry bakes and scheduled portal artifacts.

The first hardening batch is runner/snapshot truth only:

- derive snapshot IDs from the catalog instead of maintaining a second union;
- fail when a test uses a file snapshot without a catalog entry;
- label committed suites as technical, domain, or policy and expose whether
  drift is an update candidate or manual-only;
- reject malformed/traversal snapshot IDs before constructing paths;
- bound network fetches and treat required-asset failure as capture failure;
- write the JSONL index under an exclusive lock with atomic replacement;
- make CLI and cron results reflect `status=error`;
- preserve the test process exit when baking a JUnit failure report.

The second batch adds independent, executable primitives:

1. `lib/quality/` owns only the typed verdict lattice, deterministic generated
   cases and shrinking, canonical JSON with SHA-256/SHA3-256, and bounded
   semantic diff;
2. partner-owned properties prove minor-unit round trips, cumulative balances,
   settlement algebra, dry-run/post equivalence, and period idempotency;
3. structured-data properties prove complete JSONL parsing across every
   two-chunk character boundary and fail closed on malformed/truncated input;
4. `bun run test:invariants` executes that evidence before the snapshot catalog
   in `bun:ci`.

The third batch adds report and promotion adapters without changing truth:

1. `bun run quality:report` runs the invariant lane and atomically publishes one
   immutable envelope as dated JSON, Markdown, and HTML plus `/reports/latest`;
2. the HTML projection uses semantic landmarks, labeled sections and tables, a
   metadata aside, and a keyboard skip link backed by `.portal-skip-link`;
3. `bun run quality:baseline:accept -- --accept ...` requires an exact scope,
   reviewed candidate digest, expected current baseline digest, intact report,
   `update-candidate` verdict, and only eligible changed checks before its
   atomic write.

The remaining batches stay separate:

1. let Telegram consume the final change event behind a feature flag;
2. add further domain-local properties for limits, seat capital, models, and
   identity state machines.

CI may upload a candidate or propose a patch. It must never silently rewrite an
accepted baseline.

## Operational checks

```bash
bun tools/bun-test-snapshots.ts --check --json
bun run test:invariants
bun run test:snapshots
bun run test:changed -- --dry-run
bun run test:inventory
bun run test:affected
bun test ./tests/snapshot-data-plane.test.ts ./tests/bun-test-snapshots.test.ts
```

Run the broad root suite separately from `bun run bun:ci` when complete-suite
evidence is required.
