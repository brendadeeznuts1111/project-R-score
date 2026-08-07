// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
/**
 * Bun.inspect.table wrappers — string path (not raw console.table).
 * Format gate steers call sites here via logTable / inspectTable.
 */
import { inspect as bunInspect } from 'bun';
import { shouldColor } from './color.ts';

/**
 * Bun.inspect.table string (unlike console.table).
 * Safe overload: never pass `undefined` properties to the 3-arg form.
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
 */
export function logTable<T extends object>(
  data: T | T[],
  columns?: string[],
  options: { colors?: boolean } = {}
): void {
  console.info(inspectTable(data, columns, options));
}
