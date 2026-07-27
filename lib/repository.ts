// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * Multi-dimensional scoped repository (legacy / analysis surface).
 *
 * Injects node_id + country_code + sport_id + market_id + optional state_code
 * into every query. Rejects raw dimension filters outside scope injection.
 *
 * Prefer {@link ScopedRepository} in `lib/operations/state-regulation.ts` for
 * ops/compliance (TreeNodeId, geo: state/age/location/zip). This module keeps
 * the multi-dimension analysis API used by deep-audit / zip enrichment.
 */
import type { Database } from 'bun:sqlite';

export interface Scope {
  nodeId: string; // brand-ok — tree node slug for analysis surfaces
  country: string;
  sport: string;
  market: string;
  /** When set, also filters state_code. */
  state?: string | null;
}

const SCOPED_DIMENSIONS = [
  'node_id',
  'country_code',
  'sport_id',
  'market_id',
  'state_code',
] as const;

export type ScopedQueryOpts = {
  where?: string;
  orderBy?: string;
  limit?: number;
  bindings?: unknown[];
};

export class ScopedRepository<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(
    protected db: Database,
    protected scope: Scope,
    protected table: string
  ) {}

  protected scopeParts(): { clauses: string[]; params: unknown[] } {
    const clauses = ['node_id = ?', 'country_code = ?', 'sport_id = ?', 'market_id = ?'];
    const params: unknown[] = [
      this.scope.nodeId,
      this.scope.country,
      this.scope.sport,
      this.scope.market,
    ];
    if (this.scope.state) {
      clauses.push('state_code = ?');
      params.push(this.scope.state);
    }
    return { clauses, params };
  }

  protected whereSql(): { sql: string; params: unknown[] } {
    const { clauses, params } = this.scopeParts();
    return {
      sql: `WHERE ${clauses.join(' AND ')} /*scope-injected*/`,
      params,
    };
  }

  /** Inject scope into free-form SQL (replaces first WHERE or inserts before ORDER/LIMIT). */
  protected injectScope(sql: string): { sql: string; params: unknown[] } {
    const stripped = sql.replace(/\([^()]*\)/g, '');
    for (const dim of SCOPED_DIMENSIONS) {
      const re = new RegExp(`${dim}\\s*=\\s*[$@:?]`, 'i');
      if (re.test(stripped) && !sql.includes('/*scope-injected*/')) {
        throw new Error(
          `Direct dimension filter detected (${dim}); use ScopedRepository scope only`
        );
      }
    }
    const { clauses, params } = this.scopeParts();
    const fullWhere = `WHERE ${clauses.join(' AND ')} /*scope-injected*/ `;
    if (/WHERE\s+/i.test(sql)) {
      return { sql: sql.replace(/WHERE\s+/i, fullWhere), params };
    }
    return {
      sql: sql.replace(/\s*(ORDER\s+BY|LIMIT|GROUP\s+BY|HAVING|$)/i, ` ${fullWhere}$1`),
      params,
    };
  }

  /**
   * Query rows.
   * - `all("SELECT … FROM t LIMIT 5")` — free SQL with scope injection
   * - `all({ limit: 5, orderBy: "…" })` — SELECT * FROM bound table
   */
  all(sqlOrOpts?: string | ScopedQueryOpts): T[] {
    if (typeof sqlOrOpts === 'string') {
      const inj = this.injectScope(sqlOrOpts);
      return this.db.query(inj.sql).all(...inj.params) as T[];
    }
    const opts = sqlOrOpts ?? {};
    const w = this.whereSql();
    let s = `SELECT * FROM ${this.table} ${w.sql}`;
    if (opts.where) s += ` AND (${opts.where})`;
    if (opts.orderBy) s += ` ORDER BY ${opts.orderBy}`;
    if (opts.limit != null) s += ` LIMIT ${opts.limit}`;
    return this.db.query(s).all(...w.params, ...(opts.bindings ?? [])) as T[];
  }

  get(sqlOrOpts?: string | ScopedQueryOpts): T | null {
    if (typeof sqlOrOpts === 'string') {
      const rows = this.all(sqlOrOpts);
      return rows[0] ?? null;
    }
    return this.all({ ...sqlOrOpts, limit: 1 })[0] ?? null;
  }

  run(data: Record<string, unknown>): void {
    const dc = ['node_id', 'country_code', 'sport_id', 'market_id'];
    const dv: unknown[] = [
      this.scope.nodeId,
      this.scope.country,
      this.scope.sport,
      this.scope.market,
    ];
    if (this.scope.state) {
      dc.push('state_code');
      dv.push(this.scope.state);
    }
    const keys = Object.keys(data);
    this.db.run(
      `INSERT INTO ${this.table} (${[...dc, ...keys].join(',')}) VALUES (${[...dc, ...keys].map(() => '?').join(',')})`,
      ...dv,
      ...keys.map(k => data[k])
    );
  }
}
