// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * ZIP-cluster stats over scoped play_zip_enrichment + play_analysis.
 *
 * Expects discrete columns on enrichment:
 *   zip_prefix (ZIP3) or zip_code — never packed into location.
 */
import type { Database } from 'bun:sqlite';
import { ScopedRepository, type Scope } from './repository.ts';

export type ZipClusterStat = {
  zip_prefix: string;
  total_plays: number;
  win_rate: number;
  avg_clv: number | null;
};

export class ZipEnrichmentRepo extends ScopedRepository {
  constructor(db: Database, scope: Scope) {
    super(db, scope, 'play_zip_enrichment');
  }

  /**
   * Aggregate win rate / volume by ZIP3 for the last `days` (informational;
   * day window requires plays.sent_at — when absent, all rows for scope).
   */
  getClusterStats(days = 90): ZipClusterStat[] {
    void days; // reserved when play timestamps join in
    const hasZipPrefix = this.columnExists('play_zip_enrichment', 'zip_prefix');
    const zipCol = hasZipPrefix ? 'z.zip_prefix' : 'substr(z.zip_code, 1, 3)';
    const zipAlias = hasZipPrefix ? 'z.zip_prefix' : 'substr(z.zip_code, 1, 3)';

    // Multi-table joins need qualified columns — inject via z.* scope clauses.
    const scopeWhere = ['z.node_id = ?', 'z.country_code = ?', 'z.sport_id = ?', 'z.market_id = ?'];
    const params: unknown[] = [
      this.scope.nodeId,
      this.scope.country,
      this.scope.sport,
      this.scope.market,
    ];
    if (this.scope.state) {
      scopeWhere.push('z.state_code = ?');
      params.push(this.scope.state);
    }
    const whereSql = scopeWhere.join(' AND ');

    const hasAnalysis = this.tableExists('play_analysis');
    if (!hasAnalysis) {
      const sql = `
        SELECT ${zipCol} AS zip_prefix,
               COUNT(*) AS total_plays,
               0.0 AS win_rate,
               NULL AS avg_clv
        FROM play_zip_enrichment z
        WHERE ${whereSql}
        GROUP BY ${zipAlias}
        ORDER BY total_plays DESC
      `;
      return this.db.query(sql).all(...params) as ZipClusterStat[];
    }

    const sql = `
      SELECT ${zipCol} AS zip_prefix,
             COUNT(*) AS total_plays,
             AVG(CASE WHEN pa.won = 1 THEN 1.0 ELSE 0.0 END) AS win_rate,
             AVG(
               CASE
                 WHEN json_valid(ms.snapshot_data)
                 THEN CAST(json_extract(ms.snapshot_data, '$.line') AS REAL) - pa.line_at_bet
                 ELSE NULL
               END
             ) AS avg_clv
      FROM play_zip_enrichment z
      INNER JOIN play_analysis pa
        ON pa.play_id = z.play_id
       AND pa.node_id = z.node_id
      LEFT JOIN market_snapshots ms
        ON ms.play_id = z.play_id
       AND ms.node_id = z.node_id
       AND ms.snapshot_type = 'line'
       AND ms.relative_time_sec = 300
       AND ms.bookmaker = 'pinnacle'
      WHERE ${whereSql}
      GROUP BY ${zipAlias}
      ORDER BY total_plays DESC
    `;
    return this.db.query(sql).all(...params) as ZipClusterStat[];
  }

  private tableExists(name: string): boolean {
    const row = this.db
      .query(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(name) as { ok: number } | null;
    return row != null;
  }

  private columnExists(table: string, col: string): boolean {
    if (!this.tableExists(table)) return false;
    const cols = this.db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return cols.some(c => c.name === col);
  }
}
