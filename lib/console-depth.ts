/**
 * console-depth.ts — project-wide SSOT for object-inspection verbosity.
 *
 * Official Bun references:
 *   - Depth control (`--console-depth`, bunfig `[console] depth`):
 *     https://bun.com/docs/runtime/console
 *   - CLI flag reference: https://bun.com/docs/runtime
 *   - Bun.inspect / Bun.inspect.table / Bun.inspect.custom / Bun.stringWidth /
 *     Bun.stripANSI / Bun.wrapAnsi: https://bun.com/docs/runtime/utils
 *   - Bun.color: https://bun.com/docs/runtime/color
 *   - Bun.sliceAnsi: https://bun.com/reference/bun/sliceAnsi
 *   - TTY primitives (isTTY, columns): https://nodejs.org/api/tty.html
 *   - Type definitions (pinned commit):
 *     https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types
 *     (tracking branch: https://github.com/oven-sh/bun/tree/main/packages/bun-types)
 *
 * Native layers (for plain console.log):
 *   --console-depth=N flag  >  bunfig.toml [console] depth (= 6 in this repo)
 *   >  Bun default (2). The runtime does NOT read BUN_CONSOLE_DEPTH itself,
 *   and util.inspect.defaultOptions.depth is a no-op in Bun 1.4.
 *
 * This module covers the gaps the native layers don't reach: explicit
 * Bun.inspect calls, TTY-aware colors, compact/table modes, and forwarding
 * depth to child processes.
 *
 * Control plane (highest wins):
 *   1. explicit `depth` argument
 *   2. `--console-depth=N` in process args
 *   3. `BUN_CONSOLE_DEPTH` env (set it in the project root .env)
 *   4. DEFAULT_DEPTH (4)
 *
 * For class-level customization of printed output, implement
 * `[Bun.inspect.custom]()` on the class (see utils docs above).
 */

const DEFAULT_DEPTH = 4;

function parseDepth(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function argDepth(): number | null {
  const idx = Bun.argv.findIndex(a => a === '--console-depth');
  if (idx !== -1) return parseDepth(Bun.argv[idx + 1]);
  const eq = Bun.argv.find(a => a.startsWith('--console-depth='));
  return eq ? parseDepth(eq.split('=')[1]) : null;
}

/**
 * Effective console depth for this process.
 * @see https://bun.com/docs/runtime/console — depth precedence (flag > bunfig)
 * @see https://bun.com/docs/runtime — `--console-depth` CLI flag
 */
export function getConsoleDepth(): number {
  return argDepth() ?? parseDepth(Bun.env.BUN_CONSOLE_DEPTH) ?? DEFAULT_DEPTH;
}

/**
 * TTY-aware color decision, honoring the standard FORCE_COLOR / NO_COLOR
 * env conventions. Never emit ANSI when piped unless explicitly forced.
 * @see https://no-color.org — NO_COLOR convention
 * @see https://nodejs.org/api/cli.html#force_color1 — FORCE_COLOR levels
 * @see https://nodejs.org/api/tty.html — process.stdout.isTTY
 */
export function shouldColor(): boolean {
  if (Bun.env.FORCE_COLOR && Bun.env.FORCE_COLOR !== '0') return true;
  if (Bun.env.NO_COLOR) return false;
  return process.stdout.isTTY === true;
}

/**
 * Terminal width in columns (fallback 80).
 * @see https://nodejs.org/api/tty.html — tty.WriteStream.columns
 */
export function termWidth(): number {
  return process.stdout.columns ?? 80;
}

export type InspectOptions = {
  depth?: number;
  colors?: boolean;
  compact?: boolean | number;
  sorted?: boolean;
  getters?: boolean | 'get' | 'set';
};

/**
 * Bun.inspect with the project depth + TTY-aware colors applied.
 * @see https://bun.com/docs/runtime/utils#bun-inspect
 */
export function inspect(value: unknown, options: InspectOptions = {}): string {
  return Bun.inspect(value, {
    depth: options.depth ?? getConsoleDepth(),
    colors: options.colors ?? shouldColor(),
    compact: options.compact,
    sorted: options.sorted,
    getters: options.getters,
  });
}

/**
 * console.log replacement: project depth, colors only on a real TTY.
 * @see https://bun.com/docs/runtime/utils#bun-inspect
 * @see https://bun.com/docs/runtime/console
 */
export function logDepth(value: unknown, options: InspectOptions = {}): void {
  console.info(inspect(value, options));
}

/**
 * Single-line compact log for high-frequency output (hot paths, watch loops).
 * @see https://bun.com/docs/runtime/utils#bun-inspect — `compact` option
 */
export function logCompact(value: unknown, options: InspectOptions = {}): void {
  console.info(inspect(value, { compact: true, ...options }));
}

/**
 * Bun.inspect.table with TTY-aware colors — tabular data done natively.
 * @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.table
 */
export function logTable(
  data: unknown,
  columns?: string[],
  options: { colors?: boolean } = {}
): void {
  console.info(
    Bun.inspect.table(data as object[], columns, { colors: options.colors ?? shouldColor() })
  );
}

/**
 * Re-export of Bun.inspect.custom — implement `[inspectCustom]()` on classes
 * to control how Bun.inspect/console.log print them.
 * @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.custom
 */
export const inspectCustom = Bun.inspect.custom;

const ANSI_RESET = '\x1b[0m';

/**
 * Colorize text via Bun.color (hex/rgb/named → ANSI-256). Respects shouldColor().
 * @see https://bun.com/docs/runtime/color — Bun.color input/output formats
 */
export function colorize(text: string, color: string): string {
  if (!shouldColor()) return text;
  const code = Bun.color(color, 'ansi-256') || Bun.color(color, 'ansi-16m') || '';
  return code ? `${code}${text}${ANSI_RESET}` : text;
}

/**
 * Visual width of a string (ANSI-aware, emoji = 2). Thin alias of Bun.stringWidth.
 * Options mirror the Bun API: countAnsiEscapeCodes (default false),
 * ambiguousIsNarrow (default true).
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 */
export function widthOf(
  text: string,
  options: { countAnsiEscapeCodes?: boolean; ambiguousIsNarrow?: boolean } = {}
): number {
  return Bun.stringWidth(text, options);
}

/**
 * Pad a string on the right to a visual column width (ANSI/emoji safe).
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 */
export function padEndWidth(text: string, width: number, fill = ' '): string {
  const missing = width - Bun.stringWidth(text);
  return missing > 0 ? text + fill.repeat(missing) : text;
}

/**
 * Truncate to a visual column width without breaking ANSI codes or graphemes.
 * @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi semantics
 */
export function truncateWidth(text: string, width: number): string {
  return Bun.stringWidth(text) <= width ? text : Bun.sliceAnsi(text, 0, width);
}

/**
 * CLI args to forward the effective depth to a child `bun` process.
 * @see https://bun.com/docs/runtime/console — `--console-depth` flag
 */
export function depthArgs(): string[] {
  return [`--console-depth=${getConsoleDepth()}`];
}

/**
 * Env overlay to forward the effective depth to a child process.
 * @see https://bun.com/docs/runtime/console
 */
export function withConsoleDepth<T extends Record<string, string | undefined>>(
  env: T
): T & { BUN_CONSOLE_DEPTH: string } {
  return { ...env, BUN_CONSOLE_DEPTH: String(getConsoleDepth()) };
}
