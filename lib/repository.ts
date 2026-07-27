import { Database } from "bun:sqlite";
export interface Scope { nodeId: string; country: string; sport: string; market: string; state?: string | null; }
const DIMS = ["node_id", "country_code", "sport_id", "market_id", "state_code"];
export class ScopedRepository<T extends Record<string, unknown>> {
  constructor(protected db: Database, protected scope: Scope, protected table: string) {}
  protected where(): { sql: string; params: unknown[] } {
    const p: unknown[] = [this.scope.nodeId, this.scope.country, this.scope.sport, this.scope.market];
    if (this.scope.state) { p.push(this.scope.state); return { sql: "WHERE node_id=? AND country_code=? AND sport_id=? AND market_id=? AND state_code=? /*si*/", params: p }; }
    return { sql: "WHERE node_id=? AND country_code=? AND sport_id=? AND market_id=? /*si*/", params: p };
  }
  all(opts?: any): T[] { const w = this.where(); let s = `SELECT * FROM ${this.table} ${w.sql}`; if (opts?.where) s += ` AND (${opts.where})`; if (opts?.orderBy) s += ` ORDER BY ${opts.orderBy}`; if (opts?.limit) s += ` LIMIT ${opts.limit}`; return this.db.query(s).all(...w.params, ...(opts?.bindings ?? [])) as T[]; }
  get(opts?: any): T | null { return this.all({ ...opts, limit: 1 })[0] ?? null; }
  run(data: any): void {
    const dc = ["node_id", "country_code", "sport_id", "market_id"]; const dv: any[] = [this.scope.nodeId, this.scope.country, this.scope.sport, this.scope.market];
    if (this.scope.state) { dc.push("state_code"); dv.push(this.scope.state); }
    this.db.run(`INSERT INTO ${this.table} (${[...dc, ...Object.keys(data)].join(",")}) VALUES (${[...dc, ...Object.keys(data)].map(() => "?").join(",")})`, ...dv, ...Object.values(data));
  }
}
