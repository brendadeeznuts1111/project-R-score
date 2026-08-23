# Bun test Inspector reporter (TestReporter)

<!-- REF:ID 0.1.bun-test-inspect -->

<a id="0.1.bun-test-inspect"></a>

Custom `bun test` reporters are **not** a Jest-style JS plugin hook. They are a
debugger client that speaks JSON-RPC over WebSocket against Bun’s extended
WebKit Inspector Protocol while `bun test --inspect` / `--inspect-wait` runs.

**Canonical:** [Test Reporters](https://bun.com/docs/test/reporters) ·
[Debugger](https://bun.com/docs/runtime/debugger) · late-connect fix
[Bun 1.3.7+](https://bun.com/blog/bun-v1.3.7).

## Orthogonal layers

| Need                                | Tool                                                       |
| ----------------------------------- | ---------------------------------------------------------- |
| Human / default                     | `bun test`                                                 |
| CI XML                              | `--reporter=junit` · `bun run test:ci` · `failures:bake`   |
| Live telemetry / IDE / flaky timing | Inspector **TestReporter** stream · `bun run test:inspect` |
| Contract shape freeze               | in-process `toMatchObject` / snapshots                     |

JUnit ≠ Inspector. Use both when you want XML for CI and a live event stream.

## Client in this repo

| Piece            | Path                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| Protocol helpers | [`lib/harness/inspect-test-reporter.ts`](../../../lib/harness/inspect-test-reporter.ts) |
| CLI              | [`scripts/inspect-tests.ts`](../../../scripts/inspect-tests.ts)                         |
| Tests            | [`tests/inspect-test-reporter.test.ts`](../../../tests/inspect-test-reporter.test.ts)   |

```bash
bun run test:inspect
bun run test:inspect -- tests/console-depth.test.ts
bun scripts/inspect-tests.ts --inspect-port 6499 --out tmp/inspect --json -- ./path.test.ts
```

Writes (gitignored under `tmp/`):

- `tmp/inspect/inspect-events.jsonl` — `TestReporter.*` ·
  `LifecycleReporter.error` · `Console.messageAdded`
- `tmp/inspect/inspect-summary.json` — counts + `debug.bun.sh` URL

## Enable sequence

After WebSocket open:

1. `Inspector.enable` · `Runtime.enable` · `Debugger.enable` · `Console.enable`
2. `TestReporter.enable` · `LifecycleReporter.enable`
3. `Inspector.initialized` · `Runtime.runIfWaitingForDebugger`

Prefer `--inspect-wait` so the suite waits until the client attaches (avoids
missing early `found` events; Bun ≥1.3.7 also replays on late
`TestReporter.enable`).

## Event fields (soft)

Treat `name` / `title` / `testId` / `status` / `id` as soft — use
`testDisplayName()` / `testStatus()` helpers. Upstream
[Key Events](https://bun.com/docs/test/reporters#key-events) lists the five
methods but **does not document payload schemas** or ship a full custom-reporter
sample.

| Domain               | Events (docs)             | Connection                                                                                                                                                                        |
| -------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TestReporter`       | `found` · `start` · `end` | [Debugger](https://bun.com/docs/runtime/debugger) · [`--inspect`](https://bun.com/docs/runtime/debugger#inspect) / `--inspect-wait` (general attach docs — not reporter-specific) |
| `LifecycleReporter`  | `error`                   | same                                                                                                                                                                              |
| `Console` (standard) | `messageAdded`            | same                                                                                                                                                                              |

**Working client in this repo** (prefer over inventing a new reporter):
[`lib/harness/inspect-test-reporter.ts`](../../../lib/harness/inspect-test-reporter.ts)
· [`scripts/inspect-tests.ts`](../../../scripts/inspect-tests.ts) ·
`bun test tests/inspect-test-reporter.test.ts`. Soft param types live next to
the helpers because Bun’s public docs stop at the event names.

**Secondary upstream (not SSOT):**

- Bun source inspect tests:
  [`test/cli/inspect/test-reporter.test.ts`](https://github.com/oven-sh/bun/blob/main/test/cli/inspect/test-reporter.test.ts)
  (late-enable / replay behavior)
- Protocol landing PR:
  [oven-sh/bun#15194](https://github.com/oven-sh/bun/pull/15194)
- Community typings:
  [`@rttnd/bun-inspector-protocol`](https://www.npmjs.com/package/@rttnd/bun-inspector-protocol)
  (optional reference; we keep a thin in-repo client)

No need for a separate “custom reporter” skill — extend `inspect-tests` when
telemetry shape must grow.
