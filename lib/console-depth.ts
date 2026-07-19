/**
 * console-depth.ts — project-wide SSOT for object-inspection verbosity.
 *
 * Official Bun references:
 *   - Depth control (`--console-depth`, bunfig `[console] depth`):
 *     https://bun.com/docs/api/console
 *   - CLI flag reference: https://bun.com/docs/runtime
 *   - Bun.inspect / Bun.inspect.table / Bun.inspect.custom / Bun.stringWidth /
 *     Bun.stripANSI / Bun.wrapAnsi: https://bun.com/docs/api/utils
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

/** Effective console depth for this process. */
export function getConsoleDepth(): number {
  return argDepth() ?? parseDepth(Bun.env.BUN_CONSOLE_DEPTH) ?? DEFAULT_DEPTH;
}

/**
 * TTY-aware color decision, honoring the standard FORCE_COLOR / NO_COLOR
 * env conventions. Never emit ANSI when piped unless explicitly forced.
 */
export function shouldColor(): boolean {
  if (Bun.env.FORCE_COLOR && Bun.env.FORCE_COLOR !== '0') return true;
  if (Bun.env.NO_COLOR) return false;
  return process.stdout.isTTY === true;
}

/** Terminal width in columns (fallback 80). */
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

/** Bun.inspect with the project depth + TTY-aware colors applied. */
export function inspect(value: unknown, options: InspectOptions = {}): string {
  return Bun.inspect(value, {
    depth: options.depth ?? getConsoleDepth(),
    colors: options.colors ?? shouldColor(),
    compact: options.compact,
    sorted: options.sorted,
    getters: options.getters,
  });
}

/** console.log replacement: project depth, colors only on a real TTY. */
export function logDepth(value: unknown, options: InspectOptions = {}): void {
  console.info(inspect(value, options));
}

/** Single-line compact log for high-frequency output (hot paths, watch loops). */
export function logCompact(value: unknown, options: InspectOptions = {}): void {
  console.info(inspect(value, { compact: true, ...options }));
}

/** Bun.inspect.table with TTY-aware colors — tabular data done natively. */
export function logTable(
  data: unknown,
  columns?: string[],
  options: { colors?: boolean } = {}
): void {
  console.info(Bun.inspect.table(data as object[], columns, { colors: options.colors ?? shouldColor() }));
}

/** CLI args to forward the effective depth to a child `bun` process. */
export function depthArgs(): string[] {
  return [`--console-depth=${getConsoleDepth()}`];
}

/** Env overlay to forward the effective depth to a child process. */
export function withConsoleDepth<T extends Record<string, string | undefined>>(
  env: T
): T & { BUN_CONSOLE_DEPTH: string } {
  return { ...env, BUN_CONSOLE_DEPTH: String(getConsoleDepth()) };
}
