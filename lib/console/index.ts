// @see https://bun.com/docs/runtime/console#object-inspection-depth
// @see https://bun.com/docs/runtime/utils#bun-inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
// @see https://bun.com/docs/runtime/color#flexible-input
// @see https://bun.com/docs/runtime/utils#bun-stringwidth
/**
 * lib/console — centralized harness TTY / inspect / CLI output.
 *
 * Prefer this facade (or legacy `lib/console-depth.ts` re-export) over:
 *   - raw `console.log(obj)` / `console.table` / pretty-JSON dumps
 *   - ad-hoc isTTY / NO_COLOR / pad-by-s.length helpers
 *
 * Layers:
 *   color   — shouldColor · colorize · tones
 *   depth   — getConsoleDepth · InspectOptions
 *   inspect — inspect · logDepth · logCompact · inspectCustom
 *   table   — inspectTable · logTable
 *   json    — jsonOut (--json choke)
 *   layout  — termWidth · pad* · fitVisible · truncate*
 *   chrome  — kvLines · columnTable · frameBlock · formatIndexedCards
 *   out     — cliOut · statusLine · section (advanced dual-mode)
 *
 * Guide: ../bun-runtime.md · note: ../console-depth.md · gate: ../console-format-scan.ts
 * Proof: tests/console-depth.test.ts · claim `console-depth-boundaries`
 */
export { shouldColor, colorize, tones, cliTone } from './color.ts';
export {
  DEFAULT_DEPTH,
  MAX_CONSOLE_DEPTH,
  getConsoleDepth,
  type InspectOptions,
  resolveInspectOptions,
} from './depth.ts';
export { inspect, logDepth, logCompact, inspectCustom } from './inspect.ts';
export { inspectTable, logTable } from './table.ts';
export { jsonOut } from './json.ts';
export {
  termWidth,
  displayWidth,
  padEndWidth,
  padStartWidth,
  padCenterWidth,
  padDisplay,
  truncateWidth,
  truncateDisplay,
  fitVisible,
} from './layout.ts';
export {
  kvLines,
  columnTable,
  frameBlock,
  msFromNs,
  formatIndexedCards,
  type IndexedCard,
} from './chrome.ts';
export {
  cliOut,
  formatCliOut,
  statusLine,
  section,
  type CliOutMode,
  type CliOutOptions,
} from './out.ts';
