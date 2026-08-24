# Bun runtime nits — Phase 1 verification

Runtime truth probes for Bun APIs that are easy to misuse at the edge:
`Bun.inspect` options, Web Streams compression, WHATWG `URL` properties, and
`Bun.file` vs `fs`.

Proof JSON: `/registry/bun-runtime-nits-proof.json`

**Included in `verify-all`** (step 8) and `check:release-tracker`. Subsystem:
`runtime` (orthogonal to probe `category`: inspect · streams · url · file-io).

## Categories

| Category  | Probes | What it proves                                                                                                                                                                   |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inspect` | 9      | `sorted`, `compact`, `showProxy`, `getters`, `numericSeparator`, `maxStringLength`, `customInspect`, `defaultOptions`, `tableOptionIgnored` — **runtime truth**, not Node parity |
| `streams` | 2      | gzip `CompressionStream`/`DecompressionStream` roundtrip; `TextEncoderStream`/`TextDecoderStream`                                                                                |
| `url`     | 4      | `host`, `origin`, `searchParams`, `host` setter                                                                                                                                  |
| `file-io` | 3      | lazy `Bun.file` size, `Bun.write` auto-dir, bytes vs `fs.readFile`                                                                                                               |

## Commands

```bash
bun tools/verify-bun-runtime-nits.ts
bun tools/verify-bun-runtime-nits.ts --save
bun run verify:bun-runtime-nits:save
bun test tests/bun-runtime-nits-probes.test.ts
```

## `bun run -` (stdin) + `--console-depth` + `--smol`

| Command                       | Role                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| `echo '…' \| bun run -`       | Execute TS/JSX from stdin (no temp file; all input treated as TypeScript) |
| `bun --console-depth=N run -` | Same + native inspect depth for `console.log` (default depth `2`)         |
| `bun --smol run …`            | More frequent GC / slower heap growth in memory-constrained jobs          |

Flag order: `bun [bun flags] run <script\|file> [script flags]` — Bun flags
**immediately after `bun`**, before `run` (same as `--watch`). Trailing flags
are script argv.

Resolution order (`bun run <name>`): package.json scripts → source files →
package bins → system commands. Absolute / `./` paths and (without `bun run`)
names with allowed extensions always resolve as source files.

@see
[runtime#bun-run-to-pipe-code-from-stdin](https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin)
·
[runtime#bun-run-console-depth](https://bun.com/docs/runtime#bun-run-console-depth)
· [runtime#bun-run-smol](https://bun.com/docs/runtime#bun-run-smol) ·
[runtime#resolution-order](https://bun.com/docs/runtime#resolution-order).  
Contracts: `tests/console-depth.test.ts` · claim `runtime-cli-boundaries`
(`bun test tests/fixtures/runtime-cli/`).

## Inspect runtime truth (Bun 1.4)

Project SSOT: [`lib/console-depth.ts`](../lib/console-depth.ts) exposes only
options verified on Bun 1.4 (`depth`, `colors`, `compact`, `sorted`). Probes
record behavior for Node-compat options:

- `defaultOptions` — **absent** (`Bun.inspect.defaultOptions` is `undefined`;
  not Node `util.inspect`)
- `{ table: true }` — **ignored**; use `Bun.inspect.table` / `inspectTable` for
  columnar output
- `maxStringLength` — typically **ignored** (full string still shown)
- `numericSeparator` — may be **ignored**
- `getters: true` — shows `[Getter]` on this runtime
- `customInspect: false` — may not suppress `[Bun.inspect.custom]`

Canonical refs: `bun tools/bun-doc-refs.ts suggest "Bun.inspect.sorted"`

## Related

- [`docs/registry-client.md`](registry-client.md) — tarball gzip + SHA-256
  (streams motivation)
- [`lib/verification/bun-runtime-nits-probes.ts`](../lib/verification/bun-runtime-nits-probes.ts)
  — probe SSOT
- [`tools/verify-bun-runtime-nits.ts`](../tools/verify-bun-runtime-nits.ts) —
  runner
