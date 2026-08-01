# console-depth — module note

Code: [`console-depth.ts`](./console-depth.ts). Hub: [`bun-runtime.md`](./bun-runtime.md).

TTY primitives → `import { stringWidth, stripANSI, wrapAnsi, sliceAnsi } from 'bun'`.
Markdown ANSI → `Bun.markdown.ansi` (no wrapper).

| Export | Role |
|--------|------|
| `getConsoleDepth` / `inspect` / `logDepth` / `logCompact` | Depth: option → `--console-depth` → `BUN_CONSOLE_DEPTH` → bunfig → `2` |
| `shouldColor` / `colorize` | `Bun.enableANSIColors` (startup / assignment — not mid-process `FORCE_COLOR`) |
| `inspectTable` / `logTable` / `jsonOut` | Table string + `--json` choke |
| `inspectCustom` | `Bun.inspect.custom` |
| `padEndWidth` / `truncateWidth` / `fitVisible` | Layout over `stringWidth` / `sliceAnsi` |
| `termWidth` | `process.stdout.columns ?? 80` |

Proof: `bun test tests/console-depth.test.ts` · claim `console-depth-boundaries`.
