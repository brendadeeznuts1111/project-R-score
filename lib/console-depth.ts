// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth · [console] depth · default 2
// @see https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin — bun run - (stdin, no temp file)
// @see https://bun.com/docs/runtime#bun-run-console-depth — bun --console-depth N run …
// @see https://bun.com/docs/runtime/console — console AsyncIterable stdin · enableANSIColors surface
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/reference/bun/BunInspectOptions — BunInspectOptions (depth · colors · sorted · compact)
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI (use from "bun", not re-export)
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi (use from "bun", not re-export)
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi (call directly)
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/loaders#toml — TOML import attribute (bunfig)
/**
 * console-depth.ts — **compat facade** for lib/console.
 *
 * Implementation lives in [`./console/`](./console/README.md). Import either:
 *   - `from '../lib/console-depth.ts'` (legacy — still preferred in format-gate hints)
 *   - `from '../lib/console/index.ts'` (domain facade; includes chrome + cliOut)
 *
 * Prefer `import { stringWidth, stripANSI, wrapAnsi, sliceAnsi } from 'bun'`
 * for raw TTY primitives. This surface owns depth policy, ANSI gate, tables,
 * layout, and advanced CLI dual-mode (`cliOut`).
 *
 * Guide: ./bun-runtime.md · note: ./console-depth.md · format gate: ./console-format-scan.ts
 * Proof: tests/console-depth.test.ts · claim `console-depth-boundaries`
 */
export {
  // color
  shouldColor,
  colorize,
  tones,
  cliTone,
  // depth
  DEFAULT_DEPTH,
  MAX_CONSOLE_DEPTH,
  getConsoleDepth,
  type InspectOptions,
  resolveInspectOptions,
  // inspect
  inspect,
  logDepth,
  logCompact,
  inspectCustom,
  // table
  inspectTable,
  logTable,
  // json
  jsonOut,
  // layout
  termWidth,
  displayWidth,
  padEndWidth,
  padStartWidth,
  padCenterWidth,
  padDisplay,
  truncateWidth,
  truncateDisplay,
  fitVisible,
  // chrome
  kvLines,
  columnTable,
  frameBlock,
  msFromNs,
  formatIndexedCards,
  type IndexedCard,
  // advanced out
  cliOut,
  formatCliOut,
  statusLine,
  section,
  type CliOutMode,
  type CliOutOptions,
} from './console/index.ts';
