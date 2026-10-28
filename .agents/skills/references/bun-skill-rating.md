# Bun skill rating contract

`bun run skills:rate` supplements structural `skills:validate` with Bun-first
static compliance findings. It scans every text resource in each active governed
skill package and records deterministic bonuses and penalties. A compliance
value of 100 means only that the current detectors found no penalty; it is not a
quality, correctness, or confidence claim.

Use `bun run skills:rate:dynamic` to execute bounded live repository proofs and
combine them with static compliance. Use `-- --json` with either command for
machine-readable evidence.

## Rules

| Rule                                                                                         |      Delta | Boundary                                                                     |
| -------------------------------------------------------------------------------------------- | ---------: | ---------------------------------------------------------------------------- |
| POSIX `rm`, `cp`, or `mkdir` without imported Bun Shell `$` or an explicit platform boundary |         -8 | Shell examples and scripts                                                   |
| Node `fs` without `Bun.file`, `Bun.write`, `Bun.Glob`, or justification                      |         -6 | Imports and executable examples                                              |
| Node `crypto` without an applicable Bun/Web Crypto alternative or justification              |         -6 | Imports and executable examples                                              |
| Node `path` without the repository adapter                                                   | 0 advisory | Bun has no general `Bun.path`; do not invent one                             |
| CI/deployment `bun install` without `--frozen-lockfile`                                      |         -5 | Same command context only                                                    |
| Worker/serverless production install without `--production` or `--omit dev`                  |         -4 | Same command context only                                                    |
| Operational dotenv loading without `Bun.env` or Bun env-file behavior                        |         -5 | Imports, installs, or `.config()` calls                                      |
| Configuration guidance centered on `process.env` without a Bun environment boundary          |         -5 | Environment/configuration sections                                           |
| Node `net`/`stream` without Bun sockets or Web Streams                                       | 0 advisory | Compatibility may be intentional                                             |
| `#!/usr/bin/env node`                                                                        |         -4 | Executable text resources                                                    |
| Node-backed package script invoked through `bun run` without `bun run --bun` guidance        |         -4 | Only when forcing Bun is relevant                                            |
| `better-sqlite3` or `sqlite3` dependency/import without `bun:sqlite` or justification        |         -7 | The `sqlite3` inspection CLI alone is not a dependency                       |
| Third-party XML parser without `Bun.XML` or semantic justification on Bun 1.4+               |         -7 | Inactive below Bun 1.4; DOM, validation, and streaming needs may justify it  |
| Unguarded `Bun.XML` guidance below Bun 1.4                                                   |         -8 | The API is absent from Project R's pinned Bun 1.3.14                         |
| Critical external `fetch()` example without an abort signal or timeout                       |         -6 | Literal HTTP(S) fetches                                                      |
| Bun server example without `--watch` or `--hot` developer flow                               |         -5 | `Bun.serve`, `Bun.listen`, or equivalent `serve()`                           |
| Unsupported `Bun.watch()` example                                                            |         -8 | Use `bun --watch`, `bun --hot`, `node:fs.watch`, or `node:fs/promises.watch` |
| Unsupported `bun:lock` or `Lock` import from `bun`                                           |         -8 | Use an owned atomic-write or inter-process-lock strategy                     |
| `Bun.cron` child process without an absolute timeout or termination path                     |         -6 | Scheduled `Bun.spawn` examples                                               |
| Version-sensitive Bun feature without `bun --version` or `Bun.version`                       |         -6 | Currently Bun Shell, Cron, Zstd, and catalog protocol examples               |
| Operational npm/npx command                                                                  |         -6 | Negative examples such as “never use npx” are excluded                       |
| `SKILL.md` longer than 500 lines                                                             |        -10 | Progressive-disclosure boundary                                              |
| Missing `agents/openai.yaml`                                                                 |         -3 | Interface metadata                                                           |
| Canonical `bun x` usage                                                                      |         +2 | Total remains capped at 100                                                  |

## Grounded corrections

- Bun 1.3.14 exposes Bun Shell through both `Bun.$` and
  `import { $ } from "bun"`; accept either form. Version-gated guidance must
  retain the operational `bun --version` check.
- `Bun.ConnectTimeout` is an error class, not an automatic retry policy. Use
  `AbortSignal.timeout`, an `AbortController`, and an explicit bounded retry
  policy appropriate to the external API.
- `bun run --bun` forces a script or package to use Bun instead of Node. Plain
  `bun run` is valid and receives no penalty unless the invoked script is
  explicitly Node-backed.
- The installed Bun CLI supports `bun install --production` and `--omit dev`. Do
  not document an unverified `--no-dev` alias.
- Node compatibility modules are not automatically defects. Penalize only when
  an applicable Bun-native or Web-standard replacement exists for the shown use
  case.
- `Bun.XML.parse`, `Bun.XML.stringify`, direct `.xml` imports, and the XML
  bundler loader first ship in Bun 1.4. Project R's pinned Bun 1.3.14 does not
  expose `Bun.XML`, so third-party XML packages remain valid until the runtime
  pin advances. On Bun 1.4+, preserve an explicit justification when DOM APIs,
  DTD validation, or streaming SAX behavior is required.
