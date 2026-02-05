import { Database } from 'bun:sqlite';

export interface EditEvent {
  filePath: string;
  user?: string;
  action: 'edit' | 'optimize' | 'validate' | 'restore';
  secretsTouched: string[];
  scoreBefore: number;
  scoreAfter: number;
  diff?: DiffChange[];
}

export interface DiffChange {
  path: string[];
  oldValue?: string;
  newValue?: string;
  type: 'added' | 'removed' | 'modified';
}

export interface AuditRecord {
  id: number;
  file_path: string;
  user: string | null;
  action: string;
  secrets_touched: string;
  security_score_before: number;
  security_score_after: number;
  timestamp: number;
}

export interface AuditReport {
  records: AuditRecord[];
  summary: AuditSummary;
}

export interface AuditSummary {
  totalEdits: number;
  averageScoreChange: number;
  mostModifiedFile: string;
  dangerousActions: number;
}

export class TomlAuditLogger {
  private db: Database;
  private dbPath: string;

  constructor(dbPath: string = 'toml-audit.db') {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS edits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        user TEXT,
        action TEXT NOT NULL,
        secrets_touched TEXT NOT NULL,
        security_score_before REAL NOT NULL,
        security_score_after REAL NOT NULL,
        diff TEXT,
        timestamp INTEGER NOT NULL
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_path ON edits(file_path);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_timestamp ON edits(timestamp);
    `);
  }

  logEdit(event: EditEvent): void {
    this.db.run(`
      INSERT INTO edits (
        file_path, user, action, secrets_touched,
        security_score_before, security_score_after, diff, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      event.filePath,
      event.user || null,
      event.action,
      JSON.stringify(event.secretsTouched),
      event.scoreBefore,
      event.scoreAfter,
      event.diff ? JSON.stringify(event.diff) : null,
      Date.now()
    );
  }

  logEditAsync(event: EditEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.logEdit(event);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  getAuditReport(filePath: string, limit: number = 100): AuditReport {
    const records = this.db.query(`
      SELECT * FROM edits
      WHERE file_path = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(filePath, limit) as AuditRecord[];

    const summary = this.computeSummary(records, filePath);

    return { records, summary };
  }

  getAuditReportAsync(filePath: string, limit: number = 100): Promise<AuditReport> {
    return Promise.resolve(this.getAuditReport(filePath, limit));
  }

  getRecentActivity(limit: number = 50): AuditRecord[] {
    return this.db.query(`
      SELECT * FROM edits
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as AuditRecord[];
  }

  getActivityByUser(user: string, limit: number = 50): AuditRecord[] {
    return this.db.query(`
      SELECT * FROM edits
      WHERE user = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(user, limit) as AuditRecord[];
  }

  getSecurityScoreHistory(filePath: string): Array<{ timestamp: number; score: number }> {
    const records = this.db.query(`
      SELECT timestamp, security_score_after as score
      FROM edits
      WHERE file_path = ?
      ORDER BY timestamp ASC
    `).all(filePath) as Array<{ timestamp: number; score: number }>;

    return records;
  }

  getSecretsHistory(filePath: string, secretName: string): AuditRecord[] {
    return this.db.query(`
      SELECT * FROM edits
      WHERE file_path = ?
        AND secrets_touched LIKE ?
      ORDER BY timestamp DESC
    `).all(filePath, `%${secretName}%`) as AuditRecord[];
  }

  deleteOldRecords(olderThanDays: number = 90): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    const result = this.db.run(`
      DELETE FROM edits
      WHERE timestamp < ?
    `, cutoff);

    return (result as { changes: number }).changes || 0;
  }

  getStatistics(): AuditStatistics {
    const totalEdits = (this.db.query('SELECT COUNT(*) as count FROM edits').get() as { count: number }).count;
    const avgScoreChange = (this.db.query(`
      SELECT AVG(security_score_after - security_score_before) as avg
      FROM edits
    `).get() as { avg: number }).avg || 0;

    const mostModified = this.db.query(`
      SELECT file_path, COUNT(*) as count
      FROM edits
      GROUP BY file_path
      ORDER BY count DESC
      LIMIT 1
    `).get() as { file_path: string; count: number } || { file_path: 'N/A', count: 0 };

    const dangerousActions = (this.db.query(`
      SELECT COUNT(*) as count FROM edits
      WHERE security_score_after < security_score_before
    `).get() as { count: number }).count;

    return {
      totalEdits,
      averageScoreChange: Math.round(avgScoreChange * 100) / 100,
      mostModifiedFile: mostModified.file_path,
      dangerousActions
    };
  }

  private computeSummary(records: AuditRecord[], filePath: string): AuditSummary {
    let totalEdits = records.length;
    let scoreChanges: number[] = [];

    for (const record of records) {
      scoreChanges.push(record.security_score_after - record.security_score_before);
    }

    const avgScoreChange = scoreChanges.length > 0
      ? scoreChanges.reduce((a, b) => a + b, 0) / scoreChanges.length
      : 0;

    const fileEdits = records.reduce((acc, r) => {
      acc[r.file_path] = (acc[r.file_path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostModifiedFile = Object.entries(fileEdits)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || filePath;

    const dangerousActions = records.filter(r =>
      r.security_score_after < r.security_score_before
    ).length;

    return {
      totalEdits,
      averageScoreChange: Math.round(avgScoreChange * 100) / 100,
      mostModifiedFile,
      dangerousActions
    };
  }

  exportAuditTrail(filePath: string, format: 'json' | 'csv' = 'json'): string {
    const report = this.getAuditReport(filePath, 1000);

    if (format === 'csv') {
      const headers = ['id', 'file_path', 'user', 'action', 'secrets_touched', 'score_before', 'score_after', 'timestamp'];
      const rows = report.records.map(r => [
        r.id,
        r.file_path,
        r.user || '',
        r.action,
        r.secrets_touched,
        r.security_score_before,
        r.security_score_after,
        new Date(r.timestamp).toISOString()
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    return JSON.stringify(report, null, 2);
  }

  close(): void {
    this.db.close();
  }

  vacuum(): void {
    this.db.exec('VACUUM');
  }
}

interface AuditStatistics {
  totalEdits: number;
  averageScoreChange: number;
  mostModifiedFile: string;
  dangerousActions: number;
}
