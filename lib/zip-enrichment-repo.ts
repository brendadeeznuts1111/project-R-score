// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
/**
 * ZIP-cluster stats over scoped play_zip_enrichment + play_analysis.
 *
 * Expects discrete columns on enrichment:
 *   zip_prefix (ZIP3) or zip_code — never packed into location.
 *
 * Day window (default 90): prefers plays.sent_at when joinable; else
 * play_zip_enrichment.enriched_at; when neither available, returns all rows.
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
   * Aggregate win rate / volume by ZIP3 for the last `days`.
   * Pass `days <= 0` or omit finite bound to include all rows for scope.
   */
  getClusterStats(days = 90): ZipClusterStat[] {
    const hasZipPrefix = this.columnExists('play_zip_enrichment', 'zip_prefix');
    const zipCol = hasZipPrefix ? 'z.zip_prefix' : 'substr(z.zip_code, 1, 3)';
    const zipAlias = hasZipPrefix ? 'z.zip_prefix' : 'substr(z.zip_code, 1, 3)';

    // Multi-table joins need qualified columns — inject via z.* scope clauses.
    // Real regulation schema may only have node_id + state (no country/sport/market).
    const scopeWhere: string[] = [];
    const params: unknown[] = [];
    if (this.columnExists('play_zip_enrichment', 'node_id')) {
      scopeWhere.push('z.node_id = ?');
      params.push(this.scope.nodeId);
    }
    if (this.columnExists('play_zip_enrichment', 'country_code')) {
      scopeWhere.push('z.country_code = ?');
      params.push(this.scope.country);
    }
    if (this.columnExists('play_zip_enrichment', 'sport_id')) {
      scopeWhere.push('z.sport_id = ?');
      params.push(this.scope.sport);
    }
    if (this.columnExists('play_zip_enrichment', 'market_id')) {
      scopeWhere.push('z.market_id = ?');
      params.push(this.scope.market);
    }
    if (this.scope.state && this.columnExists('play_zip_enrichment', 'state_code')) {
      scopeWhere.push('z.state_code = ?');
      params.push(this.scope.state);
    }
    if (scopeWhere.length === 0) {
      scopeWhere.push('1 = 1');
    }

    const day = this.dayWindowClause(days);
    let fromExtra = '';
    if (day.mode === 'plays') {
      fromExtra = ' INNER JOIN plays pl ON pl.id = z.play_id';
      scopeWhere.push(day.sql);
      params.push(day.cutoff);
    } else if (day.mode === 'enriched') {
      scopeWhere.push(day.sql);
      params.push(day.cutoff);
    }

    const whereSql = scopeWhere.join(' AND ');
    const hasAnalysis = this.tableExists('play_analysis');

    if (!hasAnalysis) {
      const sql = `
        SELECT ${zipCol} AS zip_prefix,
               COUNT(*) AS total_plays,
               0.0 AS win_rate,
               NULL AS avg_clv
        FROM play_zip_enrichment z${fromExtra}
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
      FROM play_zip_enrichment z${fromExtra}
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

  /**
   * Prefer plays.sent_at; fall back to enrichment.enriched_at; else no window.
   */
  private dayWindowClause(
    days: number
  ):
    | { mode: 'none' }
    | { mode: 'plays'; sql: string; cutoff: string }
    | { mode: 'enriched'; sql: string; cutoff: string } {
    if (!Number.isFinite(days) || days <= 0) return { mode: 'none' };
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    if (this.tableExists('plays') && this.columnExists('plays', 'sent_at')) {
      return { mode: 'plays', sql: 'pl.sent_at >= ?', cutoff };
    }
    if (this.columnExists('play_zip_enrichment', 'enriched_at')) {
      return { mode: 'enriched', sql: 'z.enriched_at >= ?', cutoff };
    }
    return { mode: 'none' };
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
