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
 * console-depth.ts — policy layer over Bun natives for harness output.
 *
 * Prefer `import { stringWidth, stripANSI, wrapAnsi, sliceAnsi } from 'bun'`
 * for raw TTY primitives. This module only owns what Bun does not:
 *   - inspect depth (flag → bunfig → 2; optional BUN_CONSOLE_DEPTH escape)
 *   - ANSI gate via Bun.enableANSIColors
 *   - jsonOut choke · logDepth / logTable · colorize
 *   - padEndWidth / truncateWidth / fitVisible (layout over stringWidth/sliceAnsi)
 *
 * Markdown ANSI: call `Bun.markdown.ansi` directly (no wrapper).
 * Guide: ./bun-runtime.md · note: ./console-depth.md · format gate: ./console-format-scan.ts
 * Proof: tests/console-depth.test.ts · claim `console-depth-boundaries`
 *
 * Depth: explicit option > `--console-depth` > `BUN_CONSOLE_DEPTH` (escape) >
 * bunfig `[console] depth` (repo pin 6) > 2.
 * Official docs fixture (depth 2 truncates · depth 4 reveals leaf):
 *   https://bun.com/docs/runtime/console#object-inspection-depth
 * Color: `shouldColor()` === `Bun.enableANSIColors` (process-start / assignment;
 * not mid-process env mutation). Never `import { enableANSIColors }` — frozen snapshot.
 */

import bunfig from '../bunfig.toml' with { type: 'toml' };
import {
  argv,
  color as bunColor,
  env as bunEnv,
  inspect as bunInspect,
  sliceAnsi,
  stringWidth,
} from 'bun';
import type { BunInspectOptions } from 'bun';

const DEFAULT_DEPTH = 2;

const BUNFIG_DEPTH = (() => {
  const raw = (bunfig as { console?: { depth?: unknown } }).console?.depth;
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : null;
})();

