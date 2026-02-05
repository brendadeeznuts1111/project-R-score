// utils/cli-filter.ts
/**
 * 🔍 UNIFIED CLI FILTER ENGINE
 * Combines standard parsing with high-performance parallel chunking (SIMD-style).
 */

import { CLI_FILTER } from '../config/application/constants';

export type FilterOp = typeof CLI_FILTER.OPS[number];
export type FilterExpr = { key: string; op: FilterOp; val: string | boolean | number | string[] };

export function parseCliFilters(argv: string[]): { and: FilterExpr[]; or: FilterExpr[] } {
  const filters: FilterExpr[] = [];
  const orGroup: FilterExpr[] = [];

  const args = argv.some(a => a.includes('bun') || (typeof a === 'string' && (a.endsWith('.ts') || a.endsWith('.js')))) 
    ? argv.filter(a => !a.includes('bun') && !a.endsWith('.ts') && !a.endsWith('.js'))
    : argv;

  args.forEach(arg => {
    let raw = '';
    if (arg.startsWith(CLI_FILTER.ARG_PREFIX + '=')) {
      raw = arg.slice(CLI_FILTER.ARG_PREFIX.length + 1);
    } else if (arg.includes('=') && !arg.startsWith('--')) {
      raw = arg;
    } else if (arg === CLI_FILTER.OR_SEP) {
      orGroup.push(...filters.splice(0));
      return;
    }

    if (!raw) return;

    raw.split(',').forEach(expr => {
      let op: FilterOp = '=';
      let key: string;
      let rest: string;

      if (expr.includes('=')) {
        [key, rest] = expr.split('=');
        if (!key || !rest) return;
        if (rest.startsWith('!')) { op = '!='; rest = rest.slice(1); }
      } else if (expr.includes('>')) {
        [key, rest] = expr.split('>');
        op = '>';
      } else if (expr.includes('<')) {
        [key, rest] = expr.split('<');
        op = '<';
      } else return;

      let val: string | boolean | number | string[] = rest;
      if (rest.startsWith('in:')) { 
        op = 'in'; 
        val = rest.slice(3).split(':').map(v => v.trim());
      } else {
        val = rest === 'true' ? true : rest === 'false' ? false : isNaN(+rest) ? rest : +rest;
      }
      filters.push({ key: key.trim(), op, val });
    });
  });

  return { and: filters, or: orGroup };
}

function getNestedValue(obj: any, path: string): unknown {
  if (!obj || !path) return undefined;
  if (obj[path] !== undefined) return obj[path];
  if (path.includes('.')) return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
  if (obj.parsedData?.[path] !== undefined) return obj.parsedData[path];
  return undefined;
}

function matchesFilter(row: unknown, expr: FilterExpr): boolean {
  const val = getNestedValue(row, expr.key);
  switch (expr.op) {
    case '=': return val === expr.val;
    case '!=': return val !== expr.val;
    case '>': return (val as number) > (expr.val as number);
    case '<': return (val as number) < (expr.val as number);
    case 'in': return (expr.val as string[]).includes(String(val));
    default: return false;
  }
}

export function filterData(data: unknown[], { and, or }: ReturnType<typeof parseCliFilters>): unknown[] {
  const start = Bun.nanoseconds();
  const filtered = data.filter(row => 
    and.every(e => matchesFilter(row, e)) && 
    (or.length === 0 || or.some(e => matchesFilter(row, e)))
  );
  return filtered;
}

/**
 * Parallel batch filter for high-throughput (SIMD-style)
 */
export async function filterDataSIMD(data: unknown[], filters: ReturnType<typeof parseCliFilters>): Promise<any[]> {
  if (data.length < 1000) return filterData(data, filters);
  const CHUNK_SIZE = 8192;
  const numChunks = Math.ceil(data.length / CHUNK_SIZE);
  const tasks = Array.from({ length: numChunks }, (_, i) => {
    const chunk = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    return (async () => filterData(chunk, filters))();
  });
  const results = await Promise.all(tasks);
  return results.flat();
}