import { Database } from 'bun:sqlite';

export interface EditEvent {
  filePath: string;
  user?: string;
  action: 'edit' | 'optimize' | 'validate';
  secretsTouched: string[];
  scoreBefore: number;
  scoreAfter: number;
  changes?: string[];
}

export interface AuditReport {
  id: number;
  file_path: string;
  user: string;
  action: string;
  secrets_touched: string;
  security_score_before: number;
  security_score_after: number;
  timestamp: number;
}

export interface AuditSummary {
  totalEdits: number;
  uniqueFiles: number;
  averageSecurityScore: number;
  mostActiveUser: string;
  recentActivity: AuditReport[];
}

export class TomlAuditLogger {
  private db: Database;
  
  constructor(dbPath: string = 'toml-audit.db') {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS edits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        user TEXT DEFAULT 'system',
        action TEXT NOT NULL CHECK (action IN ('edit', 'optimize', 'validate')),
        secrets_touched TEXT, -- JSON array of secret names
        security_score_before REAL,
        security_score_after REAL,
        changes TEXT, -- JSON array of changes
        timestamp INTEGER NOT NULL
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_edits_file_path ON edits(file_path);
      CREATE INDEX IF NOT EXISTS idx_edits_timestamp ON edits(timestamp);
      CREATE INDEX IF NOT EXISTS idx_edits_user ON edits(user);
    `);
  }

  logEdit(event: EditEvent): number {
    const result = this.db.run(`
      INSERT INTO edits (file_path, user, action, secrets_touched, 
                        security_score_before, security_score_after, changes, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, 
      event.filePath,
      event.user || 'system',
      event.action,
      JSON.stringify(event.secretsTouched),
      event.scoreBefore,
      event.scoreAfter,
      event.changes ? JSON.stringify(event.changes) : null,
      Date.now()
    );

    return result.lastInsertRowid as number;
  }

