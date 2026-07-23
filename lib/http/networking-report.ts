/**
 * Networking / route probe reports with Bun.inspect.custom + inspect.table.
 *
 * Docs shape:
 * ```ts
 * class Foo {
 *   [Bun.inspect.custom]() { return "foo"; }
 * }
 * console.log(new Foo()); // => "foo"
 * ```
 *
 * Prefer `console.log(report)` over hand-rolling table strings — Bun calls
 * `[Bun.inspect.custom]` automatically (same as Node `util.inspect.custom`).
 * `JSON.stringify(report)` uses `toJSON()` (plain rows + rendered strings).
 *
 * @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
 * @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
 */

import { inspectCustom, shouldColor } from '../console-depth.ts';
import type { HealthRouteObjects, PublicRouteDef } from './public-routes.ts';

export type TableRow = Record<string, string | number | boolean | null | undefined>;

export type RouteProbeRow = {
  path: string;
  name: string;
  category: string;
  kind: string;
  status: number | 'ERR';
  ms: number;
  pass: boolean;
  critical: boolean;
  note?: string;
};

export type RouteProbeResult = {
  base: string;
  health: HealthRouteObjects | null;
  catalog: PublicRouteDef[];
  rows: RouteProbeRow[];
  summary: { total: number; passed: number; failed: number; criticalFailed: number };
};

/**
 * Format rows with Bun.inspect.table.
 * Docs overload: `(data, { colors })` auto-picks columns from object keys,
 * or `(data, properties, { colors })` to project columns.
 */
export function inspectTable(
  rows: TableRow[],
  columns?: string[],
  opts: { colors?: boolean } = {}
): string {
  if (!rows.length) return '(empty)';
  const colors = opts.colors ?? shouldColor();
  // Never pass undefined as properties — Bun treats it poorly.
  return columns?.length
    ? Bun.inspect.table(rows, columns, { colors })
    : Bun.inspect.table(rows, { colors });
}

function routeStatsRows(health: HealthRouteObjects | null): TableRow[] {
  const rs = health?.routeStats;
  if (!rs) return [{ field: '(no /health)', value: 'serve-public down?' }];
  return [
    { field: 'staticRoutes', value: rs.staticRoutes ?? '—' },
    { field: 'fileRoutes', value: rs.fileRoutes ?? '—' },
    { field: 'staticHits', value: rs.staticHits ?? '—' },
    { field: 'fileHits', value: rs.fileHits ?? '—' },
    { field: 'notModified304', value: rs.notModified304 ?? '—' },
    {
      field: 'totalMemoryUsed',
      value:
        rs.totalMemoryUsed != null ? `${Math.round(rs.totalMemoryUsed / 1024)} KiB` : '—',
    },
    { field: 'decision.rule', value: rs.decision?.rule ?? '—' },
  ];
}

function probeRows(rows: RouteProbeRow[]): TableRow[] {
  return rows.map(r => ({
    path: r.path,
    name: r.name,
    category: r.category,
    kind: r.kind,
    status: r.status,
    ms: r.ms,
    crit: r.critical ? 'Y' : '',
    pass: r.pass ? 'PASS' : 'FAIL',
  }));
}

export type RouteReportJson = {
  base: string;
  summary: RouteProbeResult['summary'];
  health: HealthRouteObjects | null;
  routeStats: TableRow[];
  hotPreloaded: TableRow[];
  strategies: TableRow[];
  routes: TableRow[];
  byCategory: Record<string, TableRow[]>;
  /** Pre-rendered Bun.inspect.table strings (colors off for JSON stability). */
  rendered: {
    routeStats: string;
    hotPreloaded: string;
    strategies: string;
    routes: string;
    byCategory: Record<string, string>;
  };
};

/**
 * Full local route probe report.
 * - `console.log(report)` → tables via `[Bun.inspect.custom]`
 * - `JSON.stringify(report)` → structured rows + rendered tables via `toJSON`
 */
export class RouteProbeReport {
  readonly base: string;
  readonly health: HealthRouteObjects | null;
  readonly rows: RouteProbeRow[];
  readonly summary: RouteProbeResult['summary'];

  constructor(probe: RouteProbeResult) {
    this.base = probe.base;
    this.health = probe.health;
    this.rows = probe.rows;
    this.summary = probe.summary;
  }

