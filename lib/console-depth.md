# console-depth — module note

Code SSOT: [`console-depth.ts`](./console-depth.ts).

Hub (CLI · depth/stdin · utilities table): [`bun-runtime.md`](./bun-runtime.md).

**Prefer Bun natives** for TTY primitives:

```ts
import { stringWidth, stripANSI, wrapAnsi, sliceAnsi } from 'bun';
```

This module owns policy Bun does not:

| Export | Role |
|--------|------|
| `getConsoleDepth` / `inspect` / `logDepth` / `logCompact` | Depth: option → `--console-depth` → `BUN_CONSOLE_DEPTH` (escape) → bunfig → `2` |
| `shouldColor` / `colorize` | `Bun.enableANSIColors` gate |
| `inspectTable` / `logTable` / `jsonOut` | Table string + `--json` choke |
| `inspectCustom` | `Bun.inspect.custom` symbol alias |
| `padEndWidth` / `truncateWidth` / `fitVisible` | Layout over `stringWidth` / `sliceAnsi` |

Proof: `bun test tests/console-depth.test.ts` · claim `console-depth-boundaries`.