  getAuditReport(filePath: string, limit: number = 100): AuditReport[] {
    return this.db.query(`
      SELECT * FROM edits 
      WHERE file_path = ? 
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(filePath, limit) as AuditReport[];
  }

  getUserActivity(username: string, limit: number = 50): AuditReport[] {
    return this.db.query(`
      SELECT * FROM edits 
      WHERE user = ? 
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(username, limit) as AuditReport[];
  }

  getRecentActivity(limit: number = 20): AuditReport[] {
    return this.db.query(`
      SELECT * FROM edits 
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as AuditReport[];
  }

  getAuditSummary(timeframeMs: number = 7 * 24 * 60 * 60 * 1000): AuditSummary {
    const since = Date.now() - timeframeMs;
    
    const totalEdits = this.db.query(`
      SELECT COUNT(*) as count FROM edits WHERE timestamp > ?
    `).get(since) as { count: number };

    const uniqueFiles = this.db.query(`
      SELECT COUNT(DISTINCT file_path) as count FROM edits WHERE timestamp > ?
    `).get(since) as { count: number };

    const avgScore = this.db.query(`
      SELECT AVG(security_score_after) as avg FROM edits WHERE timestamp > ?
    `).get(since) as { avg: number };

    const mostActive = this.db.query(`
      SELECT user, COUNT(*) as count 
      FROM edits 
      WHERE timestamp > ?
      GROUP BY user 
      ORDER BY count DESC 
      LIMIT 1
    `).get(since) as { user: string; count: number } || { user: 'none', count: 0 };

    const recentActivity = this.getRecentActivity(10);

    return {
      totalEdits: totalEdits.count,
      uniqueFiles: uniqueFiles.count,
      averageSecurityScore: avgScore.avg || 0,
      mostActiveUser: mostActive.user,
      recentActivity
    };
  }

  exportAuditData(filePath: string, format: 'json' | 'csv' = 'json'): string {
    const data = this.getAuditReport(filePath, 1000);
    
    if (format === 'csv') {
      const headers = ['id', 'file_path', 'user', 'action', 'secrets_touched', 
                      'security_score_before', 'security_score_after', 'timestamp'];
      
      const rows = data.map(row => [
        row.id,
        row.file_path,
        row.user,
        row.action,
        row.secrets_touched,
        row.security_score_before,
        row.security_score_after,
        row.timestamp
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(data, null, 2);
  }

  cleanupOldRecords(olderThanMs: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    
    const result = this.db.run(`
      DELETE FROM edits WHERE timestamp < ?
    `, cutoff);
    
    return result.changes || 0;
  }

  getSecurityTrends(filePath: string, days: number = 30): SecurityTrend[] {
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);
    const dayMs = 24 * 60 * 60 * 1000;
    
    const trends: SecurityTrend[] = [];
    
    for (let i = 0; i < days; i++) {
      const dayStart = since + (i * dayMs);
      const dayEnd = dayStart + dayMs;
      
      const dayData = this.db.query(`
        SELECT 
          AVG(security_score_after) as avg_score,
          COUNT(*) as edit_count,
          MIN(security_score_after) as min_score,
          MAX(security_score_after) as max_score
        FROM edits 
        WHERE file_path = ? AND timestamp >= ? AND timestamp < ?
      `).get(filePath, dayStart, dayEnd) as {
        avg_score: number;
        edit_count: number;
        min_score: number;
        max_score: number;
      } || {
        avg_score: 0,
        edit_count: 0,
        min_score: 0,
        max_score: 0
      };
      
      trends.push({
        date: new Date(dayStart).toISOString().split('T')[0],
        averageScore: dayData.avg_score || 0,
        editCount: dayData.edit_count,
        minScore: dayData.min_score || 0,
        maxScore: dayData.max_score || 0
      });
    }
    
    return trends;
  }

  close(): void {
    this.db.close();
  }
}

export interface SecurityTrend {
  date: string;
  averageScore: number;
  editCount: number;
  minScore: number;
  maxScore: number;
}

export class AuditReportGenerator {
  constructor(private logger: TomlAuditLogger) {}

  generateMarkdownReport(filePath: string): string {
    const report = this.logger.getAuditReport(filePath);
    const trends = this.logger.getSecurityTrends(filePath);
    
    const lines: string[] = [];
    
    lines.push(`# TOML Audit Report: ${filePath}`);
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Edits**: ${report.length}`);
    lines.push(`- **First Edit**: ${report.length > 0 ? new Date(report[report.length - 1].timestamp).toLocaleString() : 'N/A'}`);
    lines.push(`- **Last Edit**: ${report.length > 0 ? new Date(report[0].timestamp).toLocaleString() : 'N/A'}`);
    lines.push('');
    
    // Recent Activity
    lines.push('## Recent Activity (Last 10)');
    lines.push('');
    lines.push('| Date | User | Action | Score Before | Score After | Secrets |');
    lines.push('|------|------|--------|--------------|-------------|---------|');
    
    for (const entry of report.slice(0, 10)) {
      const date = new Date(entry.timestamp).toLocaleString();
      const secrets = JSON.parse(entry.secrets_touched || '[]').length;
      
      lines.push(`| ${date} | ${entry.user} | ${entry.action} | ${entry.security_score_before} | ${entry.security_score_after} | ${secrets} |`);
    }
    
    // Security Trends
    if (trends.length > 0) {
      lines.push('');
      lines.push('## Security Trends (Last 30 Days)');
      lines.push('');
      lines.push('| Date | Avg Score | Edits | Min Score | Max Score |');
      lines.push('|------|-----------|-------|-----------|-----------|');
      
      for (const trend of trends.slice(-10)) { // Last 10 days
        lines.push(`| ${trend.date} | ${trend.averageScore.toFixed(1)} | ${trend.editCount} | ${trend.minScore} | ${trend.maxScore} |`);
      }
    }
    
    return lines.join('\n');
  }

  generateJSONReport(filePath: string): string {
    const report = this.logger.getAuditReport(filePath);
    const trends = this.logger.getSecurityTrends(filePath);
    const summary = this.logger.getAuditSummary();
    
    return JSON.stringify({
      filePath,
      generated: new Date().toISOString(),
      summary: {
        totalEdits: report.length,
        timeframe: '30 days'
      },
      audit: report,
      trends,
      global: summary
    }, null, 2);
  }
}
