// @see https://bun.com/reference/bun/BunInspectOptions — BunInspectOptions
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth · [console] depth · default 2
// @see https://bun.com/docs/runtime#bun-run-console-depth — bun --console-depth N run …
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/loaders#toml — TOML import attribute (bunfig)
/**
 * Inspect depth SSOT — flag → BUN_CONSOLE_DEPTH → bunfig → 2.
 * Native `console.log` ignores BUN_CONSOLE_DEPTH (wrapper-only escape).
 */
import bunfig from '../../bunfig.toml' with { type: 'toml' };
import { argv, env as bunEnv } from 'bun';
import type { BunInspectOptions } from 'bun';
import { shouldColor } from './color.ts';

export const DEFAULT_DEPTH = 2;

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
 * @see https://bun.com/docs/runtime/console#object-inspection-depth
 */
export function getConsoleDepth(): number {
  return argDepth() ?? parseDepth(bunEnv.BUN_CONSOLE_DEPTH) ?? BUNFIG_DEPTH ?? DEFAULT_DEPTH;
}

/** Official Bun.inspect options only. */
export type InspectOptions = Pick<BunInspectOptions, 'colors' | 'depth' | 'sorted' | 'compact'>;

export function resolveInspectOptions(options: InspectOptions = {}): BunInspectOptions {
  return {
    depth: options.depth ?? getConsoleDepth(),
    colors: options.colors ?? shouldColor(),
    compact: options.compact,
    sorted: options.sorted,
  };
}