- `Bun.JSON5` exposes both `parse` and `stringify`; operational proof includes
  malformed-input rejection and semantic parse/stringify/reparse equivalence.
- `Bun.JSONL.parse` handles complete input, while `parseChunk` returns
  `{ values, read, done, error }` for incremental input. `parseChunk` reports a
  syntax failure through `error` rather than throwing, and JSONL has no native
  stringify operation. Score claims at the operation level, not by namespace
  presence.
- `Bun.nanoseconds()` returns nanoseconds. Preserve that raw value as
  `durationNs`; a displayed millisecond value is `durationNs / 1_000_000`.

## Scheduler boundary

- `Bun.cron` first shipped OS-level registration and expression parsing in Bun
  1.3.11. The in-process callback overload arrived in Bun 1.3.12. Skills using
  either form must state and verify their minimum runtime.
- Use `bun --watch` or `bun --hot` for imported-module reloads. For event-level
  file paths, use Bun's supported `node:fs.watch` or `node:fs/promises.watch`
  implementation; `Bun.watch()` is not an API in Bun 1.3.14.
- In-process cron jobs do not survive process exit. OS-level
  `Bun.cron(path, schedule, title)` mutates crontab, launchd, or Windows Task
  Scheduler and therefore requires explicit operator authorization and an
  uninstall path.
- In-process handlers never overlap, but a hung child can prevent the handler
  from settling indefinitely. Scheduled `Bun.spawn` work needs an absolute
  timeout, termination, awaited exit, and a recorded failure result. Repository
  scheduler implementations must use `lib/harness/managed-process.ts` instead of
  open-coding that lifecycle.
- Measure an attempt's elapsed duration with monotonic `Bun.nanoseconds()`.
  Preserve canonical `durationNs`, derive `durationMs` for display, and record
  `clockSource` with the evidence. Keep `Date` wall time for persisted ISO
  timestamps, cron epochs, and cross-process lease age; process-relative
  nanoseconds cannot represent or compare those values across restarts.
- Measure the complete managed lifecycle separately from its attempts so retry
  backoff and process-launch overhead remain visible. Scheduler state records
  whole-run `processLifecycleDurationNs` plus `finalAttemptDurationNs`; derived
  millisecond fields are display conveniences, never wall-time subtraction.
- Duration provenance is versioned evidence. State written before the monotonic
  clock contract is migrated as `wall-clock-legacy`; do not silently relabel an
  old measurement as `bun.nanoseconds`.
- `Bun.write()` overwrites a destination; the API contract does not promise a
  transactional rename. Publish shared JSON through a same-directory temporary
  file plus an atomic rename. Bun 1.3.14 exposes neither `bun:lock` nor `Lock`
  from `bun`, so cross-process coordination must use an explicitly owned lock
  implementation.
- A scheduler may generate a local health report autonomously. Creating a
  branch, commit, pull request, notification, or other external side effect
  still requires the authorization governing that action.
- Project R's hybrid implementation is `config/skill-health-scheduler.json` plus
  `lib/harness/skill-health-{manifest,runner,state}.ts`. The spine daemon is the
  production in-process owner; `bun run skills:schedule:watch` is the focused
  development loop, and `bun run skills:schedule` is an operator/debug
  alternative that must not run beside the spine daemon.

## Interpretation

Static mode reports `complianceScore` and `scoreKind: static-compliance`. It
does not publish an overall score because no live evidence was collected. A
static compliance value below 70 fails the command; zero-delta advisories remain
visible without changing that value.

Dynamic mode loads `config/skill-rating-evidence.json`, validates every proof
and active-skill attribution, then executes repository-owned structure, model,
runtime, and contract proofs through the managed-process boundary. It persists
only status, timestamps, monotonic durations, command/output hashes, and the
evidence-config hash in the result.

Portfolio model proof never raises a skill rating. Structure proof applies to
every active skill, while runtime and contract proof require explicit named
skill ownership. A skill with no owned runtime or contract proof is `unproven`:
it has static compliance and structure results but no evidence score or overall
score. `dynamic.complete` remains false until every active package has owned
evidence.

The `finite-evidence-v2` model reports:

- `complianceScore`: the deterministic static detector result;
- `structureScore`: active-skill structural proof, kept separate from behavior;
- `evidenceScore`: the configured Beta posterior mean over explicitly owned
  runtime and contract checks, so finite passing evidence never equals
  certainty;
- `overallScore`: the configured compliance/structure/evidence weighting,
  produced only for a proven skill;
- `confidence`: owned-evidence breadth, reported separately from success;
- dimension counts for structure, runtime, and contract proof.

`ok` means every configured live command executed successfully and every proven
skill met the configured floor. It does not mean evidence is complete; inspect
`dynamic.complete` and every skill `status`. These values still do not measure
product importance or task-specific utility; those require evaluation against an
actual task corpus.
