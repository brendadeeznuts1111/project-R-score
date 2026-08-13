// @see https://bun.com/docs/runtime/utils#bun-resolvesync — Bun.resolveSync
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
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
export const MAX_CONSOLE_DEPTH = 65_535;

type BunfigShape = { console?: { depth?: unknown } };

function normalizeDepth(raw: unknown, source: string): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > MAX_CONSOLE_DEPTH) {
    throw new RangeError(`${source} must be an integer from 0 to ${MAX_CONSOLE_DEPTH}`);
  }

  // Keep the value represented as an int32 for Bun.inspect on Bun 1.3.14.
  return Math.trunc(raw);
}

function parseDepth(raw: string | undefined, source: string): number | null {
  if (raw === undefined || raw === '') return null;
  if (!/^(?:0|[1-9]\d*)$/.test(raw)) {
    throw new RangeError(`${source} must be an integer from 0 to ${MAX_CONSOLE_DEPTH}`);
  }
  return normalizeDepth(Number(raw), source);
}

function optionValue(args: readonly string[], names: readonly string[]): string | null {
  let value: string | null = null;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (names.includes(argument)) {
      value = args[index + 1] ?? '';
      index++;
      continue;
    }
    const equalsName = names.find(name => argument.startsWith(`${name}=`));
    if (equalsName) {
      value = argument.slice(equalsName.length + 1);
    }
  }
  return value;
}

/** Bun removes runtime flags from Bun.argv and retains them in process.execArgv. */
function runtimeArgs(): readonly string[] {
  if (typeof process === 'undefined') return [];
  const entrypoint = argv[1];
  if (!entrypoint) return process.execArgv;
  const entrypointIndex = process.execArgv.indexOf(entrypoint);
  return entrypointIndex === -1 ? process.execArgv : process.execArgv.slice(0, entrypointIndex);
}

function argDepth(): number | null {
  const raw = optionValue(runtimeArgs(), ['--console-depth']);
  return raw === null ? null : parseDepth(raw, '--console-depth');
}

function configuredBunfig(): BunfigShape {
  const configPath = optionValue(runtimeArgs(), ['--config', '-c']);
  if (configPath === null) return bunfig as BunfigShape;
  return import.meta.require(Bun.resolveSync(configPath, process.cwd())) as BunfigShape;
}

const CONFIGURED_BUNFIG = configuredBunfig();

function bunfigDepth(): number | null {
  const raw = CONFIGURED_BUNFIG.console?.depth;
  return raw === undefined ? null : normalizeDepth(raw, 'bunfig [console].depth');
}

/**
 * Effective inspect depth for wrappers.
 * Native layer (plain `console.log`): flag > bunfig > 2.
 * Policy adds `BUN_CONSOLE_DEPTH` escape (runtime does not read it).
 * @see https://bun.com/docs/runtime/console#object-inspection-depth
 */
export function getConsoleDepth(): number {
  return (
    argDepth() ??
    parseDepth(bunEnv.BUN_CONSOLE_DEPTH, 'BUN_CONSOLE_DEPTH') ??
    bunfigDepth() ??
    DEFAULT_DEPTH
  );
}

/** Official Bun.inspect options only. */
export type InspectOptions = Pick<BunInspectOptions, 'colors' | 'depth' | 'sorted' | 'compact'>;

export function resolveInspectOptions(options: InspectOptions = {}): BunInspectOptions {
  return {
    depth:
      options.depth === undefined
        ? getConsoleDepth()
        : normalizeDepth(options.depth, 'Bun.inspect depth'),
    colors: options.colors ?? shouldColor(),
    compact: options.compact,
    sorted: options.sorted,
  };
}