  /** Object-row slices for tables / spreadsheets. */
  slices(): Omit<RouteReportJson, 'rendered' | 'base' | 'summary' | 'health'> {
    const serve = this.health?.serve;
    const routeStats = routeStatsRows(this.health);
    const hotPreloaded = (serve?.hotPreloaded ?? []).map((p, i) => ({ i, path: p }));
    const strategies = Object.entries(serve?.strategies ?? {}).map(([k, v]) => ({
      strategy: k,
      rule: v,
    }));
    const routes = probeRows(this.rows);
    const byCategory: Record<string, TableRow[]> = {};
    for (const r of this.rows) {
      (byCategory[r.category] ??= []).push({
        path: r.path,
        kind: r.kind,
        status: String(r.status),
        ms: r.ms,
        crit: r.critical ? 'Y' : '',
        pass: r.pass ? 'PASS' : 'FAIL',
      });
    }
    return { routeStats, hotPreloaded, strategies, routes, byCategory };
  }

  /**
   * Build inspect.table strings.
   * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
   */
  render(opts: { colors?: boolean } = {}): RouteReportJson['rendered'] {
    const colors = opts.colors ?? shouldColor();
    const s = this.slices();
    const byCategory: Record<string, string> = {};
    for (const [c, slice] of Object.entries(s.byCategory)) {
      byCategory[c] = inspectTable(slice, ['path', 'kind', 'status', 'ms', 'crit', 'pass'], {
        colors,
      });
    }
    return {
      routeStats: inspectTable(s.routeStats, ['field', 'value'], { colors }),
      hotPreloaded: s.hotPreloaded.length
        ? inspectTable(s.hotPreloaded, ['i', 'path'], { colors })
        : '(none)',
      strategies: s.strategies.length
        ? inspectTable(s.strategies, ['strategy', 'rule'], { colors })
        : '(none)',
      routes: inspectTable(s.routes, ['path', 'kind', 'status', 'ms', 'crit', 'pass'], {
        colors,
      }),
      byCategory,
    };
  }

  toJSON(): RouteReportJson {
    const s = this.slices();
    return {
      base: this.base,
      summary: this.summary,
      health: this.health,
      ...s,
      rendered: this.render({ colors: false }),
    };
  }

  /**
   * @see https://bun.com/docs/runtime/utils#bun-inspect-custom
   * Bun.inspect / console.log call this automatically.
   */
  [inspectCustom](_depth?: number, options?: { colors?: boolean }): string {
    const colors = options?.colors ?? shouldColor();
    const r = this.render({ colors });
    const serve = this.health?.serve;
    const parts = [
      `RouteProbeReport · ${this.base} · ${this.summary.passed}/${this.summary.total} pass · critFail=${this.summary.criticalFailed}`,
      '',
      '── ROUTE OBJECTS (/health.routeStats) ──',
      r.routeStats,
    ];
    if (this.health?.serve?.hotPreloaded?.length) {
      parts.push('', '── HOT PRELOADED (serve.hotPreloaded) ──', r.hotPreloaded);
    }
    if (serve?.etagScope) {
      parts.push(`ETag scope: ${serve.etagScope}`);
    }
    if (Object.keys(serve?.strategies ?? {}).length) {
      parts.push('', '── STRATEGIES ──', r.strategies);
    }
    parts.push('', '── PUBLIC ROUTE CATALOG (all paths) ──', r.routes);
    parts.push('', '── BY CATEGORY ──');
    for (const [c, table] of Object.entries(r.byCategory)) {
      parts.push('', `  · ${c}`, table);
    }
    return parts.join('\n');
  }
}

/**
 * Multi-target networking check rows (DNS / preconnect / cold-warm fetch).
 */
export class NetworkingChecksReport {
  constructor(
    public readonly rows: Array<{
      target: string;
      category: string;
      optimization: string;
      metric: string;
      status: string;
      detail?: string;
    }>,
    public readonly meta: { base: string; bun: string; revision: string } = {
      base: '',
      bun: Bun.version,
      revision: Bun.revision || 'unknown',
    }
  ) {}

  toJSON() {
    return {
      meta: this.meta,
      rows: this.rows,
      rendered: this.render({ colors: false }),
    };
  }

  render(opts: { colors?: boolean } = {}): string {
    const colors = opts.colors ?? shouldColor();
    if (!this.rows.length) return '(no multi-target checks)';
    return inspectTable(
      this.rows.map(r => ({
        target: r.target,
        optimization: r.optimization,
        metric: r.metric,
        status: r.status,
      })),
      ['target', 'optimization', 'metric', 'status'],
      { colors }
    );
  }

  [inspectCustom](_depth?: number, options?: { colors?: boolean }): string {
    const colors = options?.colors ?? shouldColor();
    return [
      `NetworkingChecksReport · ${this.meta.base || 'multi-target'} · Bun ${this.meta.bun}`,
      this.render({ colors }),
    ].join('\n');
  }
}
