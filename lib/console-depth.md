# console-depth — module note

Code: [`console-depth.ts`](./console-depth.ts) · Hub: [`bun-runtime.md`](./bun-runtime.md) ·
Format ratchet: [`console-format-scan.ts`](./console-format-scan.ts)

Policy layer over Bun natives for harness TTY / inspect output. Raw TTY
primitives stay on `bun` imports; this module owns depth policy, ANSI gate,
tables, and width layout.

## Canonical Bun references

| Topic | URL |
| ----- | --- |
| Object inspection depth (`--console-depth` · `[console] depth` · default **2**) | [console#object-inspection-depth](https://bun.com/docs/runtime/console#object-inspection-depth) |
| `bun run -` pipe code from stdin (TS/JSX, no temp file) | [runtime#bun-run-to-pipe-code-from-stdin](https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin) |
| `bun run --console-depth` / flag placement | [runtime#bun-run-console-depth](https://bun.com/docs/runtime#bun-run-console-depth) |
| Console page (stdin AsyncIterable · runtime surface) | [runtime/console](https://bun.com/docs/runtime/console) |
| `Bun.inspect` | [utils#bun-inspect](https://bun.com/docs/runtime/utils#bun-inspect) |
| `Bun.inspect.custom` | [utils#bun-inspect-custom](https://bun.com/docs/runtime/utils#bun-inspect-custom) |
| `Bun.inspect.table` | [utils#bun-inspect-table…](https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options) |
| `BunInspectOptions` | [reference/BunInspectOptions](https://bun.com/reference/bun/BunInspectOptions) |
| `Bun.stringWidth` | [utils#bun-stringwidth](https://bun.com/docs/runtime/utils#bun-stringwidth) |
| `Bun.stripANSI` | [utils#bun-stripansi](https://bun.com/docs/runtime/utils#bun-stripansi) |
| `Bun.wrapAnsi` | [utils#bun-wrapansi](https://bun.com/docs/runtime/utils#bun-wrapansi) |
| `Bun.sliceAnsi` | [reference/sliceAnsi](https://bun.com/reference/bun/sliceAnsi) |
| `Bun.color` | [color#flexible-input](https://bun.com/docs/runtime/color#flexible-input) |
| `Bun.markdown.ansi` (call directly — no wrapper here) | [markdown#ansi-terminal-output](https://bun.com/docs/runtime/markdown#ansi-terminal-output) |

## `bun run -` + `--console-depth` (agents)

Pipe a one-shot TypeScript snippet without writing a temp file:

```bash
# ✔️ Bun flags immediately after `bun`
echo 'console.log({ a: { b: { c: { d: "deep" } } } })' | bun --console-depth=2 run -
# → c: [Object ...]

echo 'console.log({ a: { b: { c: { d: "deep" } } } })' | bun --console-depth=5 run -
# → d: "deep"
```

**Flag order (same rule as `--watch`):** put Bun flags **before** `run`.

```bash
bun --console-depth=4 run -     # ✔️ applies to console.log
bun run - --console-depth=4     # ❌ flag is argv for the stdin script, not Bun
```

This workspace’s `bunfig.toml` pins `[console] depth = 6`, so probes of the
native flag from the repo root can look “always deep”. Contract test spawns
from `/tmp` to isolate bunfig.

## Docs fixture (depth 2 vs 4)

```ts
const nested = { a: { b: { c: { d: 'deep' } } } };
// depth 2 → c: [Object ...]
// depth 4 → d: "deep"
// this repo bunfig pin 6 → full tree for plain console.log
```

Locked in `tests/console-depth.test.ts` (`docs object-inspection-depth`).

## Depth layers

| Layer | Knob | Who |
| ----- | ---- | --- |
| Native | `--console-depth` → bunfig `[console] depth` → **2** | Bun `console.log` |
| Wrapper | explicit `depth` → flag → `BUN_CONSOLE_DEPTH` → bunfig → **2** | `inspect` / `logDepth` / … |

Repo pin: `bunfig.toml` `[console] depth = 6`. `BUN_CONSOLE_DEPTH` is
**wrapper-only** (runtime ignores it).

## Exports

| Export | Role |
|--------|------|
| `getConsoleDepth` / `inspect` / `logDepth` / `logCompact` | Depth: option → `--console-depth` → `BUN_CONSOLE_DEPTH` → bunfig → `2` |
| `shouldColor` / `colorize` | `Bun.enableANSIColors` (startup / assignment — not mid-process `FORCE_COLOR`) |
| `inspectTable` / `logTable` / `jsonOut` | Table string + `--json` choke |
| `inspectCustom` | `Bun.inspect.custom` |
| `padEndWidth` / `truncateWidth` / `fitVisible` | Layout over `stringWidth` / `sliceAnsi` |
| `termWidth` | `process.stdout.columns ?? 80` |

TTY primitives (not re-exported):  
`import { stringWidth, stripANSI, wrapAnsi, sliceAnsi } from 'bun'`.

## Prefer / avoid

| Prefer | Avoid |
| ------ | ----- |
| `inspect` · `logDepth` · `logTable` · `inspectTable` · `jsonOut` | raw `console.log(obj)` · `console.table` · pretty-JSON dumps · direct `Bun.inspect.table` · `console.dir` |
| `// console-ok` on intentional machine lines | silent format-gate suppressions |

## Proof

- `bun test tests/console-depth.test.ts`
- claim `console-depth-boundaries`
- pre-commit / ratchet: `scripts/lint-console-format.ts` · board `/portal/console-format/`
- bench: `tools/benchmarks/console-depth-perf.ts`
- SSOT paths: `lib/docs/repo-docs.ts` → `consoleDepth` · `consoleDepthGuide` · `consoleDepthTest`
