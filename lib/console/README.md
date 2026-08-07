# lib/console — harness output SSOT

Centralizes Bun-native TTY / inspect / CLI patterns so tools do not reinvent
depth, color gates, padding, or dual-mode `--json` branches.

## Prefer

| Need | API | Import |
| ---- | --- | ------ |
| Nested object dump | `logDepth` / `inspect` | `lib/console` or `lib/console-depth` |
| Columnar rows | `logTable` / `inspectTable` | same |
| Machine `--json` | `jsonOut` or **`cliOut(v, { json })`** | same |
| Dual human/json | **`cliOut`** | `lib/console` |
| Semantic color | `tones.ok` / `colorize` / `shouldColor` | same |
| Column layout | `fitVisible` / `padEndWidth` / `truncateWidth` | same |
| Doctor chrome | `frameBlock` / `kvLines` / `columnTable` | same (or `lib/portal/cli-chrome` re-export) |
| Rich box tables | `formatTable` | `lib/table-format` (uses `shouldColor`) |

## Do not

- Raw `console.table` / `console.dir` / pretty `JSON.stringify` dumps (format gate)
- `s.length` for column math — use `displayWidth` / `Bun.stringWidth`
- Parallel TTY gates (`process.stdout.isTTY && !NO_COLOR`) — use `shouldColor()`
- Bun flags after `run -` — see root AGENTS.md § Console depth

## Modules

| File | Owns |
| ---- | ---- |
| `color.ts` | `shouldColor` · `colorize` · `tones` |
| `depth.ts` | flag → env → bunfig → 2 |
| `inspect.ts` | `inspect` · `logDepth` · `inspectCustom` |
| `table.ts` | `inspectTable` · `logTable` |
| `json.ts` | `jsonOut` choke |
| `layout.ts` | width pad/truncate/fit |
| `chrome.ts` | frames · kv · cards |
| `out.ts` | **`cliOut`** dual-mode · status/section |
| `index.ts` | public facade |

Compat: [`../console-depth.ts`](../console-depth.ts) re-exports this package.
Portal: [`../portal/cli-chrome.ts`](../portal/cli-chrome.ts) re-exports chrome + layout + tones.

## Proof

```bash
bun test tests/console-depth.test.ts
bun test tests/console-lib.test.ts
bun run check:console-format
```

Claim: `console-depth-boundaries` · note [`../console-depth.md`](../console-depth.md) · hub [`../bun-runtime.md`](../bun-runtime.md).