function parseDepth(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function depthFromArgList(args: readonly string[]): number | null {
  const idx = args.findIndex(a => a === '--console-depth');
  if (idx !== -1) return parseDepth(args[idx + 1]);
  const eq = args.find(a => a.startsWith('--console-depth='));
  return eq ? parseDepth(eq.split('=')[1]) : null;
}

/** `--console-depth` may live on argv or execArgv (Bun strips it from argv after apply). */
function argDepth(): number | null {
  return (
    depthFromArgList(argv) ??
    depthFromArgList(typeof process !== 'undefined' ? process.execArgv : [])
  );
}

/**
 * Effective inspect depth for wrappers.
 * Native layer (plain `console.log`): flag > bunfig > 2.
 * Policy adds `BUN_CONSOLE_DEPTH` escape (runtime does not read it).
 * @see https://bun.com/docs/runtime/console#object-inspection-depth — flag · bunfig · default 2
 */
export function getConsoleDepth(): number {
  return argDepth() ?? parseDepth(bunEnv.BUN_CONSOLE_DEPTH) ?? BUNFIG_DEPTH ?? DEFAULT_DEPTH;
}

/**
 * ANSI gate — `Bun.enableANSIColors` (startup env/TTY, or explicit assignment).
 * @see https://bun.com/docs/runtime/console — console + ANSI-related runtime surface
 * @see https://bun.com/docs/runtime/color#flexible-input — Bun.color for gated colorize()
 */
export function shouldColor(): boolean {
  return Bun.enableANSIColors;
}

/** Terminal columns (fallback 80). Bun.stdout has no `.columns`. */
export function termWidth(): number {
  return process.stdout.columns ?? 80;
}

/** Official Bun.inspect options only. */
export type InspectOptions = Pick<BunInspectOptions, 'colors' | 'depth' | 'sorted' | 'compact'>;

function resolveInspectOptions(options: InspectOptions = {}): BunInspectOptions {
  return {
    depth: options.depth ?? getConsoleDepth(),
    colors: options.colors ?? shouldColor(),
    compact: options.compact,
    sorted: options.sorted,
  };
}

/**
 * Bun.inspect with project depth + ANSI gate.
 * @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
 * @see https://bun.com/docs/runtime/console#object-inspection-depth — depth knob
 */
export function inspect<T>(value: T, options: InspectOptions = {}): string {
  return bunInspect(value, resolveInspectOptions(options));
}

/**
 * console.log replacement with project depth (via inspect string).
 * Prefer over raw `console.log(obj)` for harness output.
 * @see https://bun.com/docs/runtime/console#object-inspection-depth
 */
export function logDepth<T>(value: T, options: InspectOptions = {}): void {
  console.info(inspect(value, options));
}

/** Single-line compact log (`compact: true`). */
export function logCompact<T>(value: T, options: InspectOptions = {}): void {
  console.info(inspect(value, { compact: true, ...options }));
}

/**
 * Bun.inspect.table string (unlike console.table).
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 */
export function inspectTable<T extends object>(
  data: T | T[],
  columns?: string[],
  options: { colors?: boolean } = {}
): string {
  const rows = (Array.isArray(data) ? data : [data]) as object[];
  const opts = { colors: options.colors ?? shouldColor() };
  return columns?.length ? bunInspect.table(rows, columns, opts) : bunInspect.table(rows, opts);
}

/**
 * Print Bun.inspect.table (string path — not raw console.table).
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 */
export function logTable<T extends object>(
  data: T | T[],
  columns?: string[],
  options: { colors?: boolean } = {}
): void {
  console.info(inspectTable(data, columns, options));
}

/**
 * Machine JSON for `--json` branches (pretty by default; `{ compact: true }` → JSONL).
 * Gate allows this site via `// console-ok` — sole pretty-JSON choke for CLIs.
 */
export function jsonOut<T>(value: T, options: { compact?: boolean } = {}): void {
  console.info(options.compact ? JSON.stringify(value) : JSON.stringify(value, null, 2)); // console-ok — --json choke point
}

/**
 * Alias of Bun.inspect.custom for `[inspectCustom]()` overrides.
 * @see https://bun.com/docs/runtime/utils#bun-inspect-custom
 */
export const inspectCustom = bunInspect.custom;

const ANSI_RESET = '\x1b[0m';

/**
 * Colorize via Bun.color `"ansi"` when `shouldColor()`.
 * @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
 */
export function colorize(text: string, swatch: string): string {
  if (!shouldColor()) return text;
  const code = bunColor(swatch, 'ansi') || '';
  return code ? `${code}${text}${ANSI_RESET}` : text;
}

type NarrowOpts = { ambiguousIsNarrow?: boolean };

/**
 * Pad end by visible columns (ANSI/emoji safe).
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 */
export function padEndWidth(text: string, width: number, fill = ' ', options?: NarrowOpts): string {
  const missing = width - stringWidth(text, options);
  return missing > 0 ? text + fill.repeat(missing) : text;
}

function padStartWidth(text: string, width: number, fill = ' ', options?: NarrowOpts): string {
  const missing = width - stringWidth(text, options);
  return missing > 0 ? fill.repeat(missing) + text : text;
}

function padCenterWidth(text: string, width: number, fill = ' ', options?: NarrowOpts): string {
  const missing = width - stringWidth(text, options);
  if (missing <= 0) return text;
  const left = Math.floor(missing / 2);
  return fill.repeat(left) + text + fill.repeat(missing - left);
}

/**
 * Truncate to visible columns without breaking ANSI / graphemes.
 * @see https://bun.com/reference/bun/sliceAnsi
 */
export function truncateWidth(
  text: string,
  width: number,
  options?: NarrowOpts & { ellipsis?: string }
): string {
  const { ellipsis, ...sw } = options ?? {};
  if (stringWidth(text, sw) <= width) return text;
  return ellipsis !== undefined
    ? sliceAnsi(text, 0, width, { ellipsis, ...sw })
    : sliceAnsi(text, 0, width, sw);
}

/**
 * Truncate-then-pad to an exact column width.
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 * @see https://bun.com/reference/bun/sliceAnsi
 */
export function fitVisible(
  text: string,
  cols: number,
  opts?: {
    ellipsis?: string;
    align?: 'left' | 'right' | 'center';
    fill?: string;
    ambiguousIsNarrow?: boolean;
  }
): string {
  const sw =
    opts?.ambiguousIsNarrow === undefined
      ? undefined
      : { ambiguousIsNarrow: opts.ambiguousIsNarrow };
  const fill = opts?.fill ?? ' ';
  const clipped =
    stringWidth(text, sw) > cols
      ? sliceAnsi(text, 0, cols, { ellipsis: opts?.ellipsis ?? '…', ...sw })
      : text;
  switch (opts?.align ?? 'left') {
    case 'right':
      return padStartWidth(clipped, cols, fill, sw);
    case 'center':
      return padCenterWidth(clipped, cols, fill, sw);
    default:
      return padEndWidth(clipped, cols, fill, sw);
  }
}
