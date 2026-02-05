// utils/cli-filter.ts (New - Parser + Predicate)
import { CLI_FILTER } from '../config/constants';

export type FilterOp = typeof CLI_FILTER.OPS[number];
export type FilterExpr = { key: string; op: FilterOp; val: string | boolean | number | string[] };

export function parseCliFilters(argv: string[]): { and: FilterExpr[]; or: FilterExpr[] } {
  const filters: FilterExpr[] = [];
  const orGroup: FilterExpr[] = [];

  // Filter out the runtime and script name if present
  const args = argv.some(a => a.includes('bun') || (typeof a === 'string' && (a.endsWith('.ts') || a.endsWith('.js')))) 
    ? argv.filter(a => !a.includes('bun') && !a.endsWith('.ts') && !a.endsWith('.js'))
    : argv;

  args.forEach(arg => {
    // Support both --filter=key=val and plain key=val
    let raw = '';
    if (arg.startsWith(CLI_FILTER.ARG_PREFIX + '=')) {
      raw = arg.slice(CLI_FILTER.ARG_PREFIX.length + 1);
    } else if (arg.includes('=') && !arg.startsWith('--')) {
      raw = arg;
    } else if (arg === CLI_FILTER.OR_SEP) {
      orGroup.push(...filters.splice(0));  // Move to OR
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

        if (rest.startsWith('!')) { 
          op = '!='; 
          rest = rest.slice(1); 
        }
      } else if (expr.includes('>')) {
        [key, rest] = expr.split('>');
        op = '>';
      } else if (expr.includes('<')) {
        [key, rest] = expr.split('<');
        op = '<';
      } else {
        return;
      }

      let val: string | boolean | number | string[] = rest;
      if (rest.startsWith('in:')) { 
        op = 'in'; 
        val = rest.slice(3).split(':').map(v => v.trim()); // Adjusted from user's split(',') to avoid confusion with filter sep
      } else {
        val = rest === 'true' ? true : rest === 'false' ? false : isNaN(+rest) ? rest : +rest;
      }

      filters.push({ key: key.trim(), op, val });
    });
  });

  return { and: filters, or: orGroup };
}

// Helper to get nested value
function getNestedValue(obj: any, path: string): unknown {
  if (!obj || !path) return undefined;
  
  // Try direct access first
  if (obj[path] !== undefined) return obj[path];
  
  // Support dot notation
  if (path.includes('.')) {
    return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
  }
  
  // Fallback: Check common nested locations for R2 query objects
  if (obj.parsedData && obj.parsedData[path] !== undefined) return obj.parsedData[path];
  if (obj.classification?.metadata && obj.classification.metadata[path] !== undefined) return obj.classification.metadata[path];
  
  return undefined;
}

// Predicate: Typed filter fn (SIMD-potential)
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

// Filter data: In-place (no copy)
export function filterData(data: unknown[], { and, or }: ReturnType<typeof parseCliFilters>): unknown[] {
  const start = Bun.nanoseconds();
  const filtered = data.filter(row => 
    and.every(e => matchesFilter(row, e)) &&  // AND all
    (or.length === 0 || or.some(e => matchesFilter(row, e)))  // OR any
  );
  console.log(`🔍 Filtered ${data.length} → ${filtered.length} (${((Bun.nanoseconds() - start) / 1e3).toFixed(1)}μs)`);
  return filtered;
}
