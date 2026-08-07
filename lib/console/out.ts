// @see https://bun.com/docs/runtime/console#object-inspection-depth
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
/**
 * Advanced CLI output patterns — dual-mode human/json, status lines, sections.
 * Prefer these over ad-hoc `if (json) console.log(JSON.stringify…)` branches.
 */
import { tones } from './color.ts';
import type { InspectOptions } from './depth.ts';
import { inspect, logDepth } from './inspect.ts';
import { jsonOut } from './json.ts';
import { logTable } from './table.ts';

export type CliOutMode = 'json' | 'table' | 'depth' | 'compact';

export type CliOutOptions = {
  /** Machine branch — pretty JSON (or compact JSONL when `compact: true`). */
  json?: boolean;
  /** Force mode when not json. Default: depth for objects, table when columns set. */
  mode?: Exclude<CliOutMode, 'json'>;
  /** Column keys for table mode. */
  columns?: string[];
  /** Pretty vs compact JSON when `json: true`. */
  compact?: boolean;
  /** Forwarded to inspect/logDepth when mode is depth/compact. */
  inspect?: InspectOptions;
};

/**
 * Dual-mode CLI printer — one call site for `--json` vs human TTY.
 *
 * @example
 *   cliOut(report, { json: flags.json, columns: ['name', 'status'] })
 *   cliOut(tree, { json, mode: 'depth', inspect: { depth: 4 } })
 */
export function cliOut<T>(value: T, options: CliOutOptions = {}): void {
  if (options.json) {
    jsonOut(value, { compact: options.compact });
    return;
  }
  const mode =
    options.mode ?? (options.columns?.length ? 'table' : options.compact ? 'compact' : 'depth');
  switch (mode) {
    case 'table':
      if (value != null && typeof value === 'object') {
        logTable(value as object | object[], options.columns);
      } else {
        logDepth(value, options.inspect);
      }
      return;
    case 'compact':
      logDepth(value, { compact: true, ...options.inspect });
      return;
    default:
      logDepth(value, options.inspect);
  }
}

/**
 * Dual-mode string form (no console write) — for capture / composition.
 */
export function formatCliOut<T>(value: T, options: CliOutOptions = {}): string {
  if (options.json) {
    return options.compact ? JSON.stringify(value) : JSON.stringify(value, null, 2);
  }
  const mode =
    options.mode ?? (options.columns?.length ? 'table' : options.compact ? 'compact' : 'depth');
  if (mode === 'compact') return inspect(value, { compact: true, ...options.inspect });
  return inspect(value, options.inspect);
}

/** Status line: `  label: value` with optional tone. */
export function statusLine(
  label: string,
  value: string,
  tone: keyof typeof tones | null = null
): string {
  const v = tone ? tones[tone](value) : value;
  return `  ${tones.dim(label)}: ${v}`;
}

/** Blank-line-prefixed section header. */
export function section(title: string): string {
  return `\n${tones.bold(title)}`;
}
